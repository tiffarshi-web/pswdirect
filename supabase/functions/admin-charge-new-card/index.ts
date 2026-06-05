// Admin-only: charge a booking using a NEW card. Client collects card via
// Stripe Elements and submits a payment_method id. This function:
//   1. Ensures a Stripe customer exists for the booking (creates one if needed)
//   2. Attaches the payment method to the customer
//   3. Creates + confirms a PaymentIntent on-session (admin-present)
//   4. Persists customer_id, payment_method_id, payment_intent_id to booking
// Idempotent per booking_id.

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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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
    const paymentMethodId = body.paymentMethodId as string;
    if (!bookingId || !paymentMethodId) {
      return json({ error: "bookingId and paymentMethodId required" }, 400);
    }

    const { data: booking, error: bErr } = await admin
      .from("bookings")
      .select("id, booking_code, total, client_email, client_name, client_first_name, client_last_name, client_phone, stripe_customer_id, stripe_payment_method_id, stripe_payment_intent_id, payment_status, scheduled_date")
      .eq("id", bookingId)
      .single();
    if (bErr || !booking) return json({ error: "Booking not found" }, 404);

    if (booking.payment_status === "paid") {
      return json({
        error: "already_paid",
        message: "Booking is already marked paid.",
        payment_intent_id: booking.stripe_payment_intent_id,
      }, 409);
    }

    const total = Number(booking.total) || 0;
    const amountCents = Math.round(total * 100);
    if (amountCents < 50) return json({ error: "Amount below Stripe minimum" }, 400);

    const stripe = new Stripe(stripeSecret, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 1. Ensure customer
    let customerId = booking.stripe_customer_id as string | null;
    if (!customerId) {
      const displayName = booking.client_name
        || [booking.client_first_name, booking.client_last_name].filter(Boolean).join(" ")
        || booking.client_email
        || undefined;
      const customer = await stripe.customers.create({
        email: booking.client_email || undefined,
        name: displayName,
        phone: booking.client_phone || undefined,
        metadata: {
          booking_id: booking.id,
          booking_code: booking.booking_code,
          created_by_admin: callerEmail || callerId,
        },
      });
      customerId = customer.id;
    }

    // 2. Attach payment method (skip silently if already attached)
    try {
      await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
    } catch (err: any) {
      if (err?.code !== "resource_already_exists" && !String(err?.message || "").includes("already been attached")) {
        console.error("Attach failed:", err?.message);
        return json({ error: "attach_failed", message: err?.message || "Failed to attach card" }, 400);
      }
    }

    // 2b. Cancel any prior unconfirmed PI on this booking so we can create a fresh one
    if (booking.stripe_payment_intent_id) {
      try {
        const prior = await stripe.paymentIntents.retrieve(booking.stripe_payment_intent_id);
        if (prior.status !== "succeeded" && prior.status !== "canceled") {
          await stripe.paymentIntents.cancel(prior.id).catch(() => {});
        }
      } catch (_e) { /* ignore */ }
    }

    // 3. Create + confirm PaymentIntent
    let intent: Stripe.PaymentIntent;
    try {
      intent = await stripe.paymentIntents.create({
        amount: amountCents,
        currency: "cad",
        customer: customerId,
        payment_method: paymentMethodId,
        confirm: true,
        off_session: false,
        automatic_payment_methods: { enabled: true, allow_redirects: "never" },
        description: `PSW Direct - ${booking.booking_code} (${booking.scheduled_date})`,
        metadata: {
          booking_id: booking.id,
          booking_code: booking.booking_code,
          type: "admin_create_and_charge",
          charged_by: callerEmail || callerId,
        },
      }, { idempotencyKey: `admin_new_card_${booking.id}_${Date.now()}` });
    } catch (err: any) {
      console.error("Charge failed:", err?.message);
      return json({
        error: "charge_failed",
        message: err?.message || "Stripe charge failed",
        code: err?.code || null,
        decline_code: err?.decline_code || null,
        payment_intent_id: err?.payment_intent?.id || null,
      }, 402);
    }

    // 4. Persist
    await admin.from("bookings").update({
      stripe_customer_id: customerId,
      stripe_payment_method_id: paymentMethodId,
      stripe_payment_intent_id: intent.id,
      payment_status: intent.status === "succeeded" ? "paid" : booking.payment_status,
      updated_at: new Date().toISOString(),
    }).eq("id", booking.id);

    return json({
      success: true,
      booking_id: booking.id,
      booking_code: booking.booking_code,
      stripe_customer_id: customerId,
      payment_intent_id: intent.id,
      payment_status: intent.status,
      amount: total,
    });
  } catch (err: any) {
    console.error("admin-charge-new-card error", err);
    return json({ error: err?.message || "Server error" }, 500);
  }
});
