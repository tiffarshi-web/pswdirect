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

const FROM_ADDRESS = "PSW Direct <no-reply@psadirect.ca>";

function formatTime(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  const hr = parseInt(h, 10);
  const period = hr >= 12 ? "PM" : "AM";
  const hr12 = hr % 12 || 12;
  return `${hr12}:${m} ${period}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: booking } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_name, client_first_name, service_type, scheduled_date, start_time, hours, status")
      .eq("id", booking_id)
      .maybeSingle();

    if (!booking || !booking.client_email) {
      return new Response(JSON.stringify({ skipped: "no_client_email" }), { status: 200, headers: corsHeaders });
    }

    if (booking.status === "cancelled" || booking.status === "completed") {
      return new Response(JSON.stringify({ skipped: "terminal_status" }), { status: 200, headers: corsHeaders });
    }

    const clientFirst = (booking.client_first_name || booking.client_name || "").split(" ")[0] || "there";
    const scheduledDate = formatDate(booking.scheduled_date);
    const scheduledTime = formatTime(booking.start_time);
    const duration = booking.hours ? `${booking.hours} hour${booking.hours === 1 ? "" : "s"}` : "as scheduled";

    const subject = `Your booking has been updated – ${booking.booking_code}`;
    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f172a;margin:0 0 16px;">Your booking has been updated</h2>
  <p>Hi ${clientFirst},</p>
  <p>Your upcoming visit has been rescheduled. Here are the new details:</p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;">
    <p style="margin:6px 0;"><strong>Booking:</strong> ${booking.booking_code}</p>
    <p style="margin:6px 0;"><strong>New date:</strong> ${scheduledDate}</p>
    <p style="margin:6px 0;"><strong>New time:</strong> ${scheduledTime}</p>
    <p style="margin:6px 0;"><strong>Duration:</strong> ${duration}</p>
  </div>
  <p>If this doesn't look right, please reply to this email or contact us at <a href="mailto:hello@psadirect.ca">hello@psadirect.ca</a>.</p>
  <p style="margin-top:32px;color:#64748b;font-size:13px;">— The PSW Direct Team</p>
</body></html>`.trim();

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: corsHeaders });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [booking.client_email], subject, html }),
    });
    const respJson = await resp.json();

    await supabase.from("email_history").insert({
      template_key: "order_updated",
      to_email: booking.client_email,
      subject,
      html,
      status: resp.ok ? "sent" : "failed",
      resend_response: respJson,
      error: resp.ok ? null : (respJson?.message || `HTTP ${resp.status}`),
    });

    return new Response(JSON.stringify({ success: resp.ok }), { status: resp.ok ? 200 : 500, headers: corsHeaders });
  } catch (err: any) {
    console.error("send-order-updated-email error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
