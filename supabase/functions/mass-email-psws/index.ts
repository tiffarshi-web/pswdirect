import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Admin auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const callerId = claimsData.claims.sub as string;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Verify admin role (user_roles is the source of truth for ongoing access)
    const { data: adminRole } = await supabase
      .from("user_roles").select("role").eq("user_id", callerId).eq("role", "admin").maybeSingle();
    if (!adminRole) {
      return new Response(JSON.stringify({ error: "Forbidden: admin access required" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    // --- End auth check ---

    // Parse optional body for targeting mode
    let targetMode = "never_signed_in"; // default
    try {
      const body = await req.json();
      if (body?.target) targetMode = body.target;
    } catch { /* no body = default */ }

    // Fetch all approved PSWs
    const { data: psws, error } = await supabase
      .from("psw_profiles")
      .select("email, first_name")
      .eq("vetting_status", "approved");

    if (error) throw error;
    if (!psws || psws.length === 0) {
      return new Response(JSON.stringify({ message: "No approved PSWs found" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let targetPsws = psws;

    // Filter to only PSWs who have never signed in
    if (targetMode === "never_signed_in") {
      const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      if (usersError) throw usersError;

      const signedInEmails = new Set(
        (users || [])
          .filter(u => u.last_sign_in_at)
          .map(u => u.email?.toLowerCase())
      );

      targetPsws = psws.filter(p => !signedInEmails.has(p.email.toLowerCase()));
    }

    if (targetPsws.length === 0) {
      return new Response(JSON.stringify({ message: "All approved PSWs have already signed in" }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Sending app download reminder to ${targetPsws.length} PSWs who haven't signed in`);

    const results = { sent: 0, failed: 0, errors: [] as string[], recipients: [] as string[] };

    for (const psw of targetPsws) {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: "PSA Direct <admin@psadirect.ca>",
            to: [psw.email],
            subject: "Download the PSA Direct App — You're Approved!",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a1a;">Hi ${psw.first_name},</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                  Congratulations — your PSA Direct application has been <strong>approved</strong>! 🎉
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                  To start receiving and accepting jobs, please download our mobile app and log in:
                </p>
                <div style="margin: 30px 0; text-align: center;">
                  <a href="https://psadirect.ca/install" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold; display: inline-block;">
                    Download the App
                  </a>
                </div>
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                  <strong>How to install:</strong>
                </p>
                <ol style="font-size: 15px; line-height: 1.8; color: #333;">
                  <li>Visit <a href="https://psadirect.ca/install" style="color: #2563eb;">psadirect.ca/install</a> on your phone</li>
                  <li>Follow the on-screen instructions to add the app to your home screen</li>
                  <li>Open the app and log in at <a href="https://psadirect.ca/psw-login" style="color: #2563eb;">psadirect.ca/psw-login</a></li>
                  <li>Start browsing and claiming available shifts!</li>
                </ol>
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                  If you've forgotten your password, use the <strong>"Forgot Password"</strong> link on the login page to reset it.
                </p>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  Need help? Call us at <strong>(249) 288-4787</strong> or reply to this email.
                </p>
                <p style="font-size: 14px; color: #666;">
                  Thank you,<br/>
                  <strong>PSA Direct Team</strong>
                </p>
              </div>
            `,
            text: `Hi ${psw.first_name}, your PSA Direct application is approved! Download the app at https://psadirect.ca/install and log in at https://psadirect.ca/psw-login to start accepting jobs. Need help? Call (249) 288-4787.`,
          }),
        });

        if (res.ok) {
          results.sent++;
          results.recipients.push(psw.email);
        } else {
          const err = await res.json();
          results.failed++;
          results.errors.push(`${psw.email}: ${err.message}`);
        }

        await new Promise((r) => setTimeout(r, 600));
      } catch (e: any) {
        results.failed++;
        results.errors.push(`${psw.email}: ${e.message}`);
      }
    }

    console.log("Mass email results:", results);

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("Mass email error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
