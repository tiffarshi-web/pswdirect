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

  for (const row of tokens) {
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
      } else {
        failed++;
        const errorBody = await res.text();
        console.warn(`FCM send failed [${res.status}] ${source}: ${errorBody.slice(0, 500)}`);
        // 404 UNREGISTERED / 400 INVALID_ARGUMENT means the device token is dead.
        if (res.status === 404 || res.status === 400) staleTokens.push(row.token);
      }
    } catch (e) {
      failed++;
      console.warn(`FCM send threw (${source}):`, (e as Error).message);
    }
  }

  if (staleTokens.length > 0) {
    try {
      await supabase.from("worker_push_tokens").delete().in("token", staleTokens);
    } catch (_e) { /* non-fatal */ }
  }

  console.log(
    `📲 native push ${source}: attempted=${tokens.length} ok=${succeeded} failed=${failed} stale_removed=${staleTokens.length}`,
  );

  return {
    configured: true,
    attempted: tokens.length,
    succeeded,
    failed,
    stale_tokens_removed: staleTokens.length,
  };
}
