// Refund Billing Adjustment — admin-only delta-only refund against the
// ORIGINAL booking PaymentIntent. Never refunds full amount, never touches
// other bookings, idempotent per (booking, refund amount).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claimsData.claims.sub as string;
    const callerEmail = (claimsData.claims as any).email || null;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Admin verification
    const { data: adminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!adminRole) {
      const { data: invite } = await supabase
        .from("admin_invitations").select("status,accepted_at,expires_at")
        .eq("email", callerEmail).eq("status", "accepted").maybeSingle();
      if (!invite || !invite.accepted_at || new Date(invite.expires_at) < new Date()) {
        return json({ error: "Forbidden: admin access required" }, 403);
      }
    }

    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) return json({ error: "Stripe secret key not configured" }, 500);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const body = await req.json();
    const bookingId = body.bookingId as string;
    if (!bookingId) return json({ error: "bookingId required" }, 400);

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_name, hours, hourly_rate, is_taxable, final_billable_hours, adjustment_amount, adjustment_status, stripe_payment_intent_id, billing_adjustment_required")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) return json({ error: "Booking not found" }, 404);

    const prevAdj = (booking.adjustment_status || "").toLowerCase();
    if (prevAdj === "refunded") {
      return json({
        error: "already_refunded",
        message: "This adjustment refund has already been issued.",
      }, 409);
    }

    if (!booking.stripe_payment_intent_id) {
      return json({
        error: "no_payment_intent",
        message: "Original payment has no Stripe PaymentIntent — cannot issue Stripe refund.",
      }, 400);
    }

    const booked = Number(booking.hours) || 0;
    const billable = Number(booking.final_billable_hours ?? booked);
    const variance = +(billable - booked).toFixed(2);
    if (variance >= -0.05) {
      return json({ error: "No negative variance to refund" }, 400);
    }

    const rate = Number(booking.hourly_rate) || 0;
    const subtotal = +(Math.abs(variance) * rate).toFixed(2);
    const tax = booking.is_taxable ? +(subtotal * 0.13).toFixed(2) : 0;
    const total = +(subtotal + tax).toFixed(2);
    const amountCents = Math.round(total * 100);

    if (amountCents < 50) return json({ error: "Refund amount below Stripe minimum" }, 400);

    let refund: Stripe.Refund | null = null;
    let failure: string | null = null;

    try {
      // Idempotency key — stable per booking + variance. Re-clicks reuse the same refund.
      const idemKey = `bk_adjref_${booking.id}_${Math.abs(variance).toFixed(2)}`;
      refund = await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        amount: amountCents,
        reason: "requested_by_customer",
        metadata: {
          booking_id: booking.id,
          booking_code: booking.booking_code,
          variance_hours: String(variance),
          type: "billing_adjustment_refund",
        },
      }, { idempotencyKey: idemKey });
    } catch (err: any) {
      failure = err?.message || "Stripe refund failed";
      console.error("Stripe billing-adjustment refund failed", err);
    }

    // Log to refund_logs
    await supabase.from("refund_logs").insert({
      booking_id: booking.id,
      booking_code: booking.booking_code,
      client_name: booking.client_name,
      client_email: booking.client_email,
      amount: total,
      reason: `Billing adjustment refund (${variance}h variance)`,
      status: refund ? "processed" : "failed",
      stripe_refund_id: refund?.id || null,
      processed_at: new Date().toISOString(),
      processed_by: callerEmail || "admin",
      is_dry_run: false,
    });

    // Record back to booking via RPC
    const { error: rpcErr } = await supabase.rpc("admin_record_adjustment_refund", {
      p_booking_id: bookingId,
      p_stripe_refund_id: refund?.id || "",
      p_amount: total,
      p_failure_reason: failure,
    });
    if (rpcErr) console.error("admin_record_adjustment_refund failed", rpcErr);

    if (refund) {
      return json({
        success: true,
        refund_id: refund.id,
        amount: total,
      });
    }
    return json({
      success: false,
      error: failure || "Stripe refund failed",
    }, 200);
  } catch (err: any) {
    console.error("refund-billing-adjustment error", err);
    return json({ error: err?.message || "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
