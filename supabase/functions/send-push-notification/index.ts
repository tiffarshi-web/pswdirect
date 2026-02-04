import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  recipient_email?: string; // email address or "all" for broadcast
  title: string;
  body: string;
  url?: string; // deep link URL
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PROGRESSIER_API_KEY = Deno.env.get("PROGRESSIER_API_KEY");
    if (!PROGRESSIER_API_KEY) {
      throw new Error("PROGRESSIER_API_KEY is not configured");
    }

    const { recipient_email, title, body, url }: PushNotificationRequest = await req.json();

    if (!title || !body) {
      return new Response(
        JSON.stringify({ success: false, error: "Title and body are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the payload matching the exact format from Progressier API docs
    const payload: Record<string, unknown> = {
      title,
      body,
      url: url || "https://pswdirect.ca",
    };

    // Build recipients object - Progressier requires an object format
    if (recipient_email && recipient_email !== "all") {
      // Target specific user by email
      payload.recipients = { email: recipient_email };
    } else {
      // Broadcast to all users
      payload.recipients = "everyone";
    }

    console.log("Sending push notification with payload:", JSON.stringify(payload));

    // Progressier Push API endpoint - correct format from their API docs
    // POST https://progressier.app/[APP_ID]/send
    const PROGRESSIER_APP_ID = "xXf0UWVAPdw78va7cNFf";
    const apiUrl = `https://progressier.app/${PROGRESSIER_APP_ID}/send`;

    console.log("Calling API URL:", apiUrl);

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${PROGRESSIER_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { raw: responseText };
    }

    console.log("Progressier API response:", response.status, responseData);

    if (!response.ok) {
      console.error("Progressier API error:", response.status, responseData);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Progressier API error: ${response.status}`,
          details: responseData,
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Push notification sent successfully:", responseData);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Push notification sent",
        data: responseData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error sending push notification:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
