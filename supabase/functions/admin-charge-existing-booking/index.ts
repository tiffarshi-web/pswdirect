// Admin-only: charge a booking's `total` off-session against the client's
// saved Stripe customer + payment method. Used when an admin clones/creates
// a booking out-of-band and needs to capture payment on the existing record
// (no new booking is created). Idempotent per booking_id.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const stripeSecret = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecret) return json({ error: "Stripe not configured" }, 500);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await authClient.auth.getClaims(token);
    if (claimsErr || !claims?.claims) return json({ error: "Unauthorized" }, 401);
    const callerId = claims.claims.sub as string;
    const callerEmail = (claims.claims as any).email || null;

    const admin = createClient(supabaseUrl, serviceKey);

    // Admin check (mirror charge-billing-adjustment)
    const { data: adminRole } = await admin
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!adminRole) {
      const { data: invite } = await admin
        .from("admin_invitations").select("status,accepted_at,expires_at")
        .eq("email", callerEmail).eq("status", "accepted").maybeSingle();
      if (!invite || !invite.accepted_at || new Date(invite.expires_at) < new Date()) {
        return json({ error: "Forbidden: admin only" }, 403);
      }
    }

    const body = await req.json().catch(() => ({}));
    const bookingId = body.bookingId as string;
    if (!bookingId) return json({ error: "bookingId required" }, 400);

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, booking_code, total, stripe_customer_id, stripe_payment_method_id, stripe_payment_intent_id, payment_status, scheduled_date")
      .eq("id", bookingId)
      .single();
    if (bErr || !booking) return json({ error: "Booking not found" }, 404);

    if (booking.stripe_payment_intent_id) {
      return json({
        error: "already_has_payment_intent",
        message: "Booking already has a PaymentIntent.",
        payment_intent_id: booking.stripe_payment_intent_id,
      }, 409);
    }
    if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
      return json({ error: "no_saved_card", message: "Booking has no saved card on file." }, 400);
    }

    const total = Number(booking.total) || 0;
    const amountCents = Math.round(total * 100);
    if (amountCents < 50) return json({ error: "Amount below Stripe minimum" }, 400);

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "cad",
        customer: booking.stripe_customer_id,
        payment_method: booking.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        description: `PSW Direct - ${booking.booking_code} (${booking.scheduled_date})`,
        metadata: {
          booking_id: booking.id,
          booking_code: booking.booking_code,
          type: "admin_existing_booking_charge",
          charged_by: callerEmail || callerId,
        },
      }, { idempotencyKey: `admin_charge_${booking.id}` });
    } catch (err: any) {
      console.error("Off-session charge failed", err?.message);
      return json({
        error: "charge_failed",
        message: err?.message || "Stripe charge failed",
        code: err?.code || null,
        payment_intent_id: err?.payment_intent?.id || null,
      }, 402);
    }

    await admin.from("bookings").update({
      stripe_payment_intent_id: intent.id,
      payment_status: intent.status === "succeeded" ? "paid" : booking.payment_status,
      updated_at: new Date().toISOString(),
    }).eq("id", booking.id);

    return json({
      success: true,
      booking_id: booking.id,
      booking_code: booking.booking_code,
      payment_intent_id: intent.id,
      payment_status: intent.status,
      amount: total,
    });
  } catch (err: any) {
    console.error("admin-charge-existing-booking error", err);
    return json({ error: err?.message || "Server error" }, 500);
  }
});
