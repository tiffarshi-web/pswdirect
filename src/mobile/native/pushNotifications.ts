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

export type RegisterOutcome = "registered" | "unauthenticated" | "rate_limited" | "rejected";

/**
 * Registration goes through a protected server action, never a direct table
 * write: the server binds the device to the signed-in account, revokes the
 * registration if the same handset is later used by a different caregiver,
 * and caps how often a device may re-register.
 */
export async function storeToken(token: string): Promise<RegisterOutcome> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user?.id) return "unauthenticated";

  const platform = nativePlatform();
  if (platform === "web") return "rejected";

  let deviceModel: string | undefined;
  try {
    deviceModel = (await Device.getInfo()).model;
  } catch {
    deviceModel = undefined;
  }

  await Preferences.set({ key: TOKEN_KEY, value: token });

  const { data, error } = await supabase.rpc("register_worker_push_token", {
    _token: token,
    _platform: platform,
    _app_version: WORKER_APP_VERSION,
    _device_model: deviceModel ?? null,
  });
  if (error) return "rejected";

  const result = data as { ok?: boolean; reason?: string } | null;
  if (result?.ok) return "registered";
  if (result?.reason === "rate_limited") return "rate_limited";
  if (result?.reason === "unauthenticated") return "unauthenticated";
  return "rejected";
}

export async function unregisterPushToken(): Promise<void> {
  const stored = await Preferences.get({ key: TOKEN_KEY });
  if (stored.value) {
    // Deactivate, don't delete: the registration history stays auditable and
    // only the signed-in owner's own device can be switched off.
    await supabase.rpc("deactivate_worker_push_token", {
      _token: stored.value,
      _reason: "signed_out",
    });
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
