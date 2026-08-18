// Charge Billing Adjustment — admin-only off-session Stripe charge for client billing variance.
// Does NOT modify the original PaymentIntent or invoice. Records a separate adjustment record
// against the booking via admin_record_adjustment_charge RPC.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { computeOrderTotals, resolveServiceCode } from "../_shared/pricingTax.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";
import { assertNotQaBooking } from "../_shared/qaIsolation.ts";

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
    // QA ISOLATION: synthetic test bookings can never reach a money path.
    try {
      await assertNotQaBooking(supabase, bookingId, "charge-billing-adjustment");
    } catch (_qaErr) {
      return json({ error: "QA test bookings cannot be charged, refunded or invoiced." }, 403);
    }


    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_name, client_phone, client_address, client_postal_code, patient_address, patient_postal_code, hours, hourly_rate, is_taxable, service_type, final_billable_hours, adjustment_amount, stripe_customer_id, stripe_payment_method_id, billing_adjustment_required, adjustment_status, stripe_adjustment_status, stripe_adjustment_payment_intent_id")
      .eq("id", bookingId)
      .single();

    if (bErr || !booking) return json({ error: "Booking not found" }, 404);

    // Duplicate-charge protection: short-circuit if already succeeded.
    const prevStripe = (booking.stripe_adjustment_status || "").toLowerCase();
    const prevAdj = (booking.adjustment_status || "").toLowerCase();
    if (prevStripe === "succeeded" || prevAdj === "charged") {
      return json({
        error: "already_charged",
        message: "This adjustment has already been charged.",
        payment_intent_id: booking.stripe_adjustment_payment_intent_id || null,
      }, 409);
    }
    if (prevStripe === "processing") {
      return json({
        error: "charge_in_progress",
        message: "A charge is already in progress for this adjustment.",
      }, 409);
    }

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
    const rawSubtotal = +(variance * rate).toFixed(2);
    // Authoritative tax engine — service codes are normalized from the stored
    // service_type labels, so stale/incorrect is_taxable flags on legacy rows
    // can never under-charge HST on a supplemental charge.
    const adjustmentCode = resolveServiceCode(booking.service_type);
    const adj = computeOrderTotals({ subtotal: rawSubtotal, service: adjustmentCode });
    const subtotal = adj.subtotal;
    const tax = adj.hst;
    const total = adj.total;
    const amountCents = adj.totalCents;

    if (amountCents < 50) return json({ error: "Adjustment amount below Stripe minimum" }, 400);

    // ── Card resolution ──
    // Preferred: the card saved at booking time. Fallback: an admin can collect
    // a fresh card in the UI and pass its payment_method id here; we attach it
    // to the customer and persist it so future charges work without re-asking.
    let customerId = booking.stripe_customer_id as string | null;
    let paymentMethodId = booking.stripe_payment_method_id as string | null;
    const newPaymentMethodId = (body.paymentMethodId as string) || null;

    if (newPaymentMethodId) {
      try {
        if (!customerId) {
          const customer = await stripe.customers.create({
            email: booking.client_email || undefined,
            name: booking.client_name || undefined,
            phone: booking.client_phone || undefined,
            metadata: { booking_id: booking.id, booking_code: booking.booking_code },
          });
          customerId = customer.id;
        }
        try {
          await stripe.paymentMethods.attach(newPaymentMethodId, { customer: customerId });
        } catch (attachErr: any) {
          const msg = String(attachErr?.message || "");
          if (attachErr?.code !== "resource_already_exists" && !msg.includes("already been attached")) throw attachErr;
        }
        paymentMethodId = newPaymentMethodId;
        await supabase.from("bookings").update({
          stripe_customer_id: customerId,
          stripe_payment_method_id: paymentMethodId,
        }).eq("id", booking.id);
      } catch (cardErr: any) {
        return json({
          success: false,
          error: "card_attach_failed",
          message: cardErr?.message || "Could not save the card provided.",
        }, 200);
      }
    }

    if (!customerId || !paymentMethodId) {
      return json({
        success: false,
        error: "no_saved_card",
        message: "No card on file for this client. Collect a card now, or send an adjustment invoice instead.",
        fallback: true,
      }, 200);
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
        client_phone: booking.client_phone || null,
        client_address: booking.patient_address || booking.client_address || null,
        client_postal_code: booking.patient_postal_code || booking.client_postal_code || null,
        client_province: "ON",
      })
      .select("id")
      .single();

    if (invErr) console.error("adjustment invoice insert failed", invErr);
    const adjInvoiceId = adjInvoice?.id || null;

    let paymentIntent: Stripe.PaymentIntent | null = null;
    let chargeError: string | null = null;
    let stripeStatus = "failed";

    try {
      // Idempotency key — stable per booking + variance + invoice. Re-clicks reuse the same PI.
      const idemKey = `bk_adj_${booking.id}_${variance.toFixed(2)}_${adjInvoiceId || "noinv"}`;
      paymentIntent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "cad",
        customer: customerId,
        payment_method: paymentMethodId,
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
      }, { idempotencyKey: idemKey });
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
