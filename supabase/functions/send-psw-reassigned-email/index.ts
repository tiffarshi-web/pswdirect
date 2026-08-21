import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { authorizeBookingCaller } from "../_shared/authorizeBookingCaller.ts";
import { getQaBookingInfo } from "../_shared/qaIsolation.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-internal-invoke-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM_ADDRESS = "PSW Direct <admin@psadirect.ca>";
const TEMPLATE_KEY = "psw_reassigned";

function fmtDate(d: string) {
  if (!d) return "";
  return new Date(d + "T00:00:00").toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}
function formatServiceType(types: string[] | null): string {
  if (!types || types.length === 0) return "Home Care";
  const lower = types.map((t) => t.toLowerCase()).join(" ");
  if (lower.includes("hospital") || lower.includes("discharge")) return "Hospital Discharge";
  if (lower.includes("doctor") || lower.includes("escort") || lower.includes("appointment")) return "Doctor Escort";
  return "Home Care";
}
function esc(v: unknown): string {
  return String(v ?? "").replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string)
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    const payload = await req.json().catch(() => ({}));
    const booking_id = payload.booking_id || payload.bookingId;
    const new_psw_id = payload.new_psw_id;
    const forceResend = payload.force_resend === true;
    if (!booking_id) return json({ error: "booking_id required" }, 400);

    const _authz = await authorizeBookingCaller(req, booking_id);
    if (!_authz.ok) return json({ error: _authz.error }, _authz.status);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: b } = await supabase
      .from("bookings")
      .select(
        "id, booking_code, client_email, client_name, client_first_name, scheduled_date, start_time, hours, service_type, psw_assigned, psw_first_name, psw_assignment_version"
      )
      .eq("id", booking_id)
      .maybeSingle();

    if (!b || !b.client_email) return json({ skipped: "no_email_or_booking" });

    const pswId = b.psw_assigned || new_psw_id;
    if (!pswId) return json({ skipped: "no_psw_assigned" });

    const assignmentVersion = Number(payload.assignment_version ?? b.psw_assignment_version ?? 1) || 1;
    const recipient = b.client_email.trim();

    // ── QA isolation ──
    const qa = await getQaBookingInfo(supabase, booking_id);
    if (qa.isTest) {
      const { data: allowed } = await supabase.rpc("is_qa_allowed_recipient", {
        p_email: recipient.toLowerCase(),
      });
      if (allowed !== true) return json({ skipped: "qa_test_booking" });
    }

    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("email")
      .eq("email", recipient.toLowerCase())
      .maybeSingle();
    if (suppressed) return json({ skipped: "suppressed" });

    const { data: existing } = await supabase
      .from("psw_assignment_email_log")
      .select("id, status, attempts")
      .eq("booking_id", booking_id)
      .eq("psw_id", pswId)
      .eq("assignment_version", assignmentVersion)
      .maybeSingle();

    if (existing && existing.status === "sent" && !forceResend) {
      return json({ skipped: "already_sent", log_id: existing.id });
    }

    const { data: psw } = await supabase
      .from("psw_profiles")
      .select("first_name, last_name")
      .eq("id", pswId)
      .maybeSingle();

    const newName =
      [psw?.first_name, psw?.last_name].filter(Boolean).join(" ").trim() ||
      b.psw_first_name ||
      "Your caregiver";

    const first = (b.client_first_name || b.client_name || "").split(" ")[0] || "there";
    const serviceType = formatServiceType(b.service_type);
    const duration = b.hours ? `${b.hours} hour${b.hours === 1 ? "" : "s"}` : "as scheduled";
    const subject = `Your PSW Has Been Assigned – ${b.booking_code}`;

    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f172a;margin:0 0 16px;">Your assigned PSW has changed.</h2>
  <p>Hello ${esc(first)},</p>
  <p>Your assigned PSW has changed. A new Personal Support Worker has been assigned to your upcoming PSW Direct booking.</p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;">
    <p style="margin:6px 0;"><strong>Assigned PSW:</strong> ${esc(newName)}</p>
    <p style="margin:6px 0;"><strong>Service:</strong> ${esc(serviceType)}</p>
    <p style="margin:6px 0;"><strong>Date:</strong> ${esc(fmtDate(b.scheduled_date))}</p>
    <p style="margin:6px 0;"><strong>Time:</strong> ${esc(fmtTime(b.start_time))}</p>
    <p style="margin:6px 0;"><strong>Duration:</strong> ${esc(duration)}</p>
    <p style="margin:6px 0;"><strong>Booking Number:</strong> ${esc(b.booking_code)}</p>
  </div>
  <p>You can view your booking details by signing in to your PSW Direct account.</p>
  <p style="margin-top:32px;color:#64748b;font-size:13px;">
    Thank you,<br/>
    PSW Direct<br/>
    <a href="https://pswdirect.ca" style="color:#0f172a;">PSWDIRECT.CA</a><br/>
    249-288-4787
  </p>
</body></html>`.trim();

    const attempts = (existing?.attempts ?? 0) + 1;
    await supabase.from("psw_assignment_email_log").upsert(
      {
        booking_id,
        booking_code: b.booking_code,
        psw_id: pswId,
        psw_display_name: newName,
        assignment_version: assignmentVersion,
        template_key: TEMPLATE_KEY,
        recipient_email: recipient,
        status: "pending",
        attempts,
        error_message: null,
      },
      { onConflict: "booking_id,psw_id,assignment_version" }
    );

    const finish = async (status: string, providerId: string | null, error: string | null) => {
      await supabase
        .from("psw_assignment_email_log")
        .update({ status, provider_message_id: providerId, error_message: error })
        .eq("booking_id", booking_id)
        .eq("psw_id", pswId)
        .eq("assignment_version", assignmentVersion);
      await supabase.from("email_history").insert({
        template_key: TEMPLATE_KEY,
        to_email: recipient,
        subject,
        html,
        status: status === "sent" ? "sent" : "failed",
        error,
      });
    };

    if (!RESEND_API_KEY) {
      await finish("failed", null, "Email service not configured");
      return json({ success: false, error: "Email service not configured" });
    }

    const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
      },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [recipient], subject, html }),
    });
    const respJson = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      const message = respJson?.message || `HTTP ${resp.status}`;
      await finish("failed", null, String(message));
      return json({ success: false, queued_for_retry: true, error: message });
    }

    await finish("sent", respJson?.id ?? null, null);
    await supabase
      .from("bookings")
      .update({ psw_reassigned_email_sent_at: new Date().toISOString() })
      .eq("id", b.id);

    return json({ success: true, booking_code: b.booking_code });
  } catch (err: any) {
    console.error("send-psw-reassigned-email error", err);
    return json({ success: false, error: err?.message || "Internal error" });
  }
});
