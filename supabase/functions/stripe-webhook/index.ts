import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  // ALWAYS read raw body first — never JSON.parse before signature verification
  const rawBody = await req.text();
  const signature = req.headers.get("stripe-signature");

  console.log("📥 Stripe webhook received", {
    method: req.method,
    has_signature: !!signature,
    signature_preview: signature ? signature.slice(0, 32) + "..." : null,
    body_length: rawBody.length,
    has_secret: !!webhookSecret,
    has_stripe_key: !!stripeSecretKey,
  });

  try {
    let event: any;

    // Verify Stripe signature when webhook secret is configured
    if (webhookSecret && stripeSecretKey) {
      const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

      if (!signature) {
        console.error("❌ Missing stripe-signature header");
        return new Response(JSON.stringify({ error: "Missing stripe-signature header" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        // Use the async variant for Deno (uses SubtleCrypto under the hood)
        event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
        console.log("🔐 Signature verified — event:", event.type, event.id);
      } catch (err: any) {
        console.error("❌ Stripe signature verification failed:", err?.message || err);
        // Return 400 (not 401) per Stripe convention so the dashboard shows "Failed"
        // without aggressive retries that flood logs.
        return new Response(
          JSON.stringify({ error: "Invalid signature", message: err?.message || "verification failed" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    } else {
      console.warn("⚠️ STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not configured — signature verification skipped");
      try {
        event = JSON.parse(rawBody);
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

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
      await supabase
        .from("stripe_webhook_events")
        .update({ status: "processed", processed_at: new Date().toISOString() })
        .eq("event_id", event.id);
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
      } catch (e) {
        console.error("❌ recordUnreconciledPayment exception:", e);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // payment_intent.payment_failed — keep visibility for failed/declined cards
    // ─────────────────────────────────────────────────────────────────────────
    if (event.type === "payment_intent.payment_failed") {
      const pi = event.data.object;
      console.warn("💳 payment_intent.payment_failed:", pi.id, pi.last_payment_error?.message);
      // No booking action needed — the client booking flow stays in the form so
      // the user can retry. We just log for observability.
      return new Response(JSON.stringify({ received: true, type: "payment_failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const bookingId = paymentIntent.metadata?.booking_id;
      const bookingCode = paymentIntent.metadata?.booking_code;
      const piId = paymentIntent.id;

      if (!bookingId && !bookingCode) {
        console.warn("⚠️ payment_intent.succeeded with no booking metadata:", piId, "— recording for admin recovery");
        await recordUnreconciledPayment({
          paymentIntent,
          reason: "no_booking_metadata",
          eventId: event.id,
        });
        return new Response(JSON.stringify({ received: true, recorded: "unreconciled" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract payment method & customer for future off-session charges (overtime)
      const paymentMethodId = paymentIntent.payment_method || null;
      const stripeCustomerId = paymentIntent.customer || null;

      console.log(`📋 [${piId}] Processing payment_intent.succeeded — booking_id=${bookingId}, booking_code=${bookingCode}, pm=${paymentMethodId}, cus=${stripeCustomerId}`);

      // ── Step 1: LOOKUP booking by booking_id (preferred) or booking_code (fallback)
      // We do an explicit SELECT first so we can distinguish "not found" from "DB error".
      const selectCols = "id, booking_code, client_email, client_name, client_address, total, subtotal, surge_amount, service_type, scheduled_date, start_time, end_time, hours, stripe_payment_intent_id, patient_address, patient_postal_code, preferred_gender, preferred_languages, is_asap, is_transport_booking, status";

      let lookupQuery = supabase.from("bookings").select(selectCols);
      if (bookingId) {
        lookupQuery = lookupQuery.eq("id", bookingId);
      } else {
        lookupQuery = lookupQuery.eq("booking_code", bookingCode);
      }
      const { data: existingBooking, error: lookupError } = await lookupQuery.maybeSingle();

      if (lookupError) {
        console.error(`❌ [${piId}] DB lookup error (RLS or query failure):`, {
          code: lookupError.code,
          message: lookupError.message,
          details: lookupError.details,
          hint: lookupError.hint,
          booking_id: bookingId,
          booking_code: bookingCode,
        });
        await recordUnreconciledPayment({
          paymentIntent,
          reason: `booking_lookup_failed: ${lookupError.message}`,
          eventId: event.id,
        });
        return new Response(JSON.stringify({ received: true, error: "booking_lookup_failed", payment_intent_id: piId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!existingBooking) {
        // ── Booking truly does not exist for this booking_id/booking_code.
        // Per design: bookings are created BEFORE PaymentIntent, so this means
        // either (a) booking row was never inserted, or (b) the metadata is stale
        // from an old test event. We cannot fabricate a booking row with all the
        // required fields (address, times, hours, pricing) from only 4 metadata
        // fields. Record for admin recovery and return 200.
        console.error(`❌ [${piId}] Booking NOT FOUND — booking_id=${bookingId}, booking_code=${bookingCode}. Recording for admin recovery.`);
        await recordUnreconciledPayment({
          paymentIntent,
          reason: `booking_not_found: id=${bookingId || "(none)"} code=${bookingCode || "(none)"}`,
          eventId: event.id,
        });
        try {
          await supabase.from("notification_queue").insert({
            template_key: "payment-booking-mismatch",
            to_email: "admin@pswdirect.com",
            payload: {
              payment_intent_id: piId,
              booking_id: bookingId,
              booking_code: bookingCode,
              clientName: paymentIntent.metadata?.clientName,
              booking_session_id: paymentIntent.metadata?.booking_session_id,
              error: "booking_not_found",
            },
            status: "pending",
          });
        } catch (e) {
          console.error("❌ Could not log payment mismatch notification:", e);
        }
        return new Response(JSON.stringify({ received: true, recorded: "unreconciled", reason: "booking_not_found", payment_intent_id: piId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`🔎 [${piId}] Booking FOUND: id=${existingBooking.id} code=${existingBooking.booking_code} status=${existingBooking.status}`);

      // ── Step 2: UPDATE booking → mark as paid + save payment method for overtime
      const updatePayload: Record<string, any> = {
        payment_status: "paid",
        stripe_payment_intent_id: piId,
        updated_at: new Date().toISOString(),
      };
      if (paymentMethodId) updatePayload.stripe_payment_method_id = paymentMethodId;
      if (stripeCustomerId) updatePayload.stripe_customer_id = stripeCustomerId;

      const { data: updatedRows, error: updateError } = await supabase
        .from("bookings")
        .update(updatePayload)
        .eq("id", existingBooking.id)
        .select(selectCols);

      if (updateError) {
        console.error(`❌ [${piId}] CRITICAL: booking update FAILED (likely RLS):`, {
          code: updateError.code,
          message: updateError.message,
          details: updateError.details,
          hint: updateError.hint,
          booking_id: existingBooking.id,
        });
        await recordUnreconciledPayment({
          paymentIntent,
          reason: `booking_update_failed: ${updateError.message}`,
          eventId: event.id,
        });
        try {
          await supabase.from("notification_queue").insert({
            template_key: "payment-booking-mismatch",
            to_email: "admin@pswdirect.com",
            payload: { payment_intent_id: piId, booking_id: bookingId, booking_code: bookingCode, error: updateError.message },
            status: "pending",
          });
        } catch (e) {
          console.error("❌ Could not log payment mismatch notification:", e);
        }
        return new Response(JSON.stringify({ received: true, error: "booking_update_failed", recorded: "unreconciled", payment_intent_id: piId }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const booking: any = (updatedRows && updatedRows[0]) || existingBooking;

      // If this booking was a draft (awaiting_payment), promote it to pending now.
      if (booking && booking.status === "awaiting_payment") {
        const { error: statusErr } = await supabase
          .from("bookings")
          .update({ status: "pending", updated_at: new Date().toISOString() })
          .eq("id", booking.id);
        if (statusErr) {
          console.error(`❌ [${booking.booking_code}] Failed to promote awaiting_payment → pending:`, statusErr);
        } else {
          console.log(`🚀 [${booking.booking_code}] Promoted awaiting_payment → pending (PSWs can now claim)`);
          booking.status = "pending";
        }
      }

      {
        console.log(`✅ [${booking.booking_code}] Payment confirmed — pm_saved=${!!paymentMethodId}, cus_saved=${!!stripeCustomerId}`);

        // ── Send order confirmation email to client ──
        try {
          const { data: existingConfirmation } = await supabase
            .from("email_history")
            .select("id")
            .eq("template_key", "order-confirmation")
            .eq("to_email", booking.client_email)
            .ilike("subject", `%${booking.booking_code}%`)
            .maybeSingle();

          if (!existingConfirmation) {
            const serviceLabel = (booking.service_type || []).join(", ") || "Home Care";
            const cityOrPostal = (booking.patient_address || booking.client_address || "").split(",").slice(-2, -1)[0]?.trim()
              || booking.patient_postal_code || "Ontario";
            const firstName = booking.client_name?.split(" ")[0] || "there";

            const confirmHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#f9fafb}
.wrap{max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb}
.hdr{background:#1a1a2e;padding:32px 24px;text-align:center}.hdr h1{color:#fff;font-size:22px;margin-bottom:4px}.hdr p{color:#94a3b8;font-size:13px}
.body{padding:32px 24px}.body h2{font-size:18px;color:#1a1a2e;margin-bottom:16px}
.body p{font-size:14px;color:#4b5563;line-height:1.7;margin-bottom:16px}
.details{background:#f1f5f9;border-radius:8px;padding:20px;margin:20px 0}
.details .row{display:flex;justify-content:space-between;padding:8px 0;font-size:14px;border-bottom:1px solid #e2e8f0}
.details .row:last-child{border-bottom:none}.details .label{color:#6b7280;font-weight:500}.details .val{color:#1a1a2e;font-weight:600}
.next{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin:20px 0}
.next h3{font-size:14px;color:#166534;margin-bottom:8px}.next ul{list-style:none;padding:0}.next li{font-size:13px;color:#15803d;padding:4px 0}
.next li::before{content:"✓ ";font-weight:bold}
.ftr{text-align:center;padding:24px;border-top:1px solid #e5e7eb}.ftr p{font-size:11px;color:#9ca3af;line-height:1.6}
</style></head><body>
<div class="wrap">
<div class="hdr"><h1>PSW Direct</h1><p>Your Order is Confirmed</p></div>
<div class="body">
<h2>Hello ${firstName},</h2>
<p>Your order has been successfully received and confirmed.</p>
<p>We are currently assigning a Personal Support Worker (PSW) to your request. Please be patient while we match you with the best available provider in your area.</p>
<div class="details">
<div class="row"><span class="label">Order Reference</span><span class="val">${booking.booking_code}</span></div>
<div class="row"><span class="label">Service Type</span><span class="val">${serviceLabel}</span></div>
<div class="row"><span class="label">Date</span><span class="val">${booking.scheduled_date}</span></div>
<div class="row"><span class="label">Time</span><span class="val">${booking.start_time} – ${booking.end_time}</span></div>
<div class="row"><span class="label">Duration</span><span class="val">${booking.hours}h</span></div>
<div class="row"><span class="label">Location</span><span class="val">${cityOrPostal}</span></div>
</div>
<div class="next">
<h3>What Happens Next</h3>
<ul><li>A PSW will be assigned shortly</li><li>You will receive a follow-up notification once your PSW accepts the job</li></ul>
</div>
<p>If you have any urgent questions, please contact us at <strong>(249) 288-4787</strong>.</p>
<p>Thank you for choosing PSW Direct.</p>
</div>
<div class="ftr"><p>PSW Direct — Private Home Care, Ontario<br/>(249) 288-4787 · pswdirect.com</p></div>
</div></body></html>`;

            const emailUrl = `${supabaseUrl}/functions/v1/send-email`;
            const confirmRes = await fetch(emailUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceRoleKey}` },
              body: JSON.stringify({
                to: booking.client_email,
                subject: `Your PSW Direct Order is Confirmed — ${booking.booking_code}`,
                body: `Hello ${firstName}, your order ${booking.booking_code} has been confirmed. We are assigning a PSW to your request.`,
                htmlBody: confirmHtml,
                template_key: "order-confirmation",
              }),
            });

            if (confirmRes.ok) {
              console.log("📧 Order confirmation email sent to", booking.client_email, "for", booking.booking_code);
              await supabase.from("email_history").insert({
                template_key: "order-confirmation",
                to_email: booking.client_email,
                subject: `Your PSW Direct Order is Confirmed — ${booking.booking_code}`,
                html: confirmHtml,
                status: "sent",
              });
            } else {
              console.warn("⚠️ Order confirmation email failed:", await confirmRes.text());
            }
          } else {
            console.log("⏭️ Order confirmation already sent for", booking.booking_code);
          }
        } catch (confirmErr) {
          console.warn("⚠️ Order confirmation email error (non-fatal):", confirmErr);
        }


        // Idempotency: check if PSW dispatch already happened for this booking
        let alreadyDispatched = false;
        try {
          const { data: existingDispatch } = await supabase
            .from("dispatch_logs")
            .select("id")
            .eq("booking_code", booking.booking_code)
            .limit(1);
          alreadyDispatched = existingDispatch && existingDispatch.length > 0;
        } catch (e) {
          console.warn("⚠️ Dispatch dedup check failed, proceeding:", e);
        }

        if (alreadyDispatched) {
          console.log("⏭️ PSW dispatch already exists for", booking.booking_code, "— skipping duplicate");
        } else {
          // Dispatch PSW notifications now that payment is confirmed
          try {
            const notifyUrl = `${supabaseUrl}/functions/v1/notify-psws`;
            const notifyRes = await fetch(notifyUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
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
            console.log("📣 Webhook notify-psws:", notifyRes.status, notifyText);
          } catch (e) {
            console.warn("⚠️ Webhook notify-psws failed:", e);
          }
        }
      }

      // ── Invoice + Email Generation ──
      if (booking) {
        // Determine HST from service_tasks
        let hstAmount = 0;
        let serviceTypeLabel = (booking.service_type || []).join(", ") || "Home Care";
        try {
          const { data: tasks } = await supabase
            .from("service_tasks")
            .select("task_name, apply_hst, included_minutes")
            .in("task_name", booking.service_type || []);

          if (tasks && tasks.length > 0) {
            const totalMinutes = tasks.reduce((s: number, t: any) => s + (t.included_minutes || 30), 0);
            const taxableMinutes = tasks.filter((t: any) => t.apply_hst).reduce((s: number, t: any) => s + (t.included_minutes || 30), 0);
            const taxableFraction = totalMinutes > 0 ? taxableMinutes / totalMinutes : 0;
            hstAmount = Math.round(booking.subtotal * taxableFraction * 0.13 * 100) / 100;
          } else {
            // For transport categories (Doctor Escort / Hospital Discharge), apply full HST
            const isTransport = booking.is_transport_booking || 
              (booking.service_type || []).some((s: string) => /doctor|escort|hospital|discharge/i.test(s));
            if (isTransport) {
              hstAmount = Math.round(booking.subtotal * 0.13 * 100) / 100;
            }
          }
        } catch {
          hstAmount = Math.round((booking.total - booking.subtotal - (booking.surge_amount || 0)) * 100) / 100;
        }

        const surgeAmount = booking.surge_amount || 0;

        // Generate proper invoice number
        let invoiceNumber = booking.booking_code;
        try {
          const { data: invNum } = await supabase.rpc("generate_invoice_number");
          if (invNum) invoiceNumber = invNum;
        } catch (e) {
          console.warn("⚠️ Could not generate invoice number, using booking code:", e);
        }

        // Build pricing snapshot for historical accuracy
        const pricingSnapshot = {
          subtotal: Number(booking.subtotal),
          surgeAmount,
          hstAmount,
          total: Number(booking.total),
          hours: booking.hours,
          serviceType: serviceTypeLabel,
          isTransport: booking.is_transport_booking || false,
          isAsap: booking.is_asap || false,
          scheduledDate: booking.scheduled_date,
          startTime: booking.start_time,
          endTime: booking.end_time,
          capturedAt: new Date().toISOString(),
        };

        // Build invoice HTML
        const invoiceHtml = `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Invoice ${invoiceNumber}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1a1a2e;background:#fff}
.inv{max-width:680px;margin:0 auto;padding:40px 32px}.hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:32px}
.brand h1{font-size:24px;color:#1a1a2e;margin-bottom:4px}.brand p{font-size:12px;color:#6b7280;line-height:1.5}
.meta{text-align:right}.meta .num{font-size:18px;font-weight:700}.meta .dt{font-size:12px;color:#6b7280;margin-top:4px}
.badge{display:inline-block;padding:6px 16px;border-radius:6px;font-size:13px;font-weight:700;letter-spacing:.5px;background:#f0fdf4;color:#166534;border:1px solid #16653430;margin-top:8px}
hr{border:none;border-top:1px solid #e5e7eb;margin:24px 0}.stitle{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#9ca3af;font-weight:600;margin-bottom:12px}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}.blk label{display:block;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}.blk p{font-size:14px;color:#1f2937}
table.pr{width:100%;border-collapse:collapse;margin:16px 0}table.pr td{padding:10px 0;font-size:14px}table.pr td:last-child{text-align:right;font-variant-numeric:tabular-nums}
table.pr tr.tot td{border-top:2px solid #1a1a2e;font-weight:700;font-size:16px;padding-top:14px}
.pbox{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:24px 0}.pbox .row{display:flex;justify-content:space-between;font-size:13px;color:#4b5563;margin-bottom:4px}
.ftr{text-align:center;margin-top:40px;padding-top:24px;border-top:1px solid #e5e7eb}.ftr p{font-size:11px;color:#9ca3af;line-height:1.6}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.inv{padding:20px}}
@media(max-width:480px){.hdr{flex-direction:column;gap:16px}.meta{text-align:left}.grid{grid-template-columns:1fr}}
</style></head><body>
<div class="inv">
<div class="hdr"><div class="brand"><h1>PSW Direct</h1><p>239 Grove St E, Barrie, ON L4M 2R1<br/>(249) 288-4787<br/>pswdirect.com</p></div>
<div class="meta"><div class="num">${invoiceNumber}</div><div class="dt">Issued: ${new Date().toLocaleDateString("en-CA",{year:"numeric",month:"long",day:"numeric"})}</div><div class="badge">PAID</div></div></div>
<hr/>
<div class="stitle">Client Information</div>
<div class="grid"><div class="blk"><label>Name</label><p>${booking.client_name}</p></div><div class="blk"><label>Email</label><p>${booking.client_email}</p></div></div>
<hr/>
<div class="stitle">Service Details</div>
<div class="grid">
<div class="blk"><label>Order Reference</label><p>${booking.booking_code}</p></div>
<div class="blk"><label>Service Type</label><p>${serviceTypeLabel}</p></div>
<div class="blk"><label>Service Date</label><p>${booking.scheduled_date}</p></div>
<div class="blk"><label>Time</label><p>${booking.start_time} – ${booking.end_time}</p></div>
<div class="blk"><label>Duration</label><p>${booking.hours}h</p></div>
</div>
<hr/>
<div class="stitle">Pricing Breakdown</div>
<table class="pr">
<tr><td>Subtotal</td><td>$${Number(booking.subtotal).toFixed(2)}</td></tr>
${surgeAmount > 0 ? `<tr><td>Rush/Surge Fee</td><td>$${surgeAmount.toFixed(2)}</td></tr>` : ""}
${hstAmount > 0 ? `<tr><td>HST (13%)</td><td>$${hstAmount.toFixed(2)}</td></tr>` : ""}
<tr class="tot"><td>Total Charged</td><td>$${Number(booking.total).toFixed(2)} CAD</td></tr>
</table>
<div class="pbox"><div class="row"><span>Payment Status</span><span>✅ Paid</span></div><div class="row"><span>Transaction Ref</span><span style="font-size:11px;color:#9ca3af">${piId}</span></div></div>
<div class="ftr"><p>PSW Direct — Private Home Care, Ontario<br/>(249) 288-4787 · pswdirect.com<br/>Thank you for choosing PSW Direct.</p></div>
</div></body></html>`;

        // ── Persist invoice record (idempotent via unique constraint) ──
        try {
          const { error: invoiceInsertErr } = await supabase
            .from("invoices")
            .upsert({
              booking_id: booking.id,
              invoice_number: invoiceNumber,
              booking_code: booking.booking_code,
              client_email: booking.client_email,
              client_name: booking.client_name,
              invoice_type: "client_invoice",
              subtotal: booking.subtotal,
              tax: hstAmount,
              surge_amount: surgeAmount,
              rush_amount: 0,
              total: booking.total,
              currency: "CAD",
              status: "generated",
              document_status: "paid",
              service_type: serviceTypeLabel,
              duration_hours: booking.hours,
              pricing_snapshot: pricingSnapshot,
              stripe_payment_intent_id: piId,
              html_snapshot: invoiceHtml,
            }, { onConflict: "booking_id,invoice_type" });

          if (invoiceInsertErr) {
            console.warn(`⚠️ Invoice record insert failed:`, invoiceInsertErr.message);
          } else {
            console.log(`📄 [${booking.booking_code}] Invoice ${invoiceNumber} persisted with pricing snapshot`);
          }
        } catch (e) {
          console.warn(`⚠️ Invoice persistence error:`, e);
        }

        // ── Send invoice email (with dedup check) ──
        const { data: existingEmail } = await supabase
          .from("email_history")
          .select("id")
          .eq("template_key", "psa-client-invoice")
          .eq("to_email", booking.client_email)
          .ilike("subject", `%${booking.booking_code}%`)
          .maybeSingle();

        if (existingEmail) {
          console.log("⏭️ Invoice email already sent for", booking.booking_code);
          await supabase.from("invoices")
            .update({ status: "sent" })
            .eq("booking_id", booking.id)
            .eq("invoice_type", "client_invoice");
        } else {
          try {
            const emailUrl = `${supabaseUrl}/functions/v1/send-email`;
            const emailResponse = await fetch(emailUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${serviceRoleKey}`,
              },
              body: JSON.stringify({
                to: booking.client_email,
                subject: `Invoice ${invoiceNumber} — PSW Direct`,
                body: invoiceHtml,
                htmlBody: invoiceHtml,
                template_key: "psa-client-invoice",
              }),
            });

            if (emailResponse.ok) {
              console.log("📧 Invoice email sent to", booking.client_email, "for", booking.booking_code);
              await supabase.from("email_history").insert({
                template_key: "psa-client-invoice",
                to_email: booking.client_email,
                subject: `Invoice ${invoiceNumber} — PSW Direct`,
                html: invoiceHtml,
                status: "sent",
              });
              await supabase.from("invoices")
                .update({ status: "sent" })
                .eq("booking_id", booking.id)
                .eq("invoice_type", "client_invoice");
            } else {
              const errText = await emailResponse.text();
              console.warn("⚠️ Invoice email failed:", errText);
              await supabase.from("invoices")
                .update({ status: "email_failed" })
                .eq("booking_id", booking.id)
                .eq("invoice_type", "client_invoice");
            }
          } catch (emailErr) {
            console.error("❌ Invoice email error:", emailErr);
            await supabase.from("invoices")
              .update({ status: "email_failed" })
              .eq("booking_id", booking.id)
              .eq("invoice_type", "client_invoice");
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Stripe webhook error:", error);
    return new Response(JSON.stringify({ error: "Webhook processing failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
