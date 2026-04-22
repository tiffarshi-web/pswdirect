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

function renderCareSheet(sheet: any): string {
  if (!sheet || typeof sheet !== "object") return "<p><em>Care sheet details not available.</em></p>";
  const rows: string[] = [];
  for (const [key, value] of Object.entries(sheet)) {
    if (value === null || value === undefined || value === "") continue;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    let display: string;
    if (Array.isArray(value)) display = value.join(", ");
    else if (typeof value === "object") display = JSON.stringify(value);
    else display = String(value);
    rows.push(`<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#475569;width:40%;">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;color:#1a1a1a;">${display}</td></tr>`);
  }
  if (!rows.length) return "<p><em>Care sheet was submitted with no detailed entries.</em></p>";
  return `<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">${rows.join("")}</table>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), { status: 400, headers: corsHeaders });
    }
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: b } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_name, client_first_name, scheduled_date, psw_first_name, care_sheet, care_sheet_status, care_sheet_submitted_at, care_sheet_sent_at")
      .eq("id", booking_id)
      .maybeSingle();

    if (!b || !b.client_email) {
      return new Response(JSON.stringify({ skipped: "no_email_or_booking" }), { status: 200, headers: corsHeaders });
    }

    const first = (b.client_first_name || b.client_name || "").split(" ")[0] || "there";
    const subject = `Care sheet – ${b.booking_code}`;

    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;max-width:680px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f172a;margin:0 0 16px;">Care sheet from your visit</h2>
  <p>Hi ${first},</p>
  <p>${b.psw_first_name ? `${b.psw_first_name}` : "Your caregiver"} has submitted the care sheet for booking <strong>${b.booking_code}</strong>${b.scheduled_date ? ` on ${new Date(b.scheduled_date + "T00:00:00").toLocaleDateString("en-CA")}` : ""}.</p>
  <div style="margin:20px 0;">
    ${renderCareSheet(b.care_sheet)}
  </div>
  <p>Keep this email for your records. Questions? Contact <a href="mailto:hello@psadirect.ca">hello@psadirect.ca</a>.</p>
  <p style="margin-top:32px;color:#64748b;font-size:13px;">— The PSW Direct Team</p>
</body></html>`.trim();

    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: "Email not configured" }), { status: 500, headers: corsHeaders });
    }

    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
      body: JSON.stringify({ from: FROM_ADDRESS, to: [b.client_email], subject, html }),
    });
    const respJson = await resp.json();

    await supabase.from("email_history").insert({
      template_key: "care_sheet_sent",
      to_email: b.client_email,
      subject, html,
      status: resp.ok ? "sent" : "failed",
      resend_response: respJson,
      error: resp.ok ? null : (respJson?.message || `HTTP ${resp.status}`),
    });

    if (resp.ok && !b.care_sheet_sent_at) {
      await supabase.from("bookings").update({ care_sheet_sent_at: new Date().toISOString() }).eq("id", b.id);
    }

    return new Response(JSON.stringify({ success: resp.ok }), { status: resp.ok ? 200 : 500, headers: corsHeaders });
  } catch (err: any) {
    console.error("send-care-sheet-email error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
