// Edge function: Notification queue processor
//
// The notification_queue table collected office alerts (currently the
// "admin-geocode-flag" address-problem alert raised by create-booking) but
// nothing ever sent them, so the office never saw those alerts.
//
// This function drains pending rows and emails them to the office.
// Safety rules:
//  - Rows older than MAX_AGE_HOURS are never emailed; they are marked
//    "expired" so an old backlog cannot turn into a sudden email blast.
//  - Each row is claimed before sending, so two overlapping runs cannot
//    send the same alert twice.
//  - Failures are recorded on the row and retried on the next run.
//
// Does not touch bookings, payments, pricing or provider earnings.

import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeCronCaller } from "../_shared/authorizeBookingCaller.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const FROM_ADDRESS = "PSW Direct Alerts <admin@psadirect.ca>";
const FALLBACK_TO = "ops@psadirect.ca";
const BATCH_LIMIT = 25;
const MAX_AGE_HOURS = 24;

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface QueueRow {
  id: string;
  template_key: string;
  to_email: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export function renderAlert(row: QueueRow): { subject: string; html: string } {
  const payload = row.payload ?? {};
  if (row.template_key === "admin-geocode-flag") {
    const code = escapeHtml(payload.booking_code);
    return {
      subject: `Address needs review — order ${code || "(unknown)"}`,
      html: `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;color:#1a1a1a;">
  <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:20px;">
    <strong>Address could not be placed on the map</strong>
  </div>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:6px 0;color:#64748b;">Order</td><td style="padding:6px 0;">${code}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Result</td><td style="padding:6px 0;">${escapeHtml(payload.geocode_status)}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Reason</td><td style="padding:6px 0;">${escapeHtml(payload.geocode_error_code) || "not given"}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Address given</td><td style="padding:6px 0;">${escapeHtml(payload.raw_address)}</td></tr>
  </table>
  <p style="margin-top:24px;"><a href="https://pswdirect.ca/admin" style="background:#0f172a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Open admin portal</a></p>
</body></html>`.trim(),
    };
  }

  return {
    subject: `PSW Direct alert — ${escapeHtml(row.template_key)}`,
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;padding:24px;">
      <h2 style="margin:0 0 12px;">${escapeHtml(row.template_key)}</h2>
      <pre style="background:#f8fafc;padding:12px;border-radius:6px;white-space:pre-wrap;">${escapeHtml(
        JSON.stringify(payload, null, 2),
      )}</pre>
    </body></html>`,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = await authorizeCronCaller(req);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const cutoff = new Date(Date.now() - MAX_AGE_HOURS * 3600_000).toISOString();

  // Old backlog: never email it, just close it out with a clear note.
  const { data: expired } = await supabase
    .from("notification_queue")
    .update({
      status: "expired",
      processed_at: new Date().toISOString(),
      error: `Not sent: alert older than ${MAX_AGE_HOURS}h when the processor ran`,
    })
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .select("id");

  const { data: rows, error } = await supabase
    .from("notification_queue")
    .select("id, template_key, to_email, payload, created_at")
    .eq("status", "pending")
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true })
    .limit(BATCH_LIMIT);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let sent = 0;
  let failed = 0;

  for (const row of (rows ?? []) as QueueRow[]) {
    // Claim first so overlapping runs cannot double-send.
    const { data: claimed } = await supabase
      .from("notification_queue")
      .update({ status: "sending" })
      .eq("id", row.id)
      .eq("status", "pending")
      .select("id");
    if (!claimed || claimed.length === 0) continue;

    const { subject, html } = renderAlert(row);
    const to = row.to_email || FALLBACK_TO;

    if (!RESEND_API_KEY || !LOVABLE_API_KEY) {
      await supabase
        .from("notification_queue")
        .update({ status: "pending", error: "Email is not configured" })
        .eq("id", row.id);
      failed += 1;
      continue;
    }

    try {
      const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
      });
      const body = await resp.text();

      if (resp.ok) {
        await supabase
          .from("notification_queue")
          .update({ status: "sent", processed_at: new Date().toISOString(), error: null })
          .eq("id", row.id);
        sent += 1;
      } else {
        console.error(`notification_queue send failed [${resp.status}]: ${body}`);
        await supabase
          .from("notification_queue")
          .update({ status: "pending", error: `HTTP ${resp.status}: ${body.slice(0, 300)}` })
          .eq("id", row.id);
        failed += 1;
      }
    } catch (err) {
      console.error("notification_queue send error:", err);
      await supabase
        .from("notification_queue")
        .update({ status: "pending", error: String(err).slice(0, 300) })
        .eq("id", row.id);
      failed += 1;
    }
  }

  return new Response(
    JSON.stringify({ sent, failed, expired: expired?.length ?? 0 }),
    { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
