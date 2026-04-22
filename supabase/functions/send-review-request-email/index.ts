import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const REVIEW_URL = "https://share.google/k0drbotJWj63entOV";
const APP_BASE = "https://pswdirect.ca";

const buildHtml = (
  firstName: string,
  bookingCode: string,
  bookingId: string,
  rebookUrl: string,
  serviceSummary: string,
) => {
  const ratingUrl = (n: number) =>
    `${APP_BASE}/review?booking=${encodeURIComponent(bookingId)}&code=${encodeURIComponent(bookingCode)}&rating=${n}`;
  const star = (n: number) => `
    <a href="${ratingUrl(n)}" style="display:inline-block;text-decoration:none;margin:0 4px;">
      <div style="width:48px;height:48px;line-height:48px;border-radius:50%;background:#fff7e6;border:2px solid #f59e0b;color:#b45309;font-size:18px;font-weight:700;text-align:center;">${n}</div>
    </a>`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
<div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
  <div style="background:#1a1a2e;padding:24px 32px;text-align:center;">
    <h1 style="color:#fff;margin:0;font-size:22px;">PSW Direct</h1>
  </div>
  <div style="padding:32px;">
    <p style="font-size:16px;color:#1f2937;margin:0 0 16px;">Hello ${firstName},</p>
    <h2 style="font-size:20px;color:#111827;margin:0 0 12px;">How was your experience?</h2>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 20px;">
      Leave a quick review — it takes less than a minute and helps other families find trusted care.
    </p>

    <p style="font-size:14px;color:#6b7280;margin:0 0 8px;text-align:center;">Tap a rating:</p>
    <div style="text-align:center;margin:8px 0 28px;">
      ${star(1)}${star(2)}${star(3)}${star(4)}${star(5)}
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${REVIEW_URL}" style="display:inline-block;background:#4285f4;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;">
        ⭐ Leave a Google Review
      </a>
    </div>
    <p style="font-size:13px;color:#6b7280;text-align:center;margin:16px 0 0;">
      Booking ${bookingCode}
    </p>

    <hr style="border:none;border-top:1px solid #e5e7eb;margin:32px 0;" />

    <h2 style="font-size:18px;color:#111827;margin:0 0 8px;">Need care again?</h2>
    <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 8px;">
      Book your next visit in seconds${serviceSummary ? ` — ${serviceSummary}` : ""}.
    </p>
    <div style="text-align:center;margin:20px 0 8px;">
      <a href="${rebookUrl}" style="display:inline-block;background:#10b981;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;font-size:16px;font-weight:600;max-width:100%;">
        🔁 Rebook in Seconds
      </a>
    </div>
    <p style="font-size:13px;color:#6b7280;text-align:center;margin:8px 0 0;">
      Same address &amp; service pre-filled for you.
    </p>

    <p style="font-size:15px;color:#374151;line-height:1.6;margin:24px 0 0;">
      Thank you for choosing PSW Direct.
    </p>
  </div>
  <div style="background:#f3f4f6;padding:16px 32px;text-align:center;">
    <p style="font-size:12px;color:#9ca3af;margin:0;">© ${new Date().getFullYear()} PSW Direct — Ontario's On-Demand Home Care</p>
  </div>
</div></body></html>`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { booking_id } = await req.json();
    if (!booking_id) {
      return new Response(JSON.stringify({ error: "booking_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: booking, error } = await supabase
      .from("bookings")
      .select("id, booking_code, client_email, client_first_name, client_name, status, was_refunded, service_type, hours, client_address, client_postal_code")
      .eq("id", booking_id)
      .maybeSingle();

    if (error || !booking) {
      return new Response(JSON.stringify({ error: "booking not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (booking.was_refunded || booking.status === "cancelled" || !booking.client_email) {
      return new Response(JSON.stringify({ skipped: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedup against email_history
    const { data: prior } = await supabase
      .from("email_history")
      .select("id")
      .eq("template_key", "review-request")
      .eq("to_email", booking.client_email)
      .limit(1);
    if (prior && prior.length > 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "already sent" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName =
      booking.client_first_name || booking.client_name?.split(" ")[0] || "there";
    const serviceList = Array.isArray(booking.service_type) ? booking.service_type : [];
    const serviceLabel = serviceList[0] || "";
    const hoursLabel = booking.hours ? `${booking.hours}h` : "";
    const serviceSummary = [serviceLabel, hoursLabel].filter(Boolean).join(" · ");
    const rebookUrl = `${APP_BASE}/client?rebook=${encodeURIComponent(booking.booking_code)}&prefill=1`;
    const html = buildHtml(firstName, booking.booking_code, booking.id, rebookUrl, serviceSummary);
    const subject = "How was your experience? Leave a quick review";

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    let sent = false;
    let errorMsg: string | null = null;

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
          subject,
          html,
        }),
      });
      sent = res.ok;
      if (!res.ok) errorMsg = await res.text();
    } else {
      errorMsg = "missing api keys";
    }

    await supabase.from("email_history").insert({
      template_key: "review-request",
      to_email: booking.client_email,
      subject,
      html,
      status: sent ? "sent" : "failed",
      error: errorMsg,
    });

    if (sent) {
      await supabase
        .from("bookings")
        .update({
          review_request_sent: true,
          review_request_sent_at: new Date().toISOString(),
          review_request_email_sent_at: new Date().toISOString(),
        })
        .eq("id", booking.id);

      // Push notification (dedup: skip if one already exists for this booking)
      const { data: existingNotif } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_email", booking.client_email)
        .eq("type", "review_request")
        .ilike("body", `%${booking.booking_code}%`)
        .limit(1);

      if (!existingNotif || existingNotif.length === 0) {
        await supabase.from("notifications").insert({
          user_email: booking.client_email,
          type: "review_request",
          title: "How was your experience?",
          body: `Leave a quick review or book again in seconds. Booking ${booking.booking_code}. Review: ${APP_BASE}/review?booking=${booking.id}&code=${booking.booking_code} · Rebook: ${rebookUrl}`,
        });
      }
    }

    return new Response(JSON.stringify({ sent, error: errorMsg }), {
      status: sent ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-review-request-email error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
