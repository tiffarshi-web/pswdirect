// Self-service push diagnostics for caregivers.
// A signed-in PSW can send a test push to their own device only.
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendProgressierPush } from "../_shared/progressierPush.ts";
import { sendNativePush } from "../_shared/fcmPush.ts";

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

    // The caller must be a real caregiver profile. The test only ever targets
    // this profile's own email, so it cannot be used to notify anyone else,
    // and it never reads or changes a booking.
    const { data: profile } = await supabase
      .from("psw_profiles")
      .select("id, first_name, email")
      .ilike("email", email)
      .maybeSingle();
    if (!profile) return json({ error: "No caregiver profile found for this account" }, 403);

    // Server-side limit: 5 test alerts per hour per account.
    const { data: allowed } = await supabase.rpc("consume_rate_limit", {
      _bucket: "psw_test_ping",
      _subject: userResp.user.id,
      _limit: 5,
      _window_seconds: 3600,
    });
    if (allowed === false) {
      return json({
        ok: false,
        reason: "RATE_LIMITED",
        message: "You've sent several test alerts recently. Please try again in a little while.",
      }, 429);
    }

    // Which channels this caregiver is actually registered on.
    const { count: deviceCount } = await supabase
      .from("worker_push_tokens")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userResp.user.id)
      .eq("is_active", true);
    const channels = [
      ...(deviceCount && deviceCount > 0 ? ["app"] : []),
      ...(progressierApiKey ? ["browser"] : []),
      "in_app",
    ];

    // Worker app (native) devices first — this is the app channel.
    const native = await sendNativePush(
      supabase,
      [profile.email],
      {
        title: "✅ Test alert from PSW Direct",
        body: "Your device can receive job alerts. You're all set.",
        url: "/psw",
      },
      "psw-test-ping",
    );

    if (!progressierApiKey) {
      return json({
        ok: native.succeeded > 0,
        native,
        channels,
        registered_devices: deviceCount ?? 0,
        reason: native.succeeded > 0
          ? null
          : (deviceCount ?? 0) === 0
            ? "NO_REGISTERED_DEVICE"
            : "PUSH_NOT_CONFIGURED",
      }, 200);
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

    const succeeded = result.succeeded + native.succeeded;
    return json({
      ok: succeeded > 0,
      attempted: result.attempted + native.attempted,
      succeeded,
      failed: result.failed + native.failed,
      native,
      channels,
      registered_devices: deviceCount ?? 0,
      // A push service accepting the message is not proof the handset showed it.
      delivery_status: succeeded > 0 ? "service_accepted" : "failed_temporary",
      reason: succeeded > 0
        ? null
        : (deviceCount ?? 0) === 0
          ? "NO_REGISTERED_DEVICE"
          : "PROVIDER_REJECTED",
    });
  } catch (err) {
    console.error("psw-test-ping failed:", err);
    return json({ error: (err as Error).message }, 500);
  }
});
