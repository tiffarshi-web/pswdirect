import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Account-deletion request from the PSW Direct Worker app.
 *
 * The caller must present their own session; the account is resolved from the
 * verified JWT, never from the request body, so one worker can never request
 * deletion of another worker's account.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OFFICE_EMAIL = "admin@psadirect.ca";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await asCaller.auth.getUser();
  const user = userData?.user;
  if (userError || !user) {
    return new Response(JSON.stringify({ error: "Not signed in" }), {
      status: 401,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey);

  // Look up the caregiver record for context, by the verified account only.
  const { data: profile } = await admin
    .from("psw_profiles")
    .select("id, psw_number, first_name, last_name, email")
    .eq("email", (user.email ?? "").trim().toLowerCase())
    .maybeSingle();

  const requestedAt = new Date().toISOString();

  // Stop future notifications immediately.
  await admin.from("worker_push_tokens").delete().eq("user_id", user.id);

  const summary = [
    `Account deletion requested at ${requestedAt}`,
    `Account email: ${user.email ?? "unknown"}`,
    `Account id: ${user.id}`,
    profile ? `Caregiver: ${profile.first_name ?? ""} ${profile.last_name ?? ""} (${profile.psw_number ?? "no number"})` : "No caregiver profile matched this email.",
    "",
    "Action required: confirm within two business days, reassign any accepted upcoming visits, then delete the profile and documents. Retain completed care reports and payment records per policy.",
  ].join("\n");

  try {
    await admin.functions.invoke("send-email", {
      body: {
        to: OFFICE_EMAIL,
        subject: `Account deletion request — ${user.email ?? user.id}`,
        body: summary,
      },
    });

    if (user.email) {
      await admin.functions.invoke("send-email", {
        body: {
          to: user.email,
          subject: "We received your PSW Direct account deletion request",
          body: [
            "Hello,",
            "",
            "We received your request to delete your PSW Direct Worker account. We will confirm within two business days and complete the deletion within thirty days.",
            "",
            "Completed care reports and payment records are kept for the period required by Ontario tax, insurance and health-record rules.",
            "",
            "If you did not make this request, call us right away at (249) 288-4787.",
            "",
            "PSW Direct Inc.",
          ].join("\n"),
        },
      });
    }
  } catch (emailError) {
    // The request itself is still recorded below; email delivery is best effort.
    console.error("Deletion request email failed", emailError);
  }

  await admin.from("admin_audit_log").insert({
    action: "worker_account_deletion_requested",
    entity_type: "auth_user",
    entity_id: user.id,
    details: { requested_at: requestedAt, psw_number: profile?.psw_number ?? null, source: "worker_mobile_app" },
  }).then(
    () => undefined,
    (auditError: unknown) => console.error("Audit insert failed", auditError),
  );

  return new Response(JSON.stringify({ success: true, requested_at: requestedAt }), {
    status: 200,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
});
