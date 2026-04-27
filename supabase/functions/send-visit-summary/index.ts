import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FROM_ADDRESS = "PSW Direct <no-reply@psadirect.ca>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Strip phone/email/url patterns from observations
function sanitize(text: string): string {
  if (!text) return "";
  return text
    .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, "[contact removed]")
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[contact removed]")
    .replace(/\b(?:https?:\/\/|www\.)\S+/gi, "[link removed]");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { booking_id, tasks_completed, observations, uploaded_documents, office_number } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), { status: 400, headers: corsHeaders });
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Resolve client email server-side — PSWs never see this column
    const { data: b } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_first_name, client_name, scheduled_date, start_time, end_time, psw_first_name")
      .eq("id", booking_id)
      .maybeSingle();

    if (!b || !b.client_email) {
      return new Response(JSON.stringify({ skipped: "no_email_or_booking" }), { status: 200, headers: corsHeaders });
    }

    const clientFirst = (b.client_first_name || b.client_name || "there").split(" ")[0];
    const taskList = (tasks_completed || []).map((t: string) => `• ${t}`).join("\n");
    const sanitizedObs = sanitize(observations || "");

    // Build doc links section if specialty docs exist
    let docsSection = "";
    if (Array.isArray(uploaded_documents) && uploaded_documents.length > 0) {
      const links: string[] = [];
      for (const doc of uploaded_documents) {
        if (!doc?.url) continue;
        const { data } = await supabase.storage
          .from("psw-documents")
          .createSignedUrl(doc.url, 60 * 60 * 72);
        if (data?.signedUrl) links.push(`📎 ${doc.name}: ${data.signedUrl}`);
      }
      if (links.length) docsSection = `\n📄 Attached Documents:\n${links.join("\n")}\n`;
    }

    const subject = `PSW Direct Visit Summary – ${b.scheduled_date}`;
    const text = `
Hello ${clientFirst},

Here is the summary of your recent visit with PSW Direct.

📅 Visit Date: ${b.scheduled_date}
🕐 Time: ${b.start_time} – ${b.end_time}
👤 Caregiver: ${b.psw_first_name || "Your caregiver"}

✅ Services Provided:
${taskList}

${sanitizedObs ? `📝 Notes & Observations:\n${sanitizedObs}\n` : ""}${docsSection}
For scheduling or questions, please contact PSW Direct support at ${office_number || "(249) 288-4787"}.

Thank you for trusting PSW Direct with your care.

────────────────────────────

📅 Book Another Visit
https://pswdirect.ca/book

⭐ How was today's visit?
https://share.google/KHFEiCCwMk2ezlAXr

– PSW Direct Team
`.trim();

    const html = `<pre style="font-family:Arial,sans-serif;font-size:14px;color:#1a1a1a;white-space:pre-wrap;">${text.replace(/</g, "&lt;")}</pre>`;

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
      template_key: "visit_summary",
      to_email: b.client_email,
      subject,
      html,
      resend_response: respJson,
      status: resp.ok ? "sent" : "failed",
    });

    return new Response(JSON.stringify({ ok: resp.ok }), { status: 200, headers: corsHeaders });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
