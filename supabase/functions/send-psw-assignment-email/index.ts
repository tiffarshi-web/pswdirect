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

function formatServiceType(types: string[] | null): string {
  if (!types || types.length === 0) return "Home Care";
  const lower = types.map(t => t.toLowerCase()).join(" ");
  if (lower.includes("hospital") || lower.includes("discharge")) return "Hospital Discharge";
  if (lower.includes("doctor") || lower.includes("escort") || lower.includes("appointment")) return "Doctor Escort";
  return "Home Care";
}

function formatTime(time: string): string {
  // "14:30:00" -> "2:30 PM"
  const [h, m] = time.split(":");
  const hr = parseInt(h, 10);
  const period = hr >= 12 ? "PM" : "AM";
  const hr12 = hr % 12 || 12;
  return `${hr12}:${m} ${period}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-CA", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: booking, error: bErr } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_name, client_first_name, psw_assigned, psw_first_name, service_type, scheduled_date, start_time, hours, psw_assigned_email_sent_for")
      .eq("id", booking_id)
      .maybeSingle();

    if (bErr || !booking) {
      console.error("Booking not found", bErr);
      return new Response(JSON.stringify({ error: "Booking not found" }), { status: 404, headers: corsHeaders });
    }

    if (!booking.psw_assigned) {
      return new Response(JSON.stringify({ skipped: "no_psw_assigned" }), { status: 200, headers: corsHeaders });
    }

    if (!booking.client_email) {
      console.warn("No client email for booking", booking.booking_code);
      return new Response(JSON.stringify({ skipped: "no_client_email" }), { status: 200, headers: corsHeaders });
    }

    // Resolve current PSW first name from psw_profiles (source of truth, in case denormalized field is stale)
    const { data: pswProfile } = await supabase
      .from("psw_profiles")
      .select("first_name")
      .eq("id", booking.psw_assigned)
      .maybeSingle();

    const pswName = (pswProfile?.first_name || booking.psw_first_name || "your caregiver").trim();
    const serviceType = formatServiceType(booking.service_type);
    const scheduledDate = formatDate(booking.scheduled_date);
    const scheduledTime = formatTime(booking.start_time);
    const duration = booking.hours ? `${booking.hours} hour${booking.hours === 1 ? "" : "s"}` : "as scheduled";
    const clientFirst = (booking.client_first_name || booking.client_name || "").split(" ")[0] || "there";

    const subject = `Your PSW is Confirmed – Arriving at ${scheduledTime}`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; background:#ffffff; color:#1a1a1a; max-width:600px; margin:0 auto; padding:24px;">
  <h2 style="color:#0f172a; margin:0 0 16px;">Your caregiver is confirmed ✓</h2>
  <p>Hi ${clientFirst},</p>
  <p>Great news — <strong>${pswName}</strong> has been assigned to your upcoming ${serviceType.toLowerCase()} visit.</p>

  <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:16px; margin:20px 0;">
    <p style="margin:6px 0;"><strong>Caregiver:</strong> ${pswName}</p>
    <p style="margin:6px 0;"><strong>Service:</strong> ${serviceType}</p>
    <p style="margin:6px 0;"><strong>Date:</strong> ${scheduledDate}</p>
    <p style="margin:6px 0;"><strong>Arrival time:</strong> ${scheduledTime}</p>
    <p style="margin:6px 0;"><strong>Duration:</strong> ${duration}</p>
    <p style="margin:6px 0; color:#64748b; font-size:13px;">Booking ${booking.booking_code}</p>
  </div>

  <p>Your caregiver is scheduled and will arrive at the selected time. There's nothing more you need to do.</p>

  <p style="color:#475569; font-size:14px;">If you need to make changes, please contact PSW Direct support at <a href="mailto:hello@psadirect.ca">hello@psadirect.ca</a>.</p>

  <p style="margin-top:32px; color:#64748b; font-size:13px;">— The PSW Direct Team</p>
</body>
</html>`.trim();

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY missing");
      return new Response(JSON.stringify({ error: "Email service not configured" }), { status: 500, headers: corsHeaders });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [booking.client_email],
        subject,
        html,
      }),
    });

    const respJson = await resp.json();
    if (!resp.ok) {
      console.error("Resend error", resp.status, respJson);
      return new Response(JSON.stringify({ error: respJson.message || "Send failed" }), { status: resp.status, headers: corsHeaders });
    }

    // Log to email_history for the admin email log tab
    await supabase.from("email_history").insert({
      template_key: "psw_assigned",
      to_email: booking.client_email,
      subject,
      html,
      status: "sent",
      resend_response: respJson,
    });

    // Confirm dedup marker is set (trigger sets it BEFORE update; this is belt-and-suspenders for INSERT path)
    if (booking.psw_assigned_email_sent_for !== booking.psw_assigned) {
      await supabase
        .from("bookings")
        .update({ psw_assigned_email_sent_for: booking.psw_assigned })
        .eq("id", booking.id);
    }

    console.log(`✓ PSW assignment email sent to ${booking.client_email} for booking ${booking.booking_code}`);
    return new Response(JSON.stringify({ success: true, booking_code: booking.booking_code }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("send-psw-assignment-email error", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
