import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Restrict CORS to known origins
const ALLOWED_ORIGINS = [
  "https://psadirect.ca",
  "https://pswdirect.ca",
  "https://pswdirect.lovable.app",
  "https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app",
];

const getCorsHeaders = (origin: string | null): Record<string, string> => {
  const isAllowed = origin && ALLOWED_ORIGINS.some(allowed => 
    origin === allowed || origin.endsWith(".lovable.app") || origin.endsWith(".lovableproject.com")
  );
  
  return {
    "Access-Control-Allow-Origin": isAllowed ? origin! : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized: missing token" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // SECURITY: Only accept service role key or admin user JWTs.
    // Non-admin users (PSWs, clients) MUST NOT be able to send arbitrary emails.
    let userId: string;

    if (token === serviceRoleKey) {
      // Allow calls from other edge functions using service role
      userId = "service";
      console.log("Request authorized via service role");
    } else {
      // Validate as a real user JWT
      const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      });

      const { data: userData, error: userError } = await supabase.auth.getUser(token);

      if (userError || !userData?.user) {
        console.warn("Auth rejected: invalid user token", {
          origin,
          error: userError?.message,
        });
        return new Response(JSON.stringify({ error: "Unauthorized: invalid token" }), {
          status: 401,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      userId = userData.user.id;

      // SECURITY: Only admins may send emails via this endpoint.
      // Other edge functions use the service role key to send on behalf of users.
      const adminClient = createClient(supabaseUrl, serviceRoleKey);
      const { data: adminRole } = await adminClient
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRole) {
        console.warn("Forbidden: non-admin user attempted to send email", { userId, origin });
        return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
          status: 403,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      console.log("Request authorized for admin user:", userId);
    }

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

    // Validate email is not empty or whitespace
    const trimmedTo = to.trim();
    if (trimmedTo === '') {
      console.warn("Empty email address provided after trim");
      return new Response(
        JSON.stringify({ error: "Recipient email cannot be empty" }),
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

    // SECURITY: Force the from address server-side to prevent spoofing.
    // Caller-supplied 'from' is ignored entirely.
    const fromAddress = "PSW Direct <no-reply@psadirect.ca>";

    // Log email attempt with sending domain for audit
    const sendingDomain = fromAddress.match(/@([^>]+)/)?.[1] || "unknown";
    console.log("📧 Attempting to send email via Resend:", {
      to,
      subject,
      fromAddress,
      sendingDomain,
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
      console.error("Resend API error:", {
        status: res.status,
        response: emailResponse,
        to: trimmedTo,
        subject,
        fromAddress,
      });
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
