// Self-service push diagnostics for caregivers.
// A signed-in PSW can send a test push to their own device only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendProgressierPush } from "../_shared/progressierPush.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const progressierApiKey = Deno.env.get("PROGRESSIER_API_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!bearer) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${bearer}` } },
    });
    const { data: userResp } = await authClient.auth.getUser(bearer);
    const email = userResp?.user?.email?.trim().toLowerCase();
    if (!email) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // The caller must be a real caregiver profile.
    const { data: profile } = await supabase
      .from("psw_profiles")
      .select("id, first_name, email")
      .ilike("email", email)
      .maybeSingle();
    if (!profile) return json({ error: "No caregiver profile found for this account" }, 403);

    if (!progressierApiKey) {
      return json({ ok: false, reason: "PUSH_NOT_CONFIGURED" }, 200);
    }

    const result = await sendProgressierPush(
      [profile.email],
      {
        title: "✅ Test alert from PSW Direct",
        body: "Your device can receive job alerts. You're all set.",
        url: "/psw",
      },
      {
        apiKey: progressierApiKey,
        supabase,
        logContext: { source: "psw-test-ping" },
      },
    );

    // Mirror it in-app so the caregiver sees proof even if the OS blocks push.
    try {
      await supabase.from("notifications").insert({
        user_email: profile.email,
        title: "✅ Test alert from PSW Direct",
        body: "This is a test. If you did not see a pop-up on your phone, push notifications are blocked in your device settings.",
        type: "test_ping",
      });
    } catch (_e) { /* non-fatal */ }

    return json({
      ok: result.succeeded > 0,
      attempted: result.attempted,
      succeeded: result.succeeded,
      failed: result.failed,
      reason: result.succeeded > 0 ? null : "PROVIDER_REJECTED",
    });
  } catch (err) {
    console.error("psw-test-ping failed:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
