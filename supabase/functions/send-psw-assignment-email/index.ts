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
const TEMPLATE_KEY = "psw_assigned";

function formatServiceType(types: string[] | null): string {
  if (!types || types.length === 0) return "Home Care";
  const lower = types.map((t) => t.toLowerCase()).join(" ");
  if (lower.includes("hospital") || lower.includes("discharge")) return "Hospital Discharge";
  if (lower.includes("doctor") || lower.includes("escort") || lower.includes("appointment")) return "Doctor Escort";
  return "Home Care";
}

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function esc(v: unknown): string {
  return String(v ?? "").replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] as string)
  );
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  try {
    const payload = await req.json().catch(() => ({}));
    const booking_id = payload.booking_id || payload.bookingId;
    const forceResend = payload.force_resend === true;
    if (!booking_id) return json({ error: "booking_id required" }, 400);

    const _authz = await authorizeBookingCaller(req, booking_id);
    if (!_authz.ok) return json({ error: _authz.error }, _authz.status);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select(
        "id, booking_code, client_email, client_name, client_first_name, psw_assigned, psw_first_name, service_type, scheduled_date, start_time, hours, psw_assignment_version"
      )
      .eq("id", booking_id)
      .maybeSingle();

    if (bErr || !booking) return json({ error: "Booking not found" }, 404);
    if (!booking.psw_assigned) return json({ skipped: "no_psw_assigned" });
    if (!booking.client_email) return json({ skipped: "no_client_email" });

    const assignmentVersion =
      Number(payload.assignment_version ?? booking.psw_assignment_version ?? 1) || 1;
    const recipient = booking.client_email.trim();

    // ── QA isolation: never email a real client for synthetic test bookings ──
    const qa = await getQaBookingInfo(supabase, booking_id);
    if (qa.isTest) {
      const { data: allowed } = await supabase.rpc("is_qa_allowed_recipient", {
        p_email: recipient.toLowerCase(),
      });
      if (allowed !== true) {
        console.log("[qa-isolation] assignment email blocked for test booking", booking.booking_code);
        return json({ skipped: "qa_test_booking" });
      }
    }

    // ── Suppression list ──
    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("email")
      .eq("email", recipient.toLowerCase())
      .maybeSingle();
    if (suppressed) return json({ skipped: "suppressed" });

    // ── Idempotency: one email per (booking, psw, assignment version) ──
    const { data: existing } = await supabase
      .from("psw_assignment_email_log")
      .select("id, status, attempts")
      .eq("booking_id", booking_id)
      .eq("psw_id", booking.psw_assigned)
      .eq("assignment_version", assignmentVersion)
      .maybeSingle();

    if (existing && existing.status === "sent" && !forceResend) {
      return json({ skipped: "already_sent", log_id: existing.id });
    }

    // ── Resolve PSW display name (approved profile is source of truth) ──
    const { data: pswProfile } = await supabase
      .from("psw_profiles")
      .select("first_name, last_name")
      .eq("id", booking.psw_assigned)
      .maybeSingle();

    const pswName =
      [pswProfile?.first_name, pswProfile?.last_name].filter(Boolean).join(" ").trim() ||
      booking.psw_first_name ||
      "Your caregiver";

    const serviceType = formatServiceType(booking.service_type);
    const scheduledDate = formatDate(booking.scheduled_date);
    const scheduledTime = formatTime(booking.start_time);
    const duration = booking.hours ? `${booking.hours} hour${booking.hours === 1 ? "" : "s"}` : "as scheduled";
    const clientFirst = (booking.client_first_name || booking.client_name || "").split(" ")[0] || "there";
    const subject = `Your PSW Has Been Assigned – ${booking.booking_code}`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background:#ffffff; color:#1a1a1a; max-width:600px; margin:0 auto; padding:24px;">
  <h2 style="color:#0f172a; margin:0 0 16px;">Your PSW has been assigned</h2>
  <p>Hello ${esc(clientFirst)},</p>
  <p>A Personal Support Worker has been assigned to your upcoming PSW Direct booking.</p>

  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:20px 0;">
    <p style="margin:6px 0;"><strong>Assigned PSW:</strong> ${esc(pswName)}</p>
    <p style="margin:6px 0;"><strong>Service:</strong> ${esc(serviceType)}</p>
    <p style="margin:6px 0;"><strong>Date:</strong> ${esc(scheduledDate)}</p>
    <p style="margin:6px 0;"><strong>Time:</strong> ${esc(scheduledTime)}</p>
    <p style="margin:6px 0;"><strong>Duration:</strong> ${esc(duration)}</p>
    <p style="margin:6px 0;"><strong>Booking Number:</strong> ${esc(booking.booking_code)}</p>
  </div>

  <p>You can view your booking details by signing in to your PSW Direct account.</p>

  <p style="margin-top:32px; color:#64748b; font-size:13px;">
    Thank you,<br/>
    PSW Direct<br/>
    <a href="https://pswdirect.ca" style="color:#0f172a;">PSWDIRECT.CA</a><br/>
    249-288-4787
  </p>
</body>
</html>`.trim();

    // Record the attempt before sending so failures are always visible.
    const attempts = (existing?.attempts ?? 0) + 1;
    const { data: logRow } = await supabase
      .from("psw_assignment_email_log")
      .upsert(
        {
          booking_id,
          booking_code: booking.booking_code,
          psw_id: booking.psw_assigned,
          psw_display_name: pswName,
          assignment_version: assignmentVersion,
          template_key: TEMPLATE_KEY,
          recipient_email: recipient,
          status: "pending",
          attempts,
          error_message: null,
        },
        { onConflict: "booking_id,psw_id,assignment_version" }
      )
      .select("id")
      .maybeSingle();

    const finish = async (status: string, providerId: string | null, error: string | null) => {
      await supabase
        .from("psw_assignment_email_log")
        .update({ status, provider_message_id: providerId, error_message: error })
        .eq("booking_id", booking_id)
        .eq("psw_id", booking.psw_assigned)
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
      return json({ success: false, error: "Email service not configured" }, 200);
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
      console.error("Resend error", resp.status, respJson);
      await finish("failed", null, String(message));
      // Never fail the assignment because of an email problem.
      return json({ success: false, queued_for_retry: true, error: message });
    }

    await finish("sent", respJson?.id ?? null, null);
    await supabase
      .from("bookings")
      .update({ psw_assigned_email_sent_for: booking.psw_assigned })
      .eq("id", booking.id);

    console.log(`✓ PSW assignment email sent for ${booking.booking_code}`);
    return json({ success: true, booking_code: booking.booking_code, log_id: logRow?.id ?? null });
  } catch (err: any) {
    console.error("send-psw-assignment-email error", err);
    return json({ success: false, error: err?.message || "Internal error" }, 200);
  }
});
