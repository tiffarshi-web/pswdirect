import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Restrict CORS to known origins
const ALLOWED_ORIGINS = [
  "https://pswdirect.lovable.app",
  "https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app",
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith(".lovable.app")
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
};

interface EmailAttachment {
  filename: string;
  content: string; // Base64 encoded
  contentType: string;
}

interface EmailRequest {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  from?: string;
  attachment?: EmailAttachment;
}

const decodeJwtPayload = (jwt: string): Record<string, any> | null => {
  try {
    const parts = jwt.split(".");
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const handler = async (req: Request): Promise<Response> => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST method
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    // Lovable Cloud projects may use a separate publishable key in the browser SDK
    const supabasePublishableKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    
    const authHeader = req.headers.get("Authorization");

    // Auth: validate the Bearer token (works for both user sessions and anon tokens)
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey || "", {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);

    // Some anon tokens don't include `sub` and will fail getClaims() with
    // "missing sub claim" even though they are the expected browser anon token.
    // In that case, fall back to lightweight validation + origin restriction.
    const fallbackPayload =
      claimsError?.message?.includes("missing sub claim") ? decodeJwtPayload(token) : null;

    const expectedRef = (() => {
      try {
        const host = new URL(supabaseUrl).hostname; // <ref>.supabase.co
        return host.split(".")[0];
      } catch {
        return null;
      }
    })();

    const nowSec = Math.floor(Date.now() / 1000);
    const fallbackAllowed =
      !!fallbackPayload &&
      fallbackPayload.iss === "supabase" &&
      (!expectedRef || fallbackPayload.ref === expectedRef) &&
      typeof fallbackPayload.exp === "number" &&
      fallbackPayload.exp > nowSec;

    if ((claimsError || !claimsData?.claims) && !fallbackAllowed) {
      console.warn("Auth debug: invalid token", {
        origin,
        hasAnonKey: !!supabaseAnonKey,
        hasPublishableKey: !!supabasePublishableKey,
        claimsError: claimsError?.message,
        fallbackAllowed,
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    
    const userId = claimsData?.claims?.sub ?? "anon";

    console.log("Request authorized, user/service:", userId);

    // Parse and validate request body
    const { to, subject, body, htmlBody, from, attachment }: EmailRequest = await req.json();

    if (!to || !subject || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, body" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid email address format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use provided from address or default to Resend's onboarding domain
    // Note: For production, verify your domain at https://resend.com/domains
    const fromAddress = from || "PSW Direct <onboarding@resend.dev>";

    // Log email attempt for debugging
    console.log("📧 Attempting to send email via Resend:", {
      to,
      subject,
      fromAddress,
      hasApiKey: !!RESEND_API_KEY,
      apiKeyPrefix: RESEND_API_KEY ? RESEND_API_KEY.substring(0, 8) + "..." : "MISSING",
    });

    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "Email service not configured" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Build email payload
    const emailPayload: Record<string, any> = {
      from: fromAddress,
      to: [to],
      subject: subject,
      html: htmlBody || body.replace(/\n/g, "<br>"),
      text: body,
    };

    // Add attachment if present
    if (attachment) {
      emailPayload.attachments = [{
        filename: attachment.filename,
        content: attachment.content,
        type: attachment.contentType,
      }];
      console.log("📎 Attachment included:", attachment.filename, attachment.contentType);
    }

    // Call Resend API directly
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify(emailPayload),
    });

    const emailResponse = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", emailResponse);
      return new Response(
        JSON.stringify({ error: emailResponse.message || "Failed to send email" }),
        {
          status: res.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully by user:", userId, "to:", to);

    return new Response(JSON.stringify({ success: true, ...emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
