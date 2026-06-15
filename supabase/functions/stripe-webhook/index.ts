import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

async function markWebhookEvent(supabase: any, eventId: string, status = "processed", errorMessage?: string) {
  const payload: Record<string, string> = {
    status,
    processed_at: new Date().toISOString(),
  };
  if (errorMessage) payload.error_message = errorMessage;

  const { error } = await supabase
    .from("stripe_webhook_events")
    .update(payload)
    .eq("event_id", eventId);

  if (error) {
    console.warn("⚠️ Could not mark Stripe webhook event:", eventId, error.message);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return new Response(req.method === "HEAD" ? null : JSON.stringify({ ok: true, function: "stripe-webhook" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ALWAYS read raw body first — never JSON.parse before signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  console.log("[stripe:webhook] received", {
    method: req.method,
    has_signature: !!signature,
    signature_preview: signature ? signature.slice(0, 32) + "..." : null,
    body_length: rawBody.length,
    has_secret: !!webhookSecret,
    has_stripe_key: !!stripeSecretKey,
  });

  let currentEventId = "";

  try {
    let event: any;

    // ── HARD REQUIREMENT: signature verification is mandatory ──
    // No fallback. If STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY is missing,
    // refuse the request — never trust an unsigned body.
    if (!webhookSecret || !stripeSecretKey) {
      console.error("❌ Stripe webhook misconfigured: missing STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY");
      return new Response(
        JSON.stringify({ error: "Webhook misconfigured: signing secret missing" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    if (!signature) {
      console.error("❌ Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    try {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
      console.log("🔐 Signature verified — event:", event.type, event.id);
    } catch (err: any) {
      console.error("❌ Stripe signature verification failed:", err?.message || err);
      return new Response(
        JSON.stringify({ error: "Invalid signature", message: err?.message || "verification failed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }


    currentEventId = event.id || "";
    console.log("📨 Processing Stripe event:", event.type, event.id);

    // ─────────────────────────────────────────────────────────────────────────
    // Idempotency: insert event_id into stripe_webhook_events. If it already
    // exists, return 200 immediately and skip processing.
    // ─────────────────────────────────────────────────────────────────────────
    try {
      const { error: dedupErr } = await supabase
        .from("stripe_webhook_events")
        .insert({
          event_id: event.id,
          event_type: event.type,
          status: "received",
          payload: event,
        });

      if (dedupErr) {
        // 23505 = unique_violation → already processed
        if ((dedupErr as any).code === "23505") {
          console.log(`⏭️ Duplicate Stripe event ${event.id} (${event.type}) — already processed, returning 200`);
          return new Response(JSON.stringify({ received: true, duplicate: true, event_id: event.id }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // Non-unique error: log but continue (don't block webhook)
        console.warn("⚠️ Could not record webhook event for dedup (continuing):", dedupErr.message);
      }
    } catch (dedupEx) {
      console.warn("⚠️ Dedup insert exception (continuing):", dedupEx);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // checkout.session.completed — log for observability. The
    // payment_intent.succeeded handler does the actual booking work.
    // ─────────────────────────────────────────────────────────────────────────
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      console.log("🛒 checkout.session.completed:", session.id, {
        payment_intent: session.payment_intent,
        customer: session.customer,
        amount_total: session.amount_total,
        metadata: session.metadata,
      });
      await markWebhookEvent(supabase, event.id);
      return new Response(JSON.stringify({ received: true, type: "checkout_session_completed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: record an orphaned/unreconcilable Stripe payment so admins can
    // recover it. Idempotent on stripe_payment_intent_id (UNIQUE).
    // ─────────────────────────────────────────────────────────────────────────
    async function recordUnreconciledPayment(args: {
      paymentIntent: any;
      reason: string;
      eventId?: string;
    }): Promise<void> {
      const pi = args.paymentIntent;
      try {
        // Fetch customer for email/name when not present in metadata
        let customerEmail: string | null = pi.receipt_email || pi.metadata?.clientEmail || null;
        let customerName: string | null = pi.metadata?.clientName || null;
        if (!customerEmail && pi.customer && stripeSecretKey) {
          try {
            const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });
            const cust: any = await stripe.customers.retrieve(pi.customer as string);
            if (cust && !cust.deleted) {
              customerEmail = cust.email || null;
              customerName = customerName || cust.name || null;
            }
          } catch (custErr) {
            console.warn("⚠️ Could not retrieve Stripe customer for unreconciled record:", custErr);
          }
        }

        const { error: insErr } = await supabase
          .from("unreconciled_payments")
          .upsert({
            stripe_payment_intent_id: pi.id,
            stripe_customer_id: pi.customer || null,
            stripe_payment_method_id:
              typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id || null,
            amount: (pi.amount_received ?? pi.amount ?? 0) / 100,
            currency: pi.currency || "cad",
            customer_email: customerEmail,
            customer_name: customerName,
            raw_metadata: pi.metadata || {},
            reason: args.reason,
            stripe_event_id: args.eventId || null,
            status: "open",
          }, { onConflict: "stripe_payment_intent_id" });
        if (insErr) {
          console.error("❌ Failed to record unreconciled payment:", insErr.message);
        } else {
          console.log("🚨 Recorded unreconciled payment:", pi.id, "reason:", args.reason);
        }

        // Also mirror into unserved_orders so admins see it in the Recovery Center
        // and get an in-app notification (handled by the DB trigger).
        try {
          const md = pi.metadata || {};
          const sevReason = "PAYMENT_WEBHOOK_REQUIRES_REVIEW";
          await supabase.from("unserved_orders").insert({
            reason: sevReason,
            severity: "critical",
            source_table: "stripe_payment_intents",
            source_event_id: args.eventId || null,
            payment_intent_id: pi.id,
            payment_status: "paid",
            booking_code: md.booking_code || null,
            booking_id: md.booking_id || null,
            client_name: customerName,
            client_email: customerEmail,
            client_phone: md.clientPhone || null,
            city: md.city || null,
            address: md.address || null,
            postal_code_raw: md.postalCode || md.postal_code || "UNKNOWN",
            postal_fsa: (md.postalCode || md.postal_code || "").substring(0, 3).toUpperCase() || null,
            service_type: md.serviceType || null,
            requested_start_time: md.serviceDate || null,
            radius_checked_km: 0,
            psw_count_found: 0,
            status: "PENDING",
            full_client_payload: md,
            notes: `Auto-created from Stripe webhook. Reason: ${args.reason}`,
          });
        } catch (uoErr) {
          console.warn("⚠️ Failed to mirror to unserved_orders:", uoErr);
        }
      } catch (e) {
        console.error("❌ recordUnreconciledPayment exception:", e);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: ensure a booking row exists for any PaymentIntent. If the row
    // already exists (looked up by stripe_payment_intent_id, booking_id, or
    // booking_code), updates its payment_status. Otherwise calls the recovery
    // RPC to create a placeholder so admins always see the attempt.
    // ─────────────────────────────────────────────────────────────────────────
    async function ensureBookingForPI(pi: any, newPaymentStatus: string, reason: string, opts?: { promoteToPaid?: boolean }) {
      const md = pi?.metadata || {};
      const bookingId = md.booking_id;
      const bookingCode = md.booking_code;
      const piId = pi?.id;
      try {
        // 1) Try locating an existing booking
        let existing: any = null;
        if (piId) {
          const { data } = await supabase.from("bookings").select("id, status, payment_status")
            .eq("stripe_payment_intent_id", piId).maybeSingle();
          if (data) existing = data;
        }
        if (!existing && bookingId) {
          const { data } = await supabase.from("bookings").select("id, status, payment_status")
            .eq("id", bookingId).maybeSingle();
          if (data) existing = data;
        }
        if (!existing && bookingCode) {
          const { data } = await supabase.from("bookings").select("id, status, payment_status")
            .eq("booking_code", bookingCode).maybeSingle();
          if (data) existing = data;
        }

        if (existing) {
          // Never overwrite a fully-paid/dispatched booking with a failure status.
          if (!opts?.promoteToPaid && existing.payment_status === "paid") {
            console.log(`⏭️ Skip status downgrade for already-paid booking ${existing.id}`);
            return existing.id;
          }
          const update: Record<string, any> = {
            payment_status: newPaymentStatus,
            stripe_payment_intent_id: piId || undefined,
            updated_at: new Date().toISOString(),
          };
          const guardStatuses = opts?.promoteToPaid
            ? ["awaiting_payment", "payment_failed", "payment_cancelled", "payment_expired"]
            : ["awaiting_payment"];
          const { error } = await supabase.from("bookings").update(update)
            .eq("id", existing.id).in("status", guardStatuses);
          if (error) console.warn(`⚠️ ensureBookingForPI update failed:`, error.message);
          else console.log(`📝 Booking ${existing.id} marked ${newPaymentStatus} (${reason})`);
          return existing.id;
        }

        // 2) No booking row — create a recovery placeholder so admins see it.
        const { data: recId, error: recErr } = await supabase.rpc("create_recovery_booking_from_pi", {
          p_payment_intent_id: piId,
          p_amount: ((pi.amount_received ?? pi.amount ?? 0) as number) / 100,
          p_client_email: pi.receipt_email || md.clientEmail || "",
          p_client_name: md.clientName || null,
          p_client_phone: md.clientPhone || null,
          p_service_type: md.serviceType || null,
          p_service_date: md.serviceDate || null,
          p_service_time: md.serviceTime || null,
          p_payment_status: newPaymentStatus,
          p_status: opts?.promoteToPaid ? "pending" : "awaiting_payment",
          p_source: `webhook:${reason}`,
        });
        if (recErr) {
          console.error("❌ Recovery RPC failed:", recErr.message);
          return null;
        }
        console.log(`🩺 Recovery booking ${recId} created for PI ${piId} (${reason})`);
        return recId;
      } catch (e) {
        console.warn("⚠️ ensureBookingForPI exception:", e);
        return null;
      }
    }

    // Backwards-compatible alias used elsewhere in this file
    async function markDraftBookingFailed(pi: any, newPaymentStatus: string, reason: string) {
      await ensureBookingForPI(pi, newPaymentStatus, reason);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Helper: persist a row in payment_failure_logs for admin visibility.
    // Idempotent on stripe_event_id (UNIQUE).
    // ─────────────────────────────────────────────────────────────────────────
    async function logPaymentFailure(args: {
      pi?: any;
      charge?: any;
      sourceEventType: string;
      eventId: string;
      errorMessage?: string | null;
      declineCode?: string | null;
      failureCode?: string | null;
    }): Promise<void> {
      try {
        const pi = args.pi || {};
        const ch = args.charge || {};
        const md = pi.metadata || ch.metadata || {};
        const amountRaw = (pi.amount ?? ch.amount ?? 0) as number;
        const lastErr = pi.last_payment_error || ch.outcome || null;
        const customerEmail = ch.billing_details?.email || pi.receipt_email || md.clientEmail || null;
        const customerName = ch.billing_details?.name || md.clientName || null;
        const customerPhone = ch.billing_details?.phone || md.clientPhone || null;
        const serviceType = md.serviceType || (Array.isArray(md.service_type) ? md.service_type.join(", ") : md.service_type) || null;

        const { error } = await supabase.from("payment_failure_logs").insert({
          booking_id: md.booking_id || null,
          booking_code: md.booking_code || null,
          client_name: customerName,
          client_email: customerEmail,
          client_phone: customerPhone,
          service_type: serviceType,
          amount: amountRaw / 100,
          currency: pi.currency || ch.currency || "cad",
          payment_intent_id: pi.id || ch.payment_intent || null,
          charge_id: ch.id || null,
          decline_code: args.declineCode || pi.last_payment_error?.decline_code || ch.outcome?.reason || null,
          failure_code: args.failureCode || pi.last_payment_error?.code || ch.failure_code || null,
          error_message: args.errorMessage || lastErr?.message || ch.failure_message || null,
          stripe_event_id: args.eventId,
          source_event_type: args.sourceEventType,
          raw_metadata: md,
        });
        if (error && (error as any).code !== "23505") {
          console.error("❌ payment_failure_logs insert failed:", error.message);
        } else if (!error) {
          console.log("📝 payment_failure_logs recorded:", args.eventId, args.sourceEventType);
        }
      } catch (e) {
        console.error("❌ logPaymentFailure exception:", e);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // payment_intent.payment_failed — keep visibility for failed/declined cards
    // ─────────────────────────────────────────────────────────────────────────
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      console.warn("💳 payment_intent.payment_failed:", pi.id, pi.last_payment_error?.message);
      await logPaymentFailure({
        pi,
        sourceEventType: event.type,
        eventId: event.id,
      });
      await markDraftBookingFailed(pi, "payment_failed", pi.last_payment_error?.message || "card_failed");
      await markWebhookEvent(supabase, event.id);
      return new Response(JSON.stringify({ received: true, type: "payment_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // charge.failed — final card-level failure (logs raw decline data)
    if (event.type === "charge.failed") {
      const charge = event.data.object;
      console.warn("💳 charge.failed:", charge.id, charge.failure_message);
      await logPaymentFailure({
        charge,
        sourceEventType: event.type,
        eventId: event.id,
        errorMessage: charge.failure_message,
        failureCode: charge.failure_code,
        declineCode: charge.outcome?.reason || null,
      });
      await markWebhookEvent(supabase, event.id);
      return new Response(JSON.stringify({ received: true, type: "charge_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // charge.refunded — log refund event for visibility; refund_logs is the
    // canonical refund record (written by refund issuance flow).
    if (event.type === "charge.refunded") {
      const charge = event.data.object;
      console.log("↩️ charge.refunded:", charge.id, {
        amount_refunded: charge.amount_refunded,
        payment_intent: charge.payment_intent,
        metadata: charge.metadata,
      });
      await markWebhookEvent(supabase, event.id);
      return new Response(JSON.stringify({ received: true, type: "charge_refunded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // charge.dispute.created — chargeback. Notify admin + record for visibility.
    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object;
      console.error("⚠️ charge.dispute.created:", dispute.id, {
        charge: dispute.charge,
        amount: dispute.amount,
        reason: dispute.reason,
        status: dispute.status,
      });
      try {
        await supabase.from("notification_queue").insert({
          template_key: "stripe-dispute-created",
          to_email: "admin@pswdirect.com",
          payload: {
            dispute_id: dispute.id,
            charge_id: dispute.charge,
            amount: dispute.amount / 100,
            reason: dispute.reason,
            status: dispute.status,
            evidence_due_by: dispute.evidence_details?.due_by,
          },
          status: "pending",
        });
      } catch (e) {
        console.warn("⚠️ Could not enqueue dispute notification:", e);
      }
      await markWebhookEvent(supabase, event.id);
      return new Response(JSON.stringify({ received: true, type: "charge_dispute_created" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (event.type === "payment_intent.canceled") {
      const pi = event.data.object;
      console.warn("🛑 payment_intent.canceled:", pi.id, pi.cancellation_reason);
      await markDraftBookingFailed(pi, "payment_cancelled", pi.cancellation_reason || "canceled");
      await markWebhookEvent(supabase, event.id);
      return new Response(JSON.stringify({ received: true, type: "payment_canceled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      console.warn("⌛ checkout.session.expired:", session.id);
      // Synthesize a PI-shape so we can reuse the helper
      await markDraftBookingFailed({ metadata: session.metadata || {} }, "payment_expired", "checkout_expired");
      await markWebhookEvent(supabase, event.id);
      return new Response(JSON.stringify({ received: true, type: "checkout_expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.type === "charge.succeeded") {
      const charge = event.data.object;
      console.log("💵 charge.succeeded:", charge.id, {
        payment_intent: charge.payment_intent,
        customer: charge.customer,
        amount: charge.amount,
        metadata: charge.metadata,
      });
      await markWebhookEvent(supabase, event.id);
      return new Response(JSON.stringify({ received: true, type: "charge_succeeded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const md = paymentIntent.metadata || {};
      const bookingId = md.booking_id;
      const bookingCode = md.booking_code;
      const piId = paymentIntent.id;
      const paymentMethodId =
        typeof paymentIntent.payment_method === "string"
          ? paymentIntent.payment_method
          : paymentIntent.payment_method?.id || null;
      const stripeCustomerId =
        typeof paymentIntent.customer === "string" ? paymentIntent.customer : paymentIntent.customer?.id || null;
      const latestChargeId =
        typeof paymentIntent.latest_charge === "string"
          ? paymentIntent.latest_charge
          : paymentIntent.latest_charge?.id || null;

      console.log(`[stripe:payment_intent_succeeded] ${piId} booking_id=${bookingId} booking_code=${bookingCode} pm=${paymentMethodId} cus=${stripeCustomerId}`);

      // ── Step A: locate booking (id preferred, code fallback, PI fallback) ──
      let resolvedBookingId: string | null = bookingId || null;
      if (!resolvedBookingId && bookingCode) {
        const { data: byCode } = await supabase
          .from("bookings").select("id").eq("booking_code", bookingCode).maybeSingle();
        if (byCode) resolvedBookingId = byCode.id;
      }
      if (!resolvedBookingId && piId) {
        const { data: byPi } = await supabase
          .from("bookings").select("id").eq("stripe_payment_intent_id", piId).maybeSingle();
        if (byPi) resolvedBookingId = byPi.id;
      }

      if (!resolvedBookingId) {
        console.error(`[stripe:recovery] booking not found for PI ${piId} — booking_id=${bookingId} code=${bookingCode}`);
        await recordUnreconciledPayment({
          paymentIntent,
          reason: `booking_not_found: id=${bookingId || "(none)"} code=${bookingCode || "(none)"}`,
          eventId: event.id,
        });
        const recId = await ensureBookingForPI(paymentIntent, "paid", "booking_not_found", { promoteToPaid: true });
        await markWebhookEvent(supabase, event.id);
        return new Response(JSON.stringify({
          received: true, recorded: "unreconciled", recovery_booking_id: recId,
          reason: "booking_not_found", payment_intent_id: piId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // ── Step B: atomic finalization RPC (booking + invoice + event mark) ──
      let finalizeResult: any = null;
      try {
        const { data, error } = await supabase.rpc("admin_finalize_paid_booking_from_stripe", {
          p_booking_id: resolvedBookingId,
          p_payment_intent_id: piId,
          p_stripe_charge_id: latestChargeId,
          p_stripe_customer_id: stripeCustomerId,
          p_stripe_payment_method_id: paymentMethodId,
          p_amount_paid: ((paymentIntent.amount_received ?? paymentIntent.amount ?? 0) as number) / 100,
          p_currency: paymentIntent.currency || "cad",
          p_stripe_event_id: event.id,
        });
        if (error) throw error;
        finalizeResult = data;
        console.log(`[stripe:payment_intent_succeeded] RPC ok booking=${finalizeResult?.booking_code} invoice=${finalizeResult?.invoice_number} already_finalized=${finalizeResult?.already_finalized}`);
      } catch (rpcErr: any) {
        console.error(`[stripe:error] admin_finalize_paid_booking_from_stripe FAILED for PI ${piId}:`, rpcErr?.message || rpcErr);
        await recordUnreconciledPayment({
          paymentIntent,
          reason: `finalize_rpc_failed: ${rpcErr?.message || "unknown"}`,
          eventId: event.id,
        });
        await markWebhookEvent(supabase, event.id, "failed", rpcErr?.message || "finalize_rpc_failed");
        return new Response(JSON.stringify({
          received: true, error: "finalize_failed", message: rpcErr?.message || "rpc_failed",
          recorded: "unreconciled", payment_intent_id: piId,
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Duplicate retry of already-finalized payment → skip side effects.
      if (finalizeResult?.already_finalized) {
        console.log(`[stripe:payment_intent_succeeded] duplicate retry — skipping dispatch/email for ${finalizeResult.booking_code}`);
        return new Response(JSON.stringify({ received: true, duplicate: true, finalized: finalizeResult }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Step C: fetch finalized booking for side effects ──
      const { data: booking } = await supabase
        .from("bookings")
        .select("id, booking_code, client_email, client_name, client_phone, client_address, client_postal_code, total, subtotal, surge_amount, service_type, scheduled_date, start_time, end_time, hours, patient_address, patient_postal_code, preferred_gender, preferred_languages, is_asap, is_transport_booking, status")
        .eq("id", resolvedBookingId)
        .maybeSingle();

      if (!booking) {
        console.error(`[stripe:error] booking vanished after finalize — id=${resolvedBookingId}`);
        return new Response(JSON.stringify({ received: true, error: "booking_missing_after_finalize" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // ── Step D: PSW dispatch (idempotent on dispatch_logs) ──
      try {
        const { data: existingDispatch } = await supabase
          .from("dispatch_logs").select("id").eq("booking_code", booking.booking_code).limit(1);
        const alreadyDispatched = existingDispatch && existingDispatch.length > 0;

        if (alreadyDispatched) {
          console.log(`[stripe:dispatch] skip duplicate for ${booking.booking_code}`);
        } else {
          const notifyUrl = `${supabaseUrl}/functions/v1/notify-psws`;
          const notifyRes = await fetch(notifyUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              booking_id: booking.id,
              booking_code: booking.booking_code,
              city: booking.client_address?.split(",").slice(-2, -1)[0]?.trim() || "",
              service_type: booking.service_type || [],
              scheduled_date: booking.scheduled_date,
              start_time: booking.start_time,
              end_time: booking.end_time,
              hours: booking.hours,
              is_asap: booking.is_asap || false,
              patient_postal_code: booking.patient_postal_code || null,
              patient_address: booking.patient_address || null,
              preferred_gender: booking.preferred_gender || null,
              preferred_languages: booking.preferred_languages || null,
              is_transport_booking: booking.is_transport_booking || false,
            }),
          });
          const notifyText = await notifyRes.text();
          console.log(`[stripe:dispatch] notify-psws ${notifyRes.status} ${notifyText}`);
        }
      } catch (e) {
        console.warn(`[stripe:dispatch] notify-psws failed:`, e);
      }

      // ── Step E: order confirmation + invoice emails (idempotent via email_history) ──
      try {
        const serviceLabel = (booking.service_type || []).join(", ") || "Home Care";
        const cityOrPostal = (booking.patient_address || booking.client_address || "").split(",").slice(-2, -1)[0]?.trim()
          || booking.patient_postal_code || "Ontario";
        const firstName = booking.client_name?.split(" ")[0] || "there";

        const { data: existingConfirmation } = await supabase
          .from("email_history").select("id")
          .eq("template_key", "order-confirmation")
          .eq("to_email", booking.client_email)
          .ilike("subject", `%${booking.booking_code}%`)
          .maybeSingle();

        if (!existingConfirmation) {
          const confirmHtml = `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a2e;background:#f9fafb;padding:24px;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden"><div style="background:#1a1a2e;padding:32px 24px;text-align:center;color:#fff"><h1 style="font-size:22px;margin:0">PSW Direct</h1><p style="color:#94a3b8;font-size:13px;margin:4px 0 0">Your Order is Confirmed</p></div><div style="padding:32px 24px"><h2 style="font-size:18px">Hello ${firstName},</h2><p style="font-size:14px;color:#4b5563;line-height:1.7">Your order has been successfully received and confirmed.</p><p style="font-size:14px;color:#4b5563;line-height:1.7">We are currently assigning a Personal Support Worker (PSW) to your request.</p><div style="background:#f1f5f9;border-radius:8px;padding:20px;margin:20px 0;font-size:14px"><div><strong>Order:</strong> ${booking.booking_code}</div><div><strong>Service:</strong> ${serviceLabel}</div><div><strong>Date:</strong> ${booking.scheduled_date}</div><div><strong>Time:</strong> ${booking.start_time} – ${booking.end_time}</div><div><strong>Duration:</strong> ${booking.hours}h</div><div><strong>Location:</strong> ${cityOrPostal}</div></div><p style="font-size:14px;color:#4b5563">Questions? Call <strong>(249) 288-4787</strong>.</p></div></div></body></html>`;
          const emailUrl = `${supabaseUrl}/functions/v1/send-email`;
          const confirmRes = await fetch(emailUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
            body: JSON.stringify({
              to: booking.client_email,
              subject: `Your PSW Direct Order is Confirmed — ${booking.booking_code}`,
              body: `Hello ${firstName}, your order ${booking.booking_code} has been confirmed.`,
              htmlBody: confirmHtml,
              template_key: "order-confirmation",
            }),
          });
          if (confirmRes.ok) {
            await supabase.from("email_history").insert({
              template_key: "order-confirmation",
              to_email: booking.client_email,
              subject: `Your PSW Direct Order is Confirmed — ${booking.booking_code}`,
              html: confirmHtml,
              status: "sent",
            });
            console.log(`[stripe:invoice_create] confirmation email sent for ${booking.booking_code}`);
          } else {
            console.warn(`[stripe:invoice_create] confirmation email failed:`, await confirmRes.text());
          }
        }

        const { data: invoiceRow } = await supabase
          .from("invoices")
          .select("invoice_number, html_snapshot, total")
          .eq("booking_id", booking.id).eq("invoice_type", "client_invoice").maybeSingle();

        if (invoiceRow) {
          const invoiceNumber = invoiceRow.invoice_number;
          const { data: existingEmail } = await supabase
            .from("email_history").select("id")
            .eq("template_key", "psa-client-invoice")
            .eq("to_email", booking.client_email)
            .ilike("subject", `%${booking.booking_code}%`)
            .maybeSingle();

          if (!existingEmail) {
            const invoiceHtml = invoiceRow.html_snapshot
              || `<div style="font-family:sans-serif;padding:24px"><h2>Invoice ${invoiceNumber}</h2><p>Booking ${booking.booking_code}</p><p>Total: $${Number(invoiceRow.total).toFixed(2)} CAD</p><p>Status: Paid</p></div>`;
            const emailUrl = `${supabaseUrl}/functions/v1/send-email`;
            const emailRes = await fetch(emailUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({
                to: booking.client_email,
                subject: `Invoice ${invoiceNumber} — PSW Direct`,
                body: invoiceHtml,
                htmlBody: invoiceHtml,
                template_key: "psa-client-invoice",
              }),
            });
            if (emailRes.ok) {
              await supabase.from("email_history").insert({
                template_key: "psa-client-invoice",
                to_email: booking.client_email,
                subject: `Invoice ${invoiceNumber} — PSW Direct`,
                html: invoiceHtml,
                status: "sent",
              });
              await supabase.from("invoices").update({ status: "sent" })
                .eq("booking_id", booking.id).eq("invoice_type", "client_invoice");
              console.log(`[stripe:invoice_create] invoice email sent ${invoiceNumber}`);
            } else {
              await supabase.from("invoices").update({ status: "email_failed" })
                .eq("booking_id", booking.id).eq("invoice_type", "client_invoice");
              console.warn(`[stripe:invoice_create] invoice email failed:`, await emailRes.text());
            }
          }
        }
      } catch (sideErr) {
        console.warn(`[stripe:invoice_create] side-effect error (non-fatal):`, sideErr);
      }

      await markWebhookEvent(supabase, event.id);
      return new Response(JSON.stringify({ received: true, finalized: finalizeResult }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await markWebhookEvent(supabase, event.id);

    return new Response(JSON.stringify({ received: true, event_id: event.id, type: event.type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    // CRITICAL: Always return 200 to Stripe so it does not retry indefinitely.
    // Signature failures are returned earlier as 400. Any error reaching here
    // is a downstream/processing error — log it, record it, and ack the event.
    const msg = error instanceof Error ? error.message : String(error);
    console.error("❌ Stripe webhook processing error (returning 200 to prevent retries):", msg, error);
    try {
      await supabase
        .from("stripe_webhook_events")
        .update({ status: "error", error_message: msg, processed_at: new Date().toISOString() })
        .eq("event_id", currentEventId);
    } catch {
      // ignore
    }
    return new Response(JSON.stringify({ received: true, processing_error: msg }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
