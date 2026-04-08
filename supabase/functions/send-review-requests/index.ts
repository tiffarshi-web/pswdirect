import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

const REVIEW_URL = "https://share.google/k0drbotJWj63entOV";

const buildReviewEmailHtml = (firstName: string) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:#1a1a2e;padding:24px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">PSW Direct</h1>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hello ${firstName},</p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 16px;">
      We hope everything went well with your home care service.
    </p>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 24px;">
      If you have a moment, we would really appreciate a quick review — it helps other families find trusted care when they need it most.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <a href="${REVIEW_URL}" style="display:inline-block;background:#4285f4;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;">
        ⭐ Leave a Google Review
      </a>
    </div>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:24px 0 0;">
      Thank you again for choosing PSW Direct.
    </p>
  </div>
  <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} PSW Direct — Ontario's On-Demand Home Care</p>
  </div>
</div>
</body>
</html>
`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Check admin toggle
    const { data: setting } = await supabase
      .from("app_settings")
      .select("setting_value")
      .eq("setting_key", "review_automation_enabled")
      .maybeSingle();

    if (setting?.setting_value === "false") {
      return new Response(JSON.stringify({ skipped: true, reason: "review automation disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find completed orders where:
    // - review not yet sent
    // - not cancelled/refunded
    // - signed out 2+ hours ago
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const { data: bookings, error: fetchErr } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_first_name, client_name, status, was_refunded")
      .eq("status", "completed")
      .eq("review_request_sent", false)
      .or("was_refunded.is.null,was_refunded.eq.false")
      .not("signed_out_at", "is", null)
      .lte("signed_out_at", twoHoursAgo)
      .limit(20);

    if (fetchErr) {
      console.error("Fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!bookings || bookings.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No eligible bookings" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let sentCount = 0;

    for (const booking of bookings) {
      const firstName = booking.client_first_name || booking.client_name?.split(" ")[0] || "there";
      const html = buildReviewEmailHtml(firstName);

      // Check dedup in email_history
      const { data: existing } = await supabase
        .from("email_history")
        .select("id")
        .eq("template_key", "review-request")
        .eq("to_email", booking.client_email)
        .ilike("subject", "%review%")
        .limit(1);

      if (existing && existing.length > 0) {
        // Already sent — mark flag and skip
        await supabase
          .from("bookings")
          .update({ review_request_sent: true, review_request_sent_at: new Date().toISOString() })
          .eq("id", booking.id);
        continue;
      }

      // Send via Resend through connector gateway
      let emailSent = false;
      try {
        if (resendApiKey && lovableApiKey) {
          const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": resendApiKey,
            },
            body: JSON.stringify({
              from: "PSW Direct <notifications@pswdirect.ca>",
              to: [booking.client_email],
              subject: "How was your home care service?",
              html,
            }),
          });
          emailSent = res.ok;
          if (!res.ok) {
            console.error(`Resend error for ${booking.booking_code}:`, await res.text());
          }
        }
      } catch (e) {
        console.error(`Email send error for ${booking.booking_code}:`, e);
      }

      if (emailSent) {
        // Log to email_history
        await supabase.from("email_history").insert({
          template_key: "review-request",
          to_email: booking.client_email,
          subject: "How was your home care service?",
          html,
          status: "sent",
        });

        // Mark booking
        await supabase
          .from("bookings")
          .update({ review_request_sent: true, review_request_sent_at: new Date().toISOString() })
          .eq("id", booking.id);

        sentCount++;
      }
    }

    return new Response(JSON.stringify({ sent: sentCount, checked: bookings.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Review request error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
