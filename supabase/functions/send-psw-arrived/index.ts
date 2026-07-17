import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeBookingCaller } from "../_shared/authorizeBookingCaller.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id, check_in_time } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), { status: 400, headers: corsHeaders });
    }

    const _authz = await authorizeBookingCaller(req, booking_id);
    if (!_authz.ok) {
      return new Response(JSON.stringify({ error: _authz.error }), {
        status: _authz.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Idempotency: conditionally claim the "arrived notified" slot on the booking.
    // The exact timestamp we write becomes this request's claim token so we can
    // conditionally release it later — and never clear another request's claim.
    const claimedAt = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabase
      .from("bookings")
      .update({ arrived_notified_at: claimedAt })
      .eq("id", booking_id)
      .is("arrived_notified_at", null)
      .not("checked_in_at", "is", null)
      .select("id, booking_code, client_email, client_name, scheduled_date, psw_first_name")
      .maybeSingle();

    if (claimErr) {
      console.error("[send-psw-arrived] claim error:", claimErr.message);
    }
    if (!claimed) {
      return new Response(JSON.stringify({ skipped: "already_notified_or_not_checked_in" }), { status: 200, headers: corsHeaders });
    }
    const b = claimed;

    if (!b.client_email) {
      return new Response(JSON.stringify({ skipped: "no_email" }), { status: 200, headers: corsHeaders });
    }

    // Check suppression list — deliberate skipped result (not an error).
    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("email")
      .eq("email", b.client_email.trim().toLowerCase())
      .maybeSingle();
    if (suppressed) {
      console.log("[EmailSuppression] Skipped PSW arrived (suppressed recipient)");
      return new Response(JSON.stringify({ skipped: "suppressed" }), { status: 200, headers: corsHeaders });
    }

    // Enqueue templated email. If the insert fails, conditionally release our
    // claim (only if arrived_notified_at still equals claimedAt) and 500 so
    // the caller / queue can retry. A retry will re-claim and re-enqueue.
    const { error: queueError } = await supabase.from("notification_queue").insert({
      template_key: "psw-arrived",
      to_email: b.client_email,
      payload: {
        client_name: b.client_name,
        booking_code: b.booking_code,
        booking_id: b.booking_code,
        job_date: b.scheduled_date,
        job_time: check_in_time || new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
        psw_first_name: (b.psw_first_name || "").split(" ")[0],
      },
    });

    if (queueError) {
      console.error("[send-psw-arrived] queue insert failed:", queueError.message);
      // Conditional rollback: only reset if the claim still belongs to us.
      const { error: rollbackErr } = await supabase
        .from("bookings")
        .update({ arrived_notified_at: null })
        .eq("id", booking_id)
        .eq("arrived_notified_at", claimedAt);
      if (rollbackErr) {
        console.error("[send-psw-arrived] rollback failed:", rollbackErr.message);
      }
      return new Response(
        JSON.stringify({ error: "queue_insert_failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
