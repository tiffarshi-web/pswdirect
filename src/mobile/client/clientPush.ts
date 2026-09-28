import { PushNotifications, type Token, type ActionPerformed } from "@capacitor/push-notifications";
import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, nativePlatform } from "../native/platform";
import { resolveClientNotificationTarget } from "./clientLinks";

/**
 * Native push for the Client app (ca.pswdirect.client). Separate from the
 * website's Progressier push and from the Worker app's tokens. Alerts are sent
 * by the server only after a booking stage is confirmed in the database.
 */
export const CLIENT_APP_VERSION = "1.0.0";
const TOKEN_KEY = "psw.client.pushToken";

export const CLIENT_PUSH_RATIONALE =
  "Turn on notifications to hear when your caregiver is confirmed, on the way, has arrived, and when the care report is ready.";

export async function requestClientPush(): Promise<"granted" | "denied" | "unsupported"> {
  if (!isNativeApp()) return "unsupported";
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
  await Preferences.set({ key: TOKEN_KEY, value: token });
  const { data, error } = await (supabase as any).rpc("register_client_push_token", {
    _token: token,
    _platform: platform,
    _app_version: CLIENT_APP_VERSION,
  });
  return !error && !!(data as { success?: boolean } | null)?.success;
}

export async function unregisterClientPush(): Promise<void> {
  const stored = await Preferences.get({ key: TOKEN_KEY });
  if (stored.value) {
    await (supabase as any).rpc("deactivate_client_push_token", { _token: stored.value });
    await Preferences.remove({ key: TOKEN_KEY });
  }
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
    if (p.receive === "granted") await PushNotifications.register();
  } catch { /* unavailable */ }
  return () => subs.forEach((s) => void s.remove());
}
