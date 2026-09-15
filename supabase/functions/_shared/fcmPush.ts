// Native push (Firebase Cloud Messaging) for the PSW Direct Worker app.
//
// This is a SEPARATE channel from the website's Progressier web push. Both run
// side by side: browser users keep receiving Progressier notifications, while
// caregivers who installed the Android/iOS Worker app receive FCM messages on
// the device tokens stored in `worker_push_tokens`.
//
// Sending goes through the Lovable connector gateway, so the Firebase service
// account never appears in this code. Lock-screen copy must stay free of client
// names, addresses and health information.

// deno-lint-ignore-file no-explicit-any
import { SupabaseClient } from "npm:@supabase/supabase-js@2";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/firebase_messaging";

export type NativePushInput = {
  title: string;
  body: string;
  /** In-app path, e.g. "/psw/jobs/CDT-000123". */
  url: string;
};

export type NativePushResult = {
  configured: boolean;
  attempted: number;
  succeeded: number;
  failed: number;
  stale_tokens_removed: number;
};

type TokenRow = { email: string; token: string; platform: string };

const empty = (configured: boolean): NativePushResult => ({
  configured,
  attempted: 0,
  succeeded: 0,
  failed: 0,
  stale_tokens_removed: 0,
});

/** True once both the Lovable key and the Firebase connection key are present. */
export function nativePushConfigured(): boolean {
  return Boolean(Deno.env.get("LOVABLE_API_KEY") && Deno.env.get("FIREBASE_MESSAGING_API_KEY"));
}

/**
 * Send a native push to every registered Worker-app device belonging to the
 * given caregiver emails. Never throws — a push failure must not abort dispatch.
 */
export async function sendNativePush(
  supabase: SupabaseClient,
  recipientEmails: string[],
  payload: NativePushInput,
  source: string,
): Promise<NativePushResult> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const connectionKey = Deno.env.get("FIREBASE_MESSAGING_API_KEY");
  if (!lovableKey || !connectionKey) return empty(false);

  const emails = Array.from(
    new Set(recipientEmails.map((e) => (e || "").trim().toLowerCase()).filter(Boolean)),
  );
  if (emails.length === 0) return empty(true);

  let tokens: TokenRow[] = [];
  try {
    const { data, error } = await supabase.rpc("worker_push_tokens_for_emails", { _emails: emails });
    if (error) throw error;
    tokens = (data ?? []) as TokenRow[];
  } catch (e) {
    console.warn("native push token lookup failed:", (e as Error).message);
    return empty(true);
  }
  if (tokens.length === 0) return empty(true);

  const headers = {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": connectionKey,
    "Content-Type": "application/json",
  };

  let succeeded = 0;
  let failed = 0;
  const staleTokens: string[] = [];
  const logs: Record<string, unknown>[] = [];

  for (const row of tokens) {
    // Only the last 6 characters are ever stored or logged — a full device
    // token is a sending credential and must not appear in any record.
    const tokenSuffix = row.token.slice(-6);
    const idempotencyKey = `${source}:${payload.url}:${tokenSuffix}`;
    const base = {
      source,
      recipient_email: row.email,
      title: payload.title,
      url: payload.url,
      channel: "native_push",
      platform: row.platform,
      token_suffix: tokenSuffix,
      idempotency_key: idempotencyKey,
    };

    try {
      const res = await fetch(`${GATEWAY_URL}/v1/projects/_/messages:send`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: {
            token: row.token,
            notification: { title: payload.title, body: payload.body },
            data: { path: payload.url, source },
            android: { priority: "HIGH" },
            apns: { payload: { aps: { sound: "default" } } },
          },
        }),
      });

      if (res.ok) {
        succeeded++;
        // FCM accepting the message is NOT proof the handset showed it.
        logs.push({ ...base, http_status: res.status, attempts: 1, success: true, status: "service_accepted" });
      } else {
        failed++;
        const errorBody = await res.text();
        console.warn(`FCM send failed [${res.status}] ${source}: ${errorBody.slice(0, 500)}`);
        // 404 UNREGISTERED / 400 INVALID_ARGUMENT means the device token is dead.
        const dead = res.status === 404 || res.status === 400 || res.status === 410;
        if (dead) staleTokens.push(row.token);
        const permanent = dead || res.status === 401 || res.status === 403;
        logs.push({
          ...base,
          http_status: res.status,
          attempts: 1,
          success: false,
          status: dead ? "token_invalid" : permanent ? "failed_permanent" : "failed_temporary",
          failure_category: permanent ? "permanent" : "temporary",
          error_message: errorBody.slice(0, 300),
        });
      }
    } catch (e) {
      failed++;
      console.warn(`FCM send threw (${source}):`, (e as Error).message);
      logs.push({
        ...base,
        attempts: 1,
        success: false,
        status: "failed_temporary",
        failure_category: "temporary",
        error_message: (e as Error).message.slice(0, 300),
      });
    }
  }

  if (staleTokens.length > 0) {
    try {
      // Deactivate rather than delete: the registration history stays auditable.
      await supabase.rpc("deactivate_invalid_push_tokens", {
        _tokens: staleTokens,
        _reason: "token_invalid",
      });
    } catch (_e) { /* non-fatal */ }
  }

  if (logs.length > 0) {
    try {
      await supabase.from("push_delivery_logs").upsert(logs, {
        onConflict: "idempotency_key",
        ignoreDuplicates: true,
      });
    } catch (_e) { /* non-fatal */ }
  }

  console.log(
    `📲 native push ${source}: attempted=${tokens.length} accepted=${succeeded} failed=${failed} stale_deactivated=${staleTokens.length}`,
  );

  return {
    configured: true,
    attempted: tokens.length,
    succeeded,
    failed,
    stale_tokens_removed: staleTokens.length,
  };
}
