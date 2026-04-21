// TEMPORARY simulation harness — mirrors stripe-webhook payment_intent.succeeded
// logic WITHOUT signature verification. Used only for end-to-end test runs.
// DELETE after testing.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const event = await req.json();
  const log: any[] = [];

  if (event.type === "payment_intent.payment_failed") {
    log.push({ step: "received_payment_failed", pi: event.data.object.id });
    return new Response(JSON.stringify({ received: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (event.type !== "payment_intent.succeeded") {
    return new Response(JSON.stringify({ ignored: event.type }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pi = event.data.object;
  const bookingId = pi.metadata?.booking_id;
  const bookingCode = pi.metadata?.booking_code;

  if (!bookingId && !bookingCode) {
    const { error } = await supabase.from("unreconciled_payments").upsert({
      stripe_payment_intent_id: pi.id,
      stripe_customer_id: pi.customer || null,
      stripe_payment_method_id: pi.payment_method || null,
      amount: (pi.amount_received ?? pi.amount ?? 0) / 100,
      currency: pi.currency || "cad",
      customer_email: pi.receipt_email || null,
      raw_metadata: pi.metadata || {},
      reason: "no_booking_metadata",
      stripe_event_id: event.id,
      status: "open",
    }, { onConflict: "stripe_payment_intent_id" });
    log.push({ step: "recorded_unreconciled_no_metadata", error: error?.message });
    return new Response(JSON.stringify({ received: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Idempotency check: if PI already linked to a booking that's already paid, skip
  const { data: existing } = await supabase
    .from("bookings")
    .select("id, booking_code, status, payment_status, stripe_payment_intent_id")
    .eq("stripe_payment_intent_id", pi.id)
    .maybeSingle();

  if (existing && existing.payment_status === "paid" && existing.status !== "awaiting_payment") {
    log.push({ step: "idempotent_skip", booking_code: existing.booking_code, already_status: existing.status });
    return new Response(JSON.stringify({ received: true, idempotent: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const filter = bookingId ? { id: bookingId } : { booking_code: bookingCode };
  const updatePayload: Record<string, any> = {
    payment_status: "paid",
    stripe_payment_intent_id: pi.id,
    stripe_payment_method_id: pi.payment_method || null,
    stripe_customer_id: pi.customer || null,
    updated_at: new Date().toISOString(),
  };

  const { data: booking, error: updateError } = await supabase
    .from("bookings")
    .update(updatePayload)
    .match(filter)
    .select("id, booking_code, status, payment_status")
    .single();

  if (updateError || !booking) {
    await supabase.from("unreconciled_payments").upsert({
      stripe_payment_intent_id: pi.id,
      stripe_customer_id: pi.customer || null,
      amount: (pi.amount_received ?? pi.amount ?? 0) / 100,
      currency: pi.currency || "cad",
      customer_email: pi.receipt_email || null,
      raw_metadata: pi.metadata || {},
      reason: `booking_update_failed: ${updateError?.message || "not found"}`,
      stripe_event_id: event.id,
      status: "open",
    }, { onConflict: "stripe_payment_intent_id" });
    log.push({ step: "recorded_unreconciled_lookup_fail", error: updateError?.message });
    return new Response(JSON.stringify({ received: true, log }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  log.push({ step: "payment_marked_paid", booking_code: booking.booking_code, prev_status: booking.status });

  if (booking.status === "awaiting_payment") {
    const { error: promoteErr } = await supabase
      .from("bookings")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("id", booking.id);
    log.push({ step: "promoted_to_pending", booking_code: booking.booking_code, error: promoteErr?.message });
  }

  return new Response(JSON.stringify({ received: true, booking_code: booking.booking_code, log }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
