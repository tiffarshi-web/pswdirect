import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FROM_ADDRESS = "PSW Direct Alerts <no-reply@psadirect.ca>";
const ADMIN_EMAIL = "ops@psadirect.ca";

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
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
    const { booking_id, booking_code: passedCode, alert_type } = await req.json();

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    let booking: any = null;
    if (booking_id) {
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_code, client_name, client_email, client_phone, client_address, service_type, scheduled_date, start_time, hours, total, is_asap, status")
        .eq("id", booking_id)
        .maybeSingle();
      booking = data;
    } else if (passedCode) {
      const { data } = await supabase
        .from("bookings")
        .select("id, booking_code, client_name, client_email, client_phone, client_address, service_type, scheduled_date, start_time, hours, total, is_asap, status")
        .eq("booking_code", passedCode)
        .maybeSingle();
      booking = data;
    }

    if (!booking) {
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: corsHeaders });
    }

    const isUnserved = alert_type === "unserved";
    const banner = isUnserved
      ? `🚨 UNSERVED ORDER – No PSW found`
      : (booking.is_asap ? `⚡ NEW ASAP ORDER` : `🆕 New order received`);
    const bg = isUnserved ? "#fef2f2" : "#f0f9ff";
    const border = isUnserved ? "#fecaca" : "#bfdbfe";

    const subject = isUnserved
      ? `🚨 UNSERVED: ${booking.booking_code} needs manual assignment`
      : `${booking.is_asap ? "⚡ " : ""}New order ${booking.booking_code} – ${formatDate(booking.scheduled_date)} ${formatTime(booking.start_time)}`;

    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;max-width:640px;margin:0 auto;padding:24px;">
  <div style="background:${bg};border:1px solid ${border};border-radius:8px;padding:14px 16px;margin-bottom:20px;">
    <strong>${banner}</strong>
  </div>
  <h2 style="margin:0 0 12px;">${booking.booking_code}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:6px 0;color:#64748b;">Client</td><td style="padding:6px 0;">${booking.client_name || ""}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;">${booking.client_email || ""}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Phone</td><td style="padding:6px 0;">${booking.client_phone || ""}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Address</td><td style="padding:6px 0;">${booking.client_address || ""}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Service</td><td style="padding:6px 0;">${(booking.service_type || []).join(", ")}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Date / Time</td><td style="padding:6px 0;">${formatDate(booking.scheduled_date)} at ${formatTime(booking.start_time)}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Duration</td><td style="padding:6px 0;">${booking.hours} hours</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Total</td><td style="padding:6px 0;">$${Number(booking.total || 0).toFixed(2)}</td></tr>
    <tr><td style="padding:6px 0;color:#64748b;">Status</td><td style="padding:6px 0;">${booking.status}</td></tr>
  </table>
  <p style="margin-top:24px;"><a href="https://pswdirect.ca/admin" style="background:#0f172a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;">Open admin portal</a></p>
</body></html>`.trim();

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: corsHeaders });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [ADMIN_EMAIL], subject, html }),
    });
    const respJson = await resp.json();

    await supabase.from("email_history").insert({
      template_key: isUnserved ? "admin_unserved_order" : "admin_new_order",
      to_email: ADMIN_EMAIL,
      subject,
      html,
      status: resp.ok ? "sent" : "failed",
      resend_response: respJson,
      error: resp.ok ? null : (respJson?.message || `HTTP ${resp.status}`),
    });

    return new Response(JSON.stringify({ success: resp.ok }), { status: resp.ok ? 200 : 500, headers: corsHeaders });
  } catch (err: any) {
    console.error("send-admin-order-alert error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
