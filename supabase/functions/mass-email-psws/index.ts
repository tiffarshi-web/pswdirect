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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

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

    console.log(`Sending mass email to ${psws.length} approved PSWs`);

    const results = { sent: 0, failed: 0, errors: [] as string[] };

    for (const psw of psws) {
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
            subject: "Action Required: Please Check Your PSA Direct Dashboard",
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #1a1a1a;">Hi ${psw.first_name},</h2>
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                  We're reaching out to ask you to <strong>log in to your PSA Direct dashboard</strong> and make sure everything is working properly.
                </p>
                <p style="font-size: 16px; line-height: 1.6; color: #333;">
                  Please take a moment to:
                </p>
                <ul style="font-size: 16px; line-height: 1.8; color: #333;">
                  <li>Visit <a href="https://psadirect.ca/psw-login" style="color: #2563eb;">psadirect.ca/psw-login</a></li>
                  <li>Log in with your credentials</li>
                  <li>Confirm you can access your dashboard</li>
                  <li>If you have any issues logging in, please contact us immediately</li>
                </ul>
                <div style="margin: 30px 0; text-align: center;">
                  <a href="https://psadirect.ca/psw-login" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: bold;">
                    Log In Now
                  </a>
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">
                  If you experience any issues, please call us at <strong>(249) 288-4787</strong>.
                </p>
                <p style="font-size: 14px; color: #666;">
                  Thank you,<br/>
                  <strong>PSA Direct Team</strong>
                </p>
              </div>
            `,
            text: `Hi ${psw.first_name}, please log in to your PSA Direct dashboard at https://psadirect.ca/psw-login and ensure you can access it. If you have issues, call (249) 288-4787.`,
          }),
        });

        if (res.ok) {
          results.sent++;
        } else {
          const err = await res.json();
          results.failed++;
          results.errors.push(`${psw.email}: ${err.message}`);
        }

        // Small delay to avoid rate limiting
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
