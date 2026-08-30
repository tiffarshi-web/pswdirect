import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { resolveRecipient } from "../_shared/emailAddress.ts";
import { authorizeBookingCaller } from "../_shared/authorizeBookingCaller.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM_ADDRESS = "PSW Direct <admin@psadirect.ca>";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hr = parseInt(h, 10);
  const period = hr >= 12 ? "PM" : "AM";
  const hr12 = hr % 12 || 12;
  return `${hr12}:${m} ${period}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
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

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_name, client_first_name, scheduled_date, start_time, cancellation_reason, cancellation_note, was_refunded")
      .eq("id", booking_id)
      .maybeSingle();

    if (!booking || !booking.client_email) {
      return new Response(JSON.stringify({ skipped: "no_client_email" }), { status: 200, headers: corsHeaders });
    }

    // Malformed stored addresses (typos / stray whitespace) are rejected by the
    // provider with a 422. Normalize, and fail soft with a clear reason instead
    // of surfacing a 500 to the caller.
    const _rcpt = resolveRecipient(booking.client_email);
    const recipient = _rcpt.email;
    if (!_rcpt.ok) {
      console.error("Invalid recipient email on booking", booking.booking_code, JSON.stringify(booking.client_email));
      await supabase.from("email_history").insert({
        template_key: "order_cancelled",
        to_email: String(booking.client_email ?? ""),
        subject: "(not sent)",
        html: "",
        status: "failed",
        resend_response: null,
        error: "invalid_recipient_email",
      });
      return new Response(
        JSON.stringify({ success: false, error: "invalid_recipient_email", message: `The email address on file (${booking.client_email}) is not a valid address. Correct it on the order and resend.` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Check suppression list
    const { data: suppressed } = await supabase
      .from("suppressed_emails")
      .select("email")
      .eq("email", recipient)
      .maybeSingle();
    if (suppressed) {
      console.log("[EmailSuppression] Skipped order cancelled to suppressed email:", booking.client_email);
      return new Response(JSON.stringify({ skipped: "suppressed" }), { status: 200, headers: corsHeaders });
    }

    const clientFirst = (booking.client_first_name || booking.client_name || "").split(" ")[0] || "there";
    const scheduledDate = formatDate(booking.scheduled_date);
    const scheduledTime = formatTime(booking.start_time);
    const reason = booking.cancellation_note || booking.cancellation_reason || "";

    const subject = `Your booking has been cancelled – ${booking.booking_code}`;
    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f172a;margin:0 0 16px;">Your booking has been cancelled</h2>
  <p>Hi ${clientFirst},</p>
  <p>We're writing to confirm that your booking <strong>${booking.booking_code}</strong> scheduled for ${scheduledDate} at ${scheduledTime} has been cancelled.</p>
  ${reason ? `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;"><p style="margin:0;"><strong>Reason:</strong> ${reason}</p></div>` : ""}
  ${booking.was_refunded ? `<p>A refund has been issued and you'll receive a separate confirmation shortly.</p>` : ""}
  <p>If you'd like to rebook, just reply to this email or visit <a href="https://pswdirect.ca">pswdirect.ca</a>.</p>
  <p>Need help? Contact us at <a href="mailto:hello@psadirect.ca">hello@psadirect.ca</a>.</p>
  <p style="margin-top:32px;color:#64748b;font-size:13px;">— The PSW Direct Team</p>
</body></html>`.trim();

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: corsHeaders });
    }

    const resp = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`, "X-Connection-Api-Key": RESEND_API_KEY! },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [recipient], subject, html }),
    });
    const respJson = await resp.json();

    await supabase.from("email_history").insert({
      template_key: "order_cancelled",
      to_email: recipient,
      subject,
      html,
      status: resp.ok ? "sent" : "failed",
      resend_response: respJson,
      error: resp.ok ? null : (respJson?.message || `HTTP ${resp.status}`),
    });

    // Always 200 — the `success` flag reports provider acceptance, so a
    // provider-side rejection never breaks the caller's UI flow.
    if (!resp.ok) console.error("Email provider rejected send", { status: resp.status, body: respJson });
    return new Response(
      JSON.stringify({ success: resp.ok, error: resp.ok ? null : (respJson?.message || `HTTP ${resp.status}`) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err: any) {
    console.error("send-order-cancelled-email error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
