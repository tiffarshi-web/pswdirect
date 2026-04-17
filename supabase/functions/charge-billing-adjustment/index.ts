// Charge Billing Adjustment — admin-only off-session Stripe charge for client billing variance.
// Does NOT modify the original PaymentIntent or invoice. Records a separate adjustment record
// against the booking via admin_record_adjustment_charge RPC.

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

    // Admin verification (mirror existing pattern)
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
      .select("id, booking_code, client_email, client_name, hours, hourly_rate, is_taxable, final_billable_hours, adjustment_amount, stripe_customer_id, stripe_payment_method_id, billing_adjustment_required")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) return json({ error: "Booking not found" }, 404);

    if (!booking.billing_adjustment_required) {
      return json({ error: "No billing adjustment required for this booking" }, 400);
    }

    const booked = Number(booking.hours) || 0;
    const billable = Number(booking.final_billable_hours ?? booked);
    const variance = +(billable - booked).toFixed(2);
    if (variance <= 0.05) {
      return json({ error: "No positive variance to charge" }, 400);
    }

    const rate = Number(booking.hourly_rate) || 0;
    const subtotal = +(variance * rate).toFixed(2);
    const tax = booking.is_taxable ? +(subtotal * 0.13).toFixed(2) : 0;
    const total = +(subtotal + tax).toFixed(2);
    const amountCents = Math.round(total * 100);

    if (amountCents < 50) return json({ error: "Adjustment amount below Stripe minimum" }, 400);

    if (!booking.stripe_customer_id || !booking.stripe_payment_method_id) {
      return json({
        error: "no_saved_card",
        message: "Client has no saved card on file. Use Send Adjustment Invoice instead.",
      }, 400);
    }

    // Create adjustment invoice record FIRST (so we can attach its id to PaymentIntent metadata)
    const invoiceNumber = `PSW-INV-ADJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
    const { data: adjInvoice, error: invErr } = await supabase
      .from("invoices")
      .insert({
        booking_id: booking.id,
        booking_code: booking.booking_code,
        invoice_number: invoiceNumber,
        client_email: booking.client_email,
        client_name: booking.client_name,
        invoice_type: "client_adjustment",
        subtotal,
        tax,
        surge_amount: 0,
        rush_amount: 0,
        total,
        currency: "CAD",
        status: "generated",
        document_status: "pending_payment",
        service_type: "Billing Adjustment",
        duration_hours: variance,
      })
      .select("id")
      .single();

    if (invErr) console.error("adjustment invoice insert failed", invErr);
    const adjInvoiceId = adjInvoice?.id || null;

    let paymentIntent: Stripe.PaymentIntent | null = null;
    let chargeError: string | null = null;
    let stripeStatus = "failed";

    try {
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "cad",
        customer: booking.stripe_customer_id,
        payment_method: booking.stripe_payment_method_id,
        off_session: true,
        confirm: true,
        description: `Billing adjustment for ${booking.booking_code} (+${variance}h)`,
        metadata: {
          booking_id: booking.id,
          booking_code: booking.booking_code,
          adjustment_invoice_id: adjInvoiceId || "",
          variance_hours: String(variance),
          type: "billing_adjustment",
        },
      });
      stripeStatus = paymentIntent.status;
    } catch (err: any) {
      chargeError = err?.message || "Stripe charge failed";
      stripeStatus = err?.code || "failed";
      console.error("Stripe billing-adjustment charge failed", err);
    }

    // Mark invoice paid/failed
    if (adjInvoiceId) {
      if (paymentIntent && paymentIntent.status === "succeeded") {
        await supabase.from("invoices").update({
          document_status: "paid",
          status: "paid",
          paid_at: new Date().toISOString(),
          payment_method: "stripe",
          stripe_payment_intent_id: paymentIntent.id,
        }).eq("id", adjInvoiceId);
      } else {
        await supabase.from("invoices").update({
          document_status: "email_failed",
          status: "email_failed",
        }).eq("id", adjInvoiceId);
      }
    }

    // Record back to booking via RPC (handles status, audit fields, billing_adjustment_required)
    const { error: rpcErr } = await supabase.rpc("admin_record_adjustment_charge", {
      p_booking_id: bookingId,
      p_payment_intent_id: paymentIntent?.id || "",
      p_stripe_status: stripeStatus,
      p_amount: total,
      p_failure_reason: chargeError,
      p_adjustment_invoice_id: adjInvoiceId,
    });
    if (rpcErr) console.error("admin_record_adjustment_charge failed", rpcErr);

    if (paymentIntent && paymentIntent.status === "succeeded") {
      return json({
        success: true,
        payment_intent_id: paymentIntent.id,
        amount: total,
        adjustment_invoice_id: adjInvoiceId,
      });
    }
    return json({
      success: false,
      error: chargeError || `Stripe status: ${stripeStatus}`,
      stripe_status: stripeStatus,
      adjustment_invoice_id: adjInvoiceId,
    }, 200);
  } catch (err: any) {
    console.error("charge-billing-adjustment error", err);
    return json({ error: err?.message || "Server error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
