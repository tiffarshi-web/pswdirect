import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Replace {{key}} placeholders in a string with values from payload
const replacePlaceholders = (
  template: string,
  payload: Record<string, string>
): string => {
  let result = template;

  // Handle conditional blocks: {{#field}}content{{/field}}
  const conditionalRegex = /\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g;
  result = result.replace(conditionalRegex, (_match, field, content) => {
    if (payload[field] && payload[field].trim()) {
      return content;
    }
    return "";
  });

  // Replace standard placeholders
  for (const [key, value] of Object.entries(payload)) {
    const escaped = `{{${key}}}`.replace(/[{}]/g, "\\$&");
    result = result.replace(new RegExp(escaped, "g"), value);
  }
  return result;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: "RESEND_API_KEY not configured" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1) Fetch up to 25 pending queue items
    const { data: queueItems, error: fetchError } = await supabase
      .from("notification_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(25);

    if (fetchError) {
      console.error("Failed to fetch queue:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch queue", detail: fetchError.message }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    if (!queueItems || queueItems.length === 0) {
      return new Response(
        JSON.stringify({ processed: 0, sent: 0, failed: 0, message: "No pending items" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let sent = 0;
    let failed = 0;

    for (const item of queueItems) {
      try {
        // 2) Load the template
        const { data: template, error: tplError } = await supabase
          .from("message_templates")
          .select("*")
          .eq("template_key", item.template_key)
          .eq("enabled", true)
          .maybeSingle();

        if (tplError || !template) {
          const errMsg = tplError?.message || `Template '${item.template_key}' not found or disabled`;
          console.warn("Template lookup failed:", errMsg);

          await supabase
            .from("notification_queue")
            .update({ status: "failed", error: errMsg, processed_at: new Date().toISOString() })
            .eq("id", item.id);

          await supabase.from("email_history").insert({
            template_key: item.template_key,
            to_email: item.to_email,
            subject: "",
            html: "",
            status: "failed",
            error: errMsg,
          });

          failed++;
          continue;
        }

        // 3) Replace placeholders
        const payload = (item.payload as Record<string, string>) || {};
        const subject = replacePlaceholders(template.subject, payload);
        const html = replacePlaceholders(template.html, payload);

        // 4) Send via Resend API directly (avoid routing through another edge function)
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "PSA Direct <admin@psadirect.ca>",
            to: [item.to_email],
            subject,
            html: html.replace(/\n/g, "<br>"),
            text: html.replace(/<[^>]*>/g, ""),
          }),
        });

        const resendData = await resendRes.json();

        if (!resendRes.ok) {
          const errMsg = resendData?.message || `Resend error ${resendRes.status}`;
          console.error("Resend failed for", item.to_email, errMsg);

          await supabase
            .from("notification_queue")
            .update({ status: "failed", error: errMsg, processed_at: new Date().toISOString() })
            .eq("id", item.id);

          await supabase.from("email_history").insert({
            template_key: item.template_key,
            to_email: item.to_email,
            subject,
            html,
            resend_response: resendData,
            status: "failed",
            error: errMsg,
          });

          failed++;
          continue;
        }

        // 5) Success
        await supabase
          .from("notification_queue")
          .update({ status: "sent", processed_at: new Date().toISOString() })
          .eq("id", item.id);

        await supabase.from("email_history").insert({
          template_key: item.template_key,
          to_email: item.to_email,
          subject,
          html,
          resend_response: resendData,
          status: "sent",
        });

        sent++;
        console.log("✅ Sent to", item.to_email, "template:", item.template_key);
      } catch (itemError: any) {
        console.error("Error processing queue item", item.id, itemError);

        await supabase
          .from("notification_queue")
          .update({
            status: "failed",
            error: itemError.message || "Unknown error",
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        await supabase.from("email_history").insert({
          template_key: item.template_key,
          to_email: item.to_email,
          subject: "",
          html: "",
          status: "failed",
          error: itemError.message || "Unknown error",
        });

        failed++;
      }
    }

    const summary = { processed: queueItems.length, sent, failed };
    console.log("Queue processing complete:", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Queue processor error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", detail: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
