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
      .select("id, booking_code, client_email, client_name, client_first_name, total, hst_amount, subtotal, payment_success_email_sent_at")
      .eq("id", booking_id)
      .maybeSingle();

    if (!b || !b.client_email) {
      return new Response(JSON.stringify({ skipped: "no_email_or_booking" }), { status: 200, headers: corsHeaders });
    }

    const first = (b.client_first_name || b.client_name || "").split(" ")[0] || "there";
    const fmt = (n: any) => `$${Number(n || 0).toFixed(2)}`;
    const subject = `Payment received – ${b.booking_code}`;
    const html = `
<!DOCTYPE html>
<html><body style="font-family:Arial,sans-serif;background:#fff;color:#1a1a1a;max-width:600px;margin:0 auto;padding:24px;">
  <h2 style="color:#0f172a;margin:0 0 16px;">Payment received ✅</h2>
  <p>Hi ${first},</p>
  <p>We've received your payment for booking <strong>${b.booking_code}</strong>. Your invoice will follow shortly.</p>
  <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:20px 0;">
    <p style="margin:0 0 6px;"><strong>Subtotal:</strong> ${fmt(b.subtotal)}</p>
    ${b.hst_amount ? `<p style="margin:0 0 6px;"><strong>HST:</strong> ${fmt(b.hst_amount)}</p>` : ""}
    <p style="margin:0;font-size:16px;"><strong>Total paid:</strong> ${fmt(b.total)} CAD</p>
  </div>
  <p>Questions? Reply to this email or contact <a href="mailto:hello@psadirect.ca">hello@psadirect.ca</a>.</p>
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
      template_key: "payment_success",
      to_email: b.client_email,
      subject, html,
      status: resp.ok ? "sent" : "failed",
      resend_response: respJson,
      error: resp.ok ? null : (respJson?.message || `HTTP ${resp.status}`),
    });

    if (resp.ok && !b.payment_success_email_sent_at) {
      await supabase.from("bookings").update({ payment_success_email_sent_at: new Date().toISOString() }).eq("id", b.id);
    }

    return new Response(JSON.stringify({ success: resp.ok }), { status: resp.ok ? 200 : 500, headers: corsHeaders });
  } catch (err: any) {
    console.error("send-payment-success-email error", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
  }
});
