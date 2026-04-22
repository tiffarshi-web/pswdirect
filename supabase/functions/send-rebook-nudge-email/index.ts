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
const APP_BASE = "https://pswdirect.ca";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: b } = await supabase
      .from("bookings")
      .select(
        "id, booking_code, client_email, client_name, client_first_name, scheduled_date, hours, start_time, service_type, psw_first_name",
      )
      .eq("id", booking_id)
      .maybeSingle();

    if (!b || !b.client_email) {
      return new Response(JSON.stringify({ skipped: "no_email_or_booking" }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    const first =
      (b.client_first_name || b.client_name || "").split(" ")[0] || "there";

    // Deep link into the client portal — `?rebook=<code>` triggers the
    // OneClickRebookCard / ReturningClientBookingFlow with prefilled data.
    const rebookUrl = `${APP_BASE}/client?rebook=${encodeURIComponent(b.booking_code)}&prefill=1`;

    const subject = "Need care again? Book your next visit in seconds 💙";
    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f172a;margin:0 0 16px;">Hi ${first}, need care again?</h2>
  <p style="font-size:15px;line-height:1.5;">
    Thanks for trusting PSW Direct${b.psw_first_name ? ` and ${b.psw_first_name}` : ""} for your recent visit (Ref <strong>${b.booking_code}</strong>).
  </p>
  <p style="font-size:15px;line-height:1.5;">
    We've already saved your details. <strong>Book your next visit in under 15 seconds</strong> — same address, same service, same caregiver if available.
  </p>

  <div style="text-align:center;margin:28px 0;">
    <a href="${rebookUrl}"
       style="display:inline-block;background:#0f766e;color:#ffffff;font-weight:600;
              padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;">
      Rebook in seconds →
    </a>
  </div>

  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:14px 16px;margin:20px 0;">
    <p style="margin:0 0 6px;font-size:13px;color:#065f46;"><strong>Pre-filled for you:</strong></p>
    <p style="margin:0;font-size:13px;color:#065f46;">
      • Service: ${(b.service_type || []).join(", ") || "Home care"}<br/>
      • Last duration: ${Number(b.hours || 0).toFixed(1)}h<br/>
      • Preferred start: ${b.start_time?.slice(0, 5) || "—"}
    </p>
  </div>

  <p style="font-size:13px;color:#64748b;">
    Tip: If your card is on file, you can confirm with one tap — no re-entry required.
  </p>

  <p style="margin-top:32px;color:#64748b;font-size:13px;">— The PSW Direct Team</p>
</body></html>`.trim();

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [b.client_email],
        subject,
        html,
      }),
    });
    const respJson = await resp.json();

    await supabase.from("email_history").insert({
      template_key: "rebook_nudge",
      to_email: b.client_email,
      subject,
      html,
      status: resp.ok ? "sent" : "failed",
      resend_response: respJson,
      error: resp.ok ? null : respJson?.message || `HTTP ${resp.status}`,
    });

    return new Response(JSON.stringify({ success: resp.ok }), {
      status: resp.ok ? 200 : 500,
      headers: corsHeaders,
    });
  } catch (err: any) {
    console.error("send-rebook-nudge-email error", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
