// Admin Stripe Tools — Sync recent Stripe PaymentIntents into Recovery Queue,
// and replay failed webhook events safely. Admin-only.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function hmacSha256Hex(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) return json({ error: "Stripe not configured" }, 503);

    // Admin authn
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") || serviceKey,
      { global: { headers: { Authorization: `Bearer ${token}` } } },
    );
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const supa = createClient(supabaseUrl, serviceKey);
    const { data: isAdminUser } = await userClient.rpc("is_admin");
    if (!isAdminUser) return json({ error: "Forbidden: admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = body?.action as string;
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // ────────────────────────────────────────────────────────────────────
    // SYNC: fetch recent successful PaymentIntents from Stripe, compare
    // against bookings.stripe_payment_intent_id, enqueue orphans into
    // unreconciled_payments. Idempotent (unique on stripe_payment_intent_id).
    // ────────────────────────────────────────────────────────────────────
    if (action === "sync_payments") {
      const days = Math.min(Math.max(Number(body?.days) || 7, 1), 30);
      const since = Math.floor(Date.now() / 1000) - days * 86400;

      const found: string[] = [];
      const matched: string[] = [];
      const enqueued: string[] = [];
      const alreadyQueued: string[] = [];
      const errors: Array<{ pi: string; error: string }> = [];

      let starting_after: string | undefined;
      let scanned = 0;
      const maxPages = 5; // 500 PIs max per call

      for (let page = 0; page < maxPages; page++) {
        const list = await stripe.paymentIntents.list({
          limit: 100,
          created: { gte: since },
          ...(starting_after ? { starting_after } : {}),
        });
        for (const pi of list.data) {
          scanned++;
          if (pi.status !== "succeeded") continue;
          found.push(pi.id);

          // 1) Already linked to a booking?
          const { data: booking } = await supa
            .from("bookings")
            .select("id, booking_code")
            .eq("stripe_payment_intent_id", pi.id)
            .maybeSingle();
          if (booking) {
            matched.push(pi.id);
            continue;
          }

          // 2) Already in unreconciled queue?
          const { data: existing } = await supa
            .from("unreconciled_payments")
            .select("id")
            .eq("stripe_payment_intent_id", pi.id)
            .maybeSingle();
          if (existing) {
            alreadyQueued.push(pi.id);
            continue;
          }

          // 3) Enqueue
          const charge = (pi.latest_charge as any) || null;
          const customerEmail = pi.receipt_email
            || (pi.charges?.data?.[0]?.billing_details?.email)
            || (typeof charge === "object" ? charge?.billing_details?.email : null)
            || null;
          const customerName = (pi.charges?.data?.[0]?.billing_details?.name)
            || (typeof charge === "object" ? charge?.billing_details?.name : null)
            || (pi.metadata?.clientName ?? null);

          const { error: insErr } = await supa
            .from("unreconciled_payments")
            .insert({
              stripe_payment_intent_id: pi.id,
              stripe_customer_id: typeof pi.customer === "string" ? pi.customer : null,
              stripe_payment_method_id: typeof pi.payment_method === "string" ? pi.payment_method : null,
              amount: (pi.amount_received ?? pi.amount) / 100,
              currency: (pi.currency || "cad").toLowerCase(),
              customer_email: customerEmail,
              customer_name: customerName,
              raw_metadata: pi.metadata || {},
              reason: pi.metadata?.booking_id ? "booking_not_found" : "no_booking_metadata",
              status: "open",
            });
          if (insErr) {
            if ((insErr as any).code === "23505") {
              alreadyQueued.push(pi.id);
            } else {
              errors.push({ pi: pi.id, error: insErr.message });
            }
          } else {
            enqueued.push(pi.id);
          }
        }
        if (!list.has_more) break;
        starting_after = list.data[list.data.length - 1]?.id;
        if (!starting_after) break;
      }

      return json({
        ok: true,
        scanned,
        succeeded: found.length,
        matched: matched.length,
        already_in_queue: alreadyQueued.length,
        enqueued: enqueued.length,
        errors,
        enqueued_ids: enqueued,
      });
    }

    // ────────────────────────────────────────────────────────────────────
    // RETRY: replay a single failed webhook event by re-signing the stored
    // payload and POSTing it back to the stripe-webhook function. Safe
    // because the webhook function is idempotent and we delete the dedup
    // row first.
    // ────────────────────────────────────────────────────────────────────
    if (action === "retry_event") {
      const eventId = body?.event_id as string;
      if (!eventId) return json({ error: "event_id required" }, 400);
      if (!webhookSecret) return json({ error: "STRIPE_WEBHOOK_SECRET not configured" }, 503);

      // Prefer authoritative payload from Stripe; fall back to stored copy.
      let payloadObj: any = null;
      try {
        payloadObj = await stripe.events.retrieve(eventId);
      } catch (_e) {
        const { data: row } = await supa
          .from("stripe_webhook_events")
          .select("payload")
          .eq("event_id", eventId)
          .maybeSingle();
        payloadObj = row?.payload ?? null;
      }
      if (!payloadObj) return json({ error: "Event payload not found" }, 404);

      // Delete dedup row so the webhook will reprocess.
      await supa.from("stripe_webhook_events").delete().eq("event_id", eventId);

      const payloadStr = JSON.stringify(payloadObj);
      const ts = Math.floor(Date.now() / 1000);
      const sig = await hmacSha256Hex(webhookSecret, `${ts}.${payloadStr}`);
      const signatureHeader = `t=${ts},v1=${sig}`;

      const webhookUrl = `${supabaseUrl}/functions/v1/stripe-webhook`;
      const resp = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": signatureHeader,
          "apikey": Deno.env.get("SUPABASE_ANON_KEY") || serviceKey,
        },
        body: payloadStr,
      });
      const respText = await resp.text();
      return json({
        ok: resp.ok,
        status: resp.status,
        webhook_response: respText.slice(0, 500),
        event_id: eventId,
      });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e: any) {
    console.error("admin-stripe-tools error:", e);
    return json({ error: e?.message || "Internal error" }, 500);
  }
});
