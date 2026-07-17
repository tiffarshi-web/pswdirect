import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Generic response used for all outcomes to avoid user enumeration
  const genericResponse = () =>
    new Response(
      JSON.stringify({ success: true, message: "If an account exists, a reset email has been sent." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  // Only allow redirect back to approved PSW Direct routes
  const ALLOWED_HOSTS = new Set(["pswdirect.ca", "www.pswdirect.ca", "psadirect.ca", "www.psadirect.ca"]);
  const DEFAULT_REDIRECT = "https://pswdirect.ca";
  const sanitizeRedirect = (candidate: unknown): string => {
    if (typeof candidate !== "string" || !candidate) return DEFAULT_REDIRECT;
    try {
      const u = new URL(candidate);
      if (u.protocol !== "https:") return DEFAULT_REDIRECT;
      if (!ALLOWED_HOSTS.has(u.hostname)) return DEFAULT_REDIRECT;
      return u.toString();
    } catch {
      return DEFAULT_REDIRECT;
    }
  };

  try {
    const { email, redirectTo } = await req.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("reset-password: missing supabase configuration");
      return genericResponse();
    }
    if (!resendApiKey || !lovableApiKey) {
      console.error("reset-password: email connector not configured");
      return genericResponse();
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const safeRedirect = sanitizeRedirect(redirectTo);

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email.toLowerCase().trim(),
      options: { redirectTo: safeRedirect },
    });

    if (linkError || !linkData?.properties?.action_link) {
      // Do not reveal whether the account exists; do not log email/link
      console.error("reset-password: generateLink did not produce a link");
      return genericResponse();
    }

    const actionLink = linkData.properties.action_link;

    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">PSW Direct</h1>
          <p style="color: #666; font-size: 14px; margin-top: 5px;">Password Reset Request</p>
        </div>

        <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
          <p style="color: #333; font-size: 16px; margin-top: 0;">Hi,</p>
          <p style="color: #333; font-size: 16px;">We received a request to reset your password. Click the button below to set a new password:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${actionLink}" style="background: #2563eb; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>

          <p style="color: #666; font-size: 14px;">This link will expire in 1 hour.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this, you can safely ignore this email.</p>
        </div>

        <div style="text-align: center; color: #999; font-size: 12px;">
          <p>PSW Direct — Personal Support Services</p>
          <p>pswdirect.ca</p>
        </div>
      </div>
    `;

    const resendRes = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": resendApiKey,
      },
      body: JSON.stringify({
        from: "PSW Direct <admin@psadirect.ca>",
        to: [email.toLowerCase().trim()],
        subject: "Reset Your Password — PSW Direct",
        html: htmlBody,
        text: `Reset your password by clicking this link: ${actionLink}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.`,
      }),
    });

    if (!resendRes.ok) {
      console.error("reset-password: resend send failed", { status: resendRes.status });
      return genericResponse();
    }

    return new Response(
      JSON.stringify({ success: true, message: "If an account exists, a reset email has been sent." }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("reset-password: unexpected error", { name: error?.name });
    return genericResponse();
  }
};


serve(handler);
