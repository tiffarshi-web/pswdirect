import { PushNotifications, type Token, type ActionPerformed } from "@capacitor/push-notifications";
import { secureSet } from "../native/secureStore";
import { CLIENT_PUSH_TOKEN_KEY, clearLocalClientData } from "./clientSession";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, nativePlatform } from "../native/platform";
import { resolveClientNotificationTarget } from "./clientLinks";

/**
 * Native push for the Client app (ca.pswdirect.client). Separate from the
 * website's Progressier push and from the Worker app's tokens. Alerts are sent
 * by the server only after a booking stage is confirmed in the database.
 */
export const CLIENT_APP_VERSION = "1.0.0";

export const CLIENT_PUSH_RATIONALE =
  "Turn on notifications to hear when your caregiver is confirmed, on the way, has arrived, and when the care report is ready.";

/**
 * Android crashes if push registers without Firebase config (google-services.json).
 * CI sets VITE_CLIENT_PUSH_ENABLED=true only when that file is supplied.
 */
export function clientPushConfigured(): boolean {
  if (nativePlatform() !== "android") return true;
  return import.meta.env.VITE_CLIENT_PUSH_ENABLED === "true";
}

export async function requestClientPush(): Promise<"granted" | "denied" | "unsupported"> {
  if (!isNativeApp() || !clientPushConfigured()) return "unsupported";
  try {
    const status = await PushNotifications.requestPermissions();
    if (status.receive !== "granted") return "denied";
    await PushNotifications.register();
    return "granted";
  } catch {
    return "unsupported";
  }
}

export async function storeClientToken(token: string): Promise<boolean> {
  const platform = nativePlatform();
  if (platform === "web") return false;
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  // Device token is a sending credential: kept only in secure storage.
  await secureSet(CLIENT_PUSH_TOKEN_KEY, token);
  const { data, error } = await (supabase as any).rpc("register_client_push_token", {
    _token: token,
    _platform: platform,
    _app_version: CLIENT_APP_VERSION,
  });
  return !error && !!(data as { success?: boolean } | null)?.success;
}

export async function unregisterClientPush(): Promise<void> {
  await clearLocalClientData();
}

export async function attachClientPushListeners(onOpened: (path: string) => void): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;
  const subs = await Promise.all([
    PushNotifications.addListener("registration", (t: Token) => void storeClientToken(t.value)),
    PushNotifications.addListener("registrationError", () => undefined),
    PushNotifications.addListener("pushNotificationActionPerformed", (a: ActionPerformed) =>
      onOpened(resolveClientNotificationTarget(a.notification?.data as Record<string, unknown> | undefined)),
    ),
  ]);
  // Re-register silently if permission was already granted earlier.
  try {
    const p = await PushNotifications.checkPermissions();
    if (p.receive === "granted" && clientPushConfigured()) await PushNotifications.register();
  } catch { /* unavailable */ }
  return () => subs.forEach((s) => void s.remove());
}
