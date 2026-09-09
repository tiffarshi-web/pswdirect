import { PushNotifications, type Token, type ActionPerformed, type PushNotificationSchema } from "@capacitor/push-notifications";
import { Preferences } from "@capacitor/preferences";
import { Device } from "@capacitor/device";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp, nativePlatform } from "./platform";
import { resolveNotificationTarget } from "./deepLinks";
import { WORKER_APP_VERSION } from "../version";

/**
 * Native push for the PSW Direct Worker app.
 *
 * This is a separate channel from the website's Progressier web push — that
 * system is untouched and keeps working for browser users. Device tokens are
 * registered under this app's own configuration (ca.pswdirect.worker) and are
 * never shared with any other project.
 *
 * Notification copy is written by the server. Lock-screen text must stay free
 * of client names, addresses and health information; only the in-app screen
 * reveals those, and only to the assigned worker.
 */

const TOKEN_KEY = "psw.worker.pushToken";

export type PushPermission = "granted" | "denied" | "prompt" | "unsupported";

export const PUSH_RATIONALE =
  "Turn on notifications so PSW Direct can alert you the moment a new shift near you becomes available, and remind you before an accepted visit starts.";

export async function pushPermissionState(): Promise<PushPermission> {
  if (!isNativeApp()) return "unsupported";
  try {
    const status = await PushNotifications.checkPermissions();
    if (status.receive === "granted") return "granted";
    if (status.receive === "denied") return "denied";
    return "prompt";
  } catch {
    return "unsupported";
  }
}

/** Call only from a deliberate user action, after showing PUSH_RATIONALE. */
export async function requestPushPermission(): Promise<PushPermission> {
  if (!isNativeApp()) return "unsupported";
  try {
    const status = await PushNotifications.requestPermissions();
    if (status.receive !== "granted") return status.receive === "denied" ? "denied" : "prompt";
    await PushNotifications.register();
    return "granted";
  } catch {
    return "unsupported";
  }
}

async function storeToken(token: string): Promise<void> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return;

  const platform = nativePlatform();
  if (platform === "web") return;

  let deviceModel: string | undefined;
  try {
    deviceModel = (await Device.getInfo()).model;
  } catch {
    deviceModel = undefined;
  }

  await Preferences.set({ key: TOKEN_KEY, value: token });

  // Idempotent: the same device token re-registers as a refresh, never a duplicate.
  await supabase
    .from("worker_push_tokens")
    .upsert(
      {
        user_id: userId,
        token,
        platform,
        app_version: WORKER_APP_VERSION,
        device_model: deviceModel,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
}

export async function unregisterPushToken(): Promise<void> {
  const stored = await Preferences.get({ key: TOKEN_KEY });
  if (stored.value) {
    await supabase.from("worker_push_tokens").delete().eq("token", stored.value);
    await Preferences.remove({ key: TOKEN_KEY });
  }
  try {
    if (isNativeApp()) await PushNotifications.removeAllListeners();
  } catch {
    /* nothing registered */
  }
}

export interface PushHandlers {
  /** Foreground delivery — show an in-app banner rather than a system alert. */
  onForeground?: (notification: PushNotificationSchema) => void;
  /** Tapped from background or a terminated app. */
  onOpened?: (path: string) => void;
}

/** Wires listeners. Safe to call once per app start; returns a cleanup function. */
export async function attachPushListeners(handlers: PushHandlers): Promise<() => void> {
  if (!isNativeApp()) return () => undefined;

  const subscriptions = await Promise.all([
    PushNotifications.addListener("registration", (token: Token) => {
      void storeToken(token.value);
    }),
    PushNotifications.addListener("registrationError", () => {
      // Push simply stays unavailable; the app must keep working without it.
    }),
    PushNotifications.addListener("pushNotificationReceived", (notification) => {
      handlers.onForeground?.(notification);
    }),
    PushNotifications.addListener("pushNotificationActionPerformed", (action: ActionPerformed) => {
      const target = resolveNotificationTarget(action.notification?.data as Record<string, unknown> | undefined);
      handlers.onOpened?.(target);
    }),
  ]);

  if ((await pushPermissionState()) === "granted") {
    try {
      await PushNotifications.register();
    } catch {
      /* registration retried on next launch */
    }
  }

  return () => {
    subscriptions.forEach((sub) => {
      void sub.remove();
    });
  };
}
