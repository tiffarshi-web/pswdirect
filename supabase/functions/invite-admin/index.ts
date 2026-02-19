import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface InviteRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    // Client with user's auth context
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Admin client for privileged operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: "Access denied. Admin role required." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { email }: InviteRequest = await req.json();

    if (!email || !email.includes("@")) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailLower = email.toLowerCase().trim();

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === emailLower);

    if (existingUser) {
      // Check if they already have admin role
      const { data: existingRole } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", existingUser.id)
        .eq("role", "admin")
        .single();

      if (existingRole) {
        return new Response(
          JSON.stringify({ error: "This user is already an admin" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Check for existing pending invitation
    const { data: existingInvite } = await supabaseAdmin
      .from("admin_invitations")
      .select("id, status, expires_at")
      .eq("email", emailLower)
      .eq("status", "pending")
      .single();

    if (existingInvite) {
      const expiresAt = new Date(existingInvite.expires_at);
      if (expiresAt > new Date()) {
        return new Response(
          JSON.stringify({ error: "An invitation is already pending for this email" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Expired invitation - delete it
      await supabaseAdmin
        .from("admin_invitations")
        .delete()
        .eq("id", existingInvite.id);
    }

    // Generate secure invite token
    const inviteToken = crypto.randomUUID() + "-" + crypto.randomUUID();

    // Create invitation record
    const { error: insertError } = await supabaseAdmin
      .from("admin_invitations")
      .insert({
        email: emailLower,
        invited_by: userId,
        invite_token: inviteToken,
        status: "pending",
      });

    if (insertError) {
      console.error("Failed to create invitation:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to create invitation" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send invitation email
    const setupUrl = `https://psadirect.ca/admin-setup?token=${inviteToken}`;

    let emailSent = false;
    let emailError: string | null = null;

    if (resendApiKey) {
      try {
        console.log("📧 Sending admin invite email to:", emailLower);
        const emailResponse = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "PSA Direct <admin@psadirect.ca>",
            to: [emailLower],
            subject: "You've Been Invited to PSA Direct Admin",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h1 style="color: #1a1a1a;">Admin Invitation</h1>
                <p>You've been invited to join PSA Direct as an administrator.</p>
                <p>Click the button below to set up your account:</p>
                <a href="${setupUrl}" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 16px 0;">
                  Set Up Your Account
                </a>
                <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
                <p style="color: #666; font-size: 14px;">If you didn't expect this invitation, you can ignore this email.</p>
              </div>
            `,
          }),
        });

        const responseText = await emailResponse.text();
        
        if (!emailResponse.ok) {
          console.error("Resend API error:", {
            status: emailResponse.status,
            response: responseText,
            to: emailLower,
          });
          emailError = `Email failed: ${responseText}`;
        } else {
          emailSent = true;
          console.log("✅ Admin invite email sent successfully:", responseText);
        }
      } catch (err) {
        console.error("Email sending exception:", err);
        emailError = err instanceof Error ? err.message : "Unknown email error";
      }
    } else {
      console.log("RESEND_API_KEY not set - invitation created but email not sent");
      console.log("Setup URL:", setupUrl);
      emailError = "RESEND_API_KEY not configured";
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: emailSent ? "Invitation sent successfully" : "Invitation created (email may not have sent)",
        emailSent,
        emailError,
        // Include setup URL in dev mode for testing
        ...(emailSent ? {} : { setupUrl })
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in invite-admin:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

Deno.serve(handler);
