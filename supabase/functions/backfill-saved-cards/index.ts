// Admin-only maintenance job.
//
// Historically the client-side confirm path could mark a booking paid before
// the Stripe webhook landed. The finalize RPC then short-circuited on
// idempotency and never persisted stripe_customer_id / stripe_payment_method_id,
// so those bookings can never take an off-session charge (billing adjustment,
// overtime, one-click rebook).
//
// This job walks paid bookings that have a PaymentIntent but no saved card,
// reads the customer + payment method back from Stripe and repairs the row.
// It is idempotent and safe to re-run.

import Stripe from "npm:stripe@14.21.0";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return json({ error: "Stripe secret key not configured" }, 500);

    // ── Admin authorization ──
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json({ error: "Unauthorized" }, 401);

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) return json({ error: "Forbidden: admin access required" }, 403);

    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dryRun === true;
    const limit = Math.min(Number(body?.limit ?? 250), 500);

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16",
      httpClient: Stripe.createFetchHttpClient(),
    });

    const { data: rows, error: qErr } = await supabase
      .from("bookings")
      .select("id, booking_code, stripe_payment_intent_id, stripe_customer_id, stripe_payment_method_id")
      .in("payment_status", ["paid", "succeeded"])
      .not("stripe_payment_intent_id", "is", null)
      .is("stripe_payment_method_id", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (qErr) return json({ error: qErr.message }, 500);

    let repaired = 0;
    let skipped = 0;
    const failures: Array<{ booking_code: string; reason: string }> = [];

    for (const row of rows || []) {
      try {
        const pi = await stripe.paymentIntents.retrieve(row.stripe_payment_intent_id!);
        const pmId = typeof pi.payment_method === "string" ? pi.payment_method : pi.payment_method?.id || null;
        const custId = typeof pi.customer === "string" ? pi.customer : pi.customer?.id || null;

        if (!pmId) {
          skipped++;
          failures.push({ booking_code: row.booking_code, reason: "no payment_method on PaymentIntent" });
          continue;
        }

        if (dryRun) {
          repaired++;
          continue;
        }

        const patch: Record<string, string> = { stripe_payment_method_id: pmId };
        if (custId && !row.stripe_customer_id) patch.stripe_customer_id = custId;

        const { error: upErr } = await supabase.from("bookings").update(patch).eq("id", row.id);
        if (upErr) {
          failures.push({ booking_code: row.booking_code, reason: upErr.message });
          continue;
        }
        repaired++;
      } catch (e) {
        failures.push({ booking_code: row.booking_code, reason: (e as Error)?.message || "stripe error" });
      }
    }

    return json({
      success: true,
      dryRun,
      candidates: rows?.length || 0,
      repaired,
      skipped,
      failures: failures.slice(0, 50),
    });
  } catch (err) {
    console.error("backfill-saved-cards error", err);
    return json({ error: (err as Error)?.message || "Server error" }, 500);
  }
});
