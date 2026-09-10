import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

/**
 * Public (signed-out) account-deletion request for pswdirect.ca/account-deletion.
 *
 * Step 1 ("request"): anyone can submit an email address, but nothing is acted
 * on. A single-use verification link is emailed to that address, so a stranger
 * cannot start a deletion for someone else's account.
 * Step 2 ("confirm"): presenting the emailed token turns the record into a real
 * pending request, removes push registrations and writes an audit entry.
 *
 * Responses never reveal whether an account exists.
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const OFFICE_EMAIL = "admin@psadirect.ca";
const SITE = "https://pswdirect.ca";
const GENERIC =
  "If that email belongs to a PSW Direct account, we have sent a link to confirm the deletion request.";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let payload: { action?: string; email?: string; token?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid request" }, 400);
  }

  // ── Step 2: confirm with the emailed token ──────────────────────────────
  if (payload.action === "confirm") {
    const token = (payload.token ?? "").trim();
    if (token.length < 20) return json({ error: "This link is not valid." }, 400);

    const { data: row } = await admin
      .from("account_deletion_requests")
      .select("id, email, status, requested_at")
      .eq("verification_token_hash", await sha256(token))
      .maybeSingle();

    if (!row) return json({ error: "This link is not valid or has already been used." }, 400);
    if (row.status !== "awaiting_verification") {
      return json({ ok: true, status: row.status, message: "This request is already recorded." });
    }
    // Links are good for 24 hours.
    if (Date.now() - new Date(row.requested_at as string).getTime() > 24 * 60 * 60 * 1000) {
      return json({ error: "This link has expired. Please request deletion again." }, 400);
    }

    await admin
      .from("account_deletion_requests")
      .update({
        status: "pending",
        verified_at: new Date().toISOString(),
        verification_token_hash: null,
      })
      .eq("id", row.id);

    // Stop notifications for the matching account, if there is one.
    const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const match = users?.users?.find(
      (u) => (u.email ?? "").trim().toLowerCase() === String(row.email).trim().toLowerCase(),
    );
    if (match) await admin.from("worker_push_tokens").delete().eq("user_id", match.id);

    await admin.from("admin_audit_log").insert({
      action: "worker_account_deletion_requested",
      entity_type: "account_deletion_request",
      entity_id: row.id,
      details: { source: "public_web", email: row.email },
    });

    await admin.functions.invoke("send-email", {
      body: {
        to: OFFICE_EMAIL,
        subject: `Account deletion request (web) — ${row.email}`,
        body: [
          `A deletion request was confirmed from the public page for ${row.email}.`,
          "",
          "Open the Security tab in the admin portal to complete it, reject it with a documented reason, or ask for identity verification.",
        ].join("\n"),
      },
    });

    return json({ ok: true, status: "pending" });
  }

  // ── Step 1: request a verification link ─────────────────────────────────
  const email = (payload.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || email.length > 254) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const { data: existing } = await admin
    .from("account_deletion_requests")
    .select("id, status")
    .eq("email", email)
    .in("status", ["awaiting_verification", "pending", "identity_verification_requested"])
    .maybeSingle();

  if (existing?.status === "pending" || existing?.status === "identity_verification_requested") {
    // Already a real request — do not create a duplicate, do not confirm or deny.
    return json({ ok: true, message: GENERIC });
  }

  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  const tokenHash = await sha256(token);

  const { data: profile } = await admin
    .from("psw_profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    await admin
      .from("account_deletion_requests")
      .update({ verification_token_hash: tokenHash, requested_at: new Date().toISOString() })
      .eq("id", existing.id);
  } else {
    const { error: insertError } = await admin.from("account_deletion_requests").insert({
      email,
      psw_profile_id: profile?.id ?? null,
      source: "public_web",
      status: "awaiting_verification",
      verification_token_hash: tokenHash,
    });
    if (insertError) {
      console.error("deletion request insert failed", insertError.message);
      return json({ ok: true, message: GENERIC });
    }
  }

  await admin.functions.invoke("send-email", {
    body: {
      to: email,
      subject: "Confirm your PSW Direct account deletion request",
      body: [
        "Hello,",
        "",
        "Someone asked us to delete the PSW Direct account for this email address. If that was you, confirm with this link (valid for 24 hours):",
        "",
        `${SITE}/account-deletion?token=${token}`,
        "",
        "If it was not you, ignore this email — nothing will happen — or call us any time at (249) 288-4787. Support is available 24 hours a day, seven days a week.",
        "",
        "PSW Direct Inc.",
      ].join("\n"),
    },
  });

  return json({ ok: true, message: GENERIC });
});
