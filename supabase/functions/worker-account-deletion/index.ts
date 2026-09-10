import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Account-deletion request from the PSW Direct Worker app.
 *
 * The caller must present their own session; the account is resolved from the
 * verified JWT, never from the request body, so one worker can never request
 * deletion of another worker's account.
 *
 * The request is persisted in `account_deletion_requests` (one open request per
 * email, enforced by a partial unique index), push registrations are removed,
 * and the caregiver is blocked from accepting further work by a database
 * trigger while the request is open. An administrator completes, rejects with a
 * documented reason, or asks for identity verification.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OFFICE_EMAIL = "admin@psadirect.ca";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const asCaller = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await asCaller.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: "Not signed in" }, 401);

  const admin = createClient(supabaseUrl, serviceKey);
  const email = (user.email ?? "").trim().toLowerCase();

  // Caregiver record, resolved from the verified account only.
  const { data: profile } = await admin
    .from("psw_profiles")
    .select("id, psw_number, first_name, last_name, email")
    .eq("email", email)
    .maybeSingle();

  const requestedAt = new Date().toISOString();

  // Already an open request? Report it instead of creating a duplicate.
  const { data: existing } = await admin
    .from("account_deletion_requests")
    .select("id, status, requested_at")
    .eq("email", email)
    .in("status", ["awaiting_verification", "pending", "identity_verification_requested"])
    .maybeSingle();

  let requestId = existing?.id ?? null;
  let duplicate = false;

  if (existing) {
    duplicate = existing.status !== "awaiting_verification";
    if (!duplicate) {
      // A web request was started but never confirmed; the signed-in caller is
      // proof enough, so promote it rather than opening a second record.
      await admin
        .from("account_deletion_requests")
        .update({
          status: "pending",
          user_id: user.id,
          psw_profile_id: profile?.id ?? null,
          source: "worker_app",
          verified_at: requestedAt,
          verification_token_hash: null,
        })
        .eq("id", existing.id);
    }
  } else {
    const { data: inserted, error: insertError } = await admin
      .from("account_deletion_requests")
      .insert({
        user_id: user.id,
        email,
        psw_profile_id: profile?.id ?? null,
        source: "worker_app",
        status: "pending",
        verified_at: requestedAt,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Deletion request insert failed", insertError.message);
      return json({ error: "Could not record the request" }, 500);
    }
    requestId = inserted.id;
  }

  // Stop future notifications immediately, and revoke every signed-in device.
  await admin.from("worker_push_tokens").delete().eq("user_id", user.id);
  try {
    await admin.auth.admin.signOut(user.id, "global");
  } catch (signOutError) {
    console.error("Session revocation failed", signOutError);
  }

  if (duplicate) {
    return json({ success: true, duplicate: true, request_id: requestId, requested_at: existing?.requested_at });
  }

  const summary = [
    `Account deletion requested at ${requestedAt}`,
    `Account email: ${email || "unknown"}`,
    `Account id: ${user.id}`,
    profile
      ? `Caregiver: ${profile.first_name ?? ""} ${profile.last_name ?? ""} (${profile.psw_number ?? "no number"})`
      : "No caregiver profile matched this email.",
    "",
    "The caregiver is blocked from accepting new work while this request is open, and every device session has been revoked.",
    "Action required: verify the requester's identity, reassign any accepted upcoming visits, then complete or reject the request in the admin Security tab. Completed care reports, invoices and payment records are retained as required by law.",
  ].join("\n");

  try {
    await admin.functions.invoke("send-email", {
      body: { to: OFFICE_EMAIL, subject: `Account deletion request — ${email || user.id}`, body: summary },
    });

    if (email) {
      await admin.functions.invoke("send-email", {
        body: {
          to: email,
          subject: "We received your PSW Direct account deletion request",
          body: [
            "Hello,",
            "",
            "We received your request to delete your PSW Direct Worker account. You have been signed out on all devices and you will not be offered further work while the request is open.",
            "",
            "Our office reviews each request and may contact you to confirm your identity, or to arrange cover for a visit you had already accepted. We will email you when the request is completed.",
            "",
            "Completed care reports, invoices and payment records are kept for the period required by Ontario tax, insurance and health-record obligations.",
            "",
            "If you did not make this request, call us right away at (249) 288-4787. Support is available 24 hours a day, seven days a week.",
            "",
            "PSW Direct Inc.",
          ].join("\n"),
        },
      });
    }
  } catch (emailError) {
    // The request is recorded either way; email delivery is best effort.
    console.error("Deletion request email failed", emailError);
  }

  await admin
    .from("admin_audit_log")
    .insert({
      action: "worker_account_deletion_requested",
      entity_type: "account_deletion_request",
      entity_id: requestId,
      details: {
        requested_at: requestedAt,
        psw_number: profile?.psw_number ?? null,
        source: "worker_mobile_app",
        email,
      },
    })
    .then(
      () => undefined,
      (auditError: unknown) => console.error("Audit insert failed", auditError),
    );

  return json({ success: true, request_id: requestId, requested_at: requestedAt });
});
