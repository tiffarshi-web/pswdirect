import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { authorizeCronCaller } from "../_shared/authorizeBookingCaller.ts";

/**
 * Provincial registration maintenance (daily cron).
 *
 * 1. Suspends job eligibility for providers whose provincial registration has
 *    expired, been restricted, or was never verified (provinces that require
 *    registration only — Ontario is unaffected).
 * 2. Emails renewal warnings to providers expiring within 30 days, plus one
 *    digest to the admin address.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const ADMIN_EMAIL = "info@pswdirect.ca";
const WARN_DAYS = 30;

interface ExpiringRow {
  psw_id: string;
  email: string | null;
  first_name: string | null;
  province: string | null;
  registration_expiry: string | null;
  days_left: number | null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const auth = authorizeCronCaller(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { data: suspended, error: suspendError } = await supabase.rpc(
      "suspend_expired_provincial_registrations",
    );
    if (suspendError) throw suspendError;

    const { data: expiring, error: expiringError } = await supabase.rpc(
      "expiring_provincial_registrations",
      { p_days: WARN_DAYS },
    );
    if (expiringError) throw expiringError;

    const rows = (expiring || []) as ExpiringRow[];
    let warned = 0;

    for (const row of rows) {
      if (!row.email) continue;
      const name = row.first_name || "there";
      const days = row.days_left ?? 0;
      const subject = `Your ${row.province} registration expires in ${days} day${days === 1 ? "" : "s"}`;
      const body =
        `Hi ${name},\n\n` +
        `Our records show your provincial registration expires on ${row.registration_expiry}.\n` +
        `Please renew it and send us the updated document before that date — once it expires ` +
        `you will stop receiving new shift offers until our team verifies the renewal.\n\n` +
        `Questions? Call us any time at (249) 288-4787.\n\nPSW Direct`;

      const { error: sendError } = await supabase.functions.invoke("send-email", {
        body: { to: row.email, subject, body },
      });
      if (sendError) {
        console.warn("renewal warning email failed for provider", row.psw_id, sendError.message);
      } else {
        warned++;
      }
    }

    if (rows.length > 0) {
      const lines = rows.map(
        (r) => `- ${r.first_name || "Provider"} (${r.province}) expires ${r.registration_expiry} — ${r.days_left} days`,
      );
      await supabase.functions.invoke("send-email", {
        body: {
          to: ADMIN_EMAIL,
          subject: `${rows.length} provincial registration(s) expiring within ${WARN_DAYS} days`,
          body: `Registrations expiring soon:\n\n${lines.join("\n")}\n\nSuspended today: ${suspended ?? 0}`,
        },
      });
    }

    console.log("registration renewal check done", { suspended, expiring: rows.length, warned });
    return new Response(
      JSON.stringify({ success: true, suspended: suspended ?? 0, expiring: rows.length, warned }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("registration renewal check failed:", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
