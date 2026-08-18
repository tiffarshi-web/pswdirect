import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIMEOUT_MINUTES = 10;
const ALERT_EMAIL = "admin@psadirect.ca";
const FROM = "PSW Direct Ops <admin@psadirect.ca>";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Bookings with a PaymentIntent, not yet paid, older than timeout, and not yet alerted
    const cutoff = new Date(Date.now() - TIMEOUT_MINUTES * 60_000).toISOString();
    const { data: candidates, error } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, total, stripe_payment_intent_id, payment_status, status, created_at, stale_webhook_alerted_at")
      .not("stripe_payment_intent_id", "is", null)
      .neq("payment_status", "paid")
      .lt("created_at", cutoff)
      .gt("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString()) // ignore >24h old
      .limit(50);

    if (error) throw error;

    // ── SELF-HEALING RECONCILIATION ──
    // Ask Stripe directly whether each PaymentIntent actually succeeded. If it
    // did, finalize the booking here instead of only emailing an alert. This
    // guarantees a paid order can never stay stranded because a webhook was
    // lost, mis-signed, or crashed.
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const healed: string[] = [];
    const remaining: any[] = [];
    for (const b of candidates ?? []) {
      if (!stripeKey) { remaining.push(b); continue; }
      try {
        const piRes = await fetch(
          `https://api.stripe.com/v1/payment_intents/${b.stripe_payment_intent_id}?expand[]=latest_charge`,
          { headers: { Authorization: `Basic ${btoa(`${stripeKey}:`)}` } },
        );
        const pi = await piRes.json();
        // Never finalize a payment that was refunded — the money is gone back.
        const chargeObj = typeof pi?.latest_charge === "object" ? pi.latest_charge : null;
        const wasRefunded = !!chargeObj?.refunded || Number(chargeObj?.amount_refunded ?? 0) > 0;
        if (pi?.status === "succeeded" && !wasRefunded) {
          const charge = pi?.latest_charge;
          const { error: rpcErr } = await supabase.rpc("admin_finalize_paid_booking_from_stripe", {
            p_booking_id: b.id,
            p_payment_intent_id: b.stripe_payment_intent_id,
            p_stripe_charge_id: typeof charge === "string" ? charge : charge?.id ?? null,
            p_stripe_customer_id: typeof pi?.customer === "string" ? pi.customer : null,
            p_stripe_payment_method_id: typeof pi?.payment_method === "string" ? pi.payment_method : null,
            p_amount_paid: typeof pi?.amount_received === "number" ? pi.amount_received / 100 : null,
            p_currency: pi?.currency ?? "cad",
            p_stripe_event_id: `reconciler_${b.stripe_payment_intent_id}`,
          });
          if (rpcErr) {
            console.error(`[reconcile] finalize failed ${b.booking_code}:`, rpcErr.message);
            remaining.push(b);
          } else {
            console.log(`[reconcile] healed ${b.booking_code} from ${b.stripe_payment_intent_id}`);
            healed.push(b.booking_code ?? b.id);
          }
          continue;
        }
      } catch (recErr) {
        console.warn("[reconcile] Stripe lookup failed:", recErr);
      }
      remaining.push(b);
    }

    const stale: any[] = [];
    for (const b of remaining) {
      // Any webhook event whose payload references this PI?
      const { data: evts } = await supabase
        .from("stripe_webhook_events")
        .select("event_id")
        .ilike("payload::text" as any, `%${b.stripe_payment_intent_id}%`)
        .limit(1);
      // ilike on jsonb::text isn't supported via PostgREST; fall back to RPC-less filter:
      // We'll instead check via a text search using contains on payload.
      let hasEvent = (evts?.length ?? 0) > 0;
      if (!hasEvent) {
        // Fallback query using raw filter on payload jsonb (PostgREST cs operator)
        const { data: evts2 } = await supabase
          .from("stripe_webhook_events")
          .select("event_id")
          .contains("payload", { data: { object: { id: b.stripe_payment_intent_id } } })
          .limit(1);
        hasEvent = (evts2?.length ?? 0) > 0;
      }
      if (!hasEvent && !b.stale_webhook_alerted_at) stale.push(b);
    }

    const alerts: string[] = [];
    for (const b of stale) {
      const ageMin = Math.round((Date.now() - new Date(b.created_at).getTime()) / 60000);
      const html = `
        <h2>⚠️ Stale PaymentIntent — no webhook received</h2>
        <p>A booking has an active Stripe PaymentIntent but no webhook events have arrived in ${ageMin} minutes (timeout: ${TIMEOUT_MINUTES}m).</p>
        <ul>
          <li><strong>Booking:</strong> ${b.booking_code ?? b.id}</li>
          <li><strong>Client:</strong> ${b.client_email ?? "—"}</li>
          <li><strong>Amount:</strong> $${b.total ?? "—"}</li>
          <li><strong>PaymentIntent:</strong> <code>${b.stripe_payment_intent_id}</code></li>
          <li><strong>Payment status (DB):</strong> ${b.payment_status}</li>
          <li><strong>Booking status:</strong> ${b.status}</li>
          <li><strong>Created:</strong> ${b.created_at}</li>
        </ul>
        <p>Likely causes: customer abandoned checkout, Stripe webhook endpoint down, or webhook signing secret mismatch. Check Stripe → Developers → Webhooks and the <code>stripe_webhook_events</code> table.</p>
      `;

      const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
          "X-Connection-Api-Key": Deno.env.get("RESEND_API_KEY")!,
        },
        body: JSON.stringify({
          from: FROM,
          to: [ALERT_EMAIL],
          subject: `⚠️ Stale PaymentIntent alert — ${b.booking_code ?? b.id} (${b.stripe_payment_intent_id})`,
          html,
        }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        console.error(`Resend failed [${resp.status}]: ${body}`);
        continue;
      }

      await supabase
        .from("bookings")
        .update({ stale_webhook_alerted_at: new Date().toISOString() })
        .eq("id", b.id);

      alerts.push(b.stripe_payment_intent_id);
    }

    return new Response(
      JSON.stringify({ success: true, scanned: candidates?.length ?? 0, healed_count: healed.length, healed, alerts_sent: alerts.length, alerts }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ success: false, error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
