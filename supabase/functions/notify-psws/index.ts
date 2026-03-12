import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const progressierApiKey = Deno.env.get("PROGRESSIER_API_KEY");
    if (!progressierApiKey) {
      console.warn("⚠️ PROGRESSIER_API_KEY not set — skipping push notification");
      return new Response(
        JSON.stringify({ sent: false, reason: "API key not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const {
      booking_code,
      city,
      service_type,
      scheduled_date,
      start_time,
      is_asap,
    } = body;

    const serviceLabel = Array.isArray(service_type)
      ? service_type.slice(0, 2).join(", ")
      : service_type || "Care Service";

    const locationLabel = city || "your area";
    const dateLabel = is_asap ? "ASAP" : scheduled_date || "upcoming";

    const title = is_asap ? "🚨 ASAP Job Available!" : "📋 New Job Available!";
    const notifBody = is_asap
      ? `Urgent: ${serviceLabel} needed now in ${locationLabel}. Claim it before someone else does!`
      : `${serviceLabel} in ${locationLabel} on ${dateLabel} at ${start_time || "TBD"}. Open app to claim.`;

    // Send to all PSW subscribers via Progressier Push API
    const pushPayload = {
      recipients: { tags: "psw" },
      title,
      body: notifBody,
      url: "/psw-dashboard",
    };

    console.log("📱 Sending Progressier push:", JSON.stringify(pushPayload));

    const pushResponse = await fetch("https://progressier.com/api/v1/send-notification", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${progressierApiKey}`,
      },
      body: JSON.stringify(pushPayload),
    });

    const pushResult = await pushResponse.text();
    console.log("📱 Progressier response:", pushResponse.status, pushResult);

    if (!pushResponse.ok) {
      console.error("❌ Progressier push failed:", pushResponse.status, pushResult);
      return new Response(
        JSON.stringify({ sent: false, status: pushResponse.status, error: pushResult }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ sent: true, booking_code }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("notify-psws error:", error);
    return new Response(
      JSON.stringify({ sent: false, error: "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
