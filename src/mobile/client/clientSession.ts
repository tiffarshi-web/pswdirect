import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "../native/platform";
import { secureGet, secureRemove, secureSet, secureStoreStatus } from "../native/secureStore";
import { decodeSession, encodeSession, type RestoreOutcome } from "../native/nativeSession";

/**
 * Client-app session storage — same pattern as the Worker app:
 * tokens are kept only in the Keychain (iOS) / Keystore-backed encrypted
 * storage (Android). Never written in the clear; if secure storage is
 * unavailable the client simply signs in again.
 */
export const CLIENT_SESSION_KEY = "psw.client.session";
export const CLIENT_LEGACY_SESSION_KEY = "psw.client.session";
export const CLIENT_PUSH_TOKEN_KEY = "psw.client.pushToken";

export async function rememberClientSession(access: string, refresh: string, expiresAt?: number | null): Promise<boolean> {
  if (!isNativeApp()) return false;
  const ok = await secureSet(CLIENT_SESSION_KEY, encodeSession(access, refresh, expiresAt));
  if (!ok) await secureRemove(CLIENT_SESSION_KEY);
  return ok;
}

export async function forgetClientSession(): Promise<void> {
  await secureRemove(CLIENT_SESSION_KEY);
  try {
    await Preferences.remove({ key: CLIENT_LEGACY_SESSION_KEY });
  } catch { /* nothing stored */ }
}

/** Moves any plaintext Preferences copy into secure storage once, then deletes it. */
export async function migrateClientLegacyData(): Promise<void> {
  if (!isNativeApp()) return;
  for (const key of [CLIENT_LEGACY_SESSION_KEY, CLIENT_PUSH_TOKEN_KEY]) {
    let legacy: string | null = null;
    try {
      legacy = (await Preferences.get({ key })).value;
    } catch {
      continue;
    }
    if (!legacy) continue;
    if (key === CLIENT_LEGACY_SESSION_KEY) {
      const s = decodeSession(legacy);
      if (s) await secureSet(CLIENT_SESSION_KEY, encodeSession(s.access_token, s.refresh_token, s.expires_at));
    } else {
      await secureSet(CLIENT_PUSH_TOKEN_KEY, legacy);
    }
    try {
      await Preferences.remove({ key });
    } catch { /* best effort */ }
  }
}

export async function restoreClientSession(): Promise<RestoreOutcome> {
  if (!isNativeApp()) return "none";
  const { data } = await supabase.auth.getSession();
  if (data.session) return "restored";
  if ((await secureStoreStatus()) !== "ok") {
    await forgetClientSession();
    return "insecure_storage";
  }
  await migrateClientLegacyData();
  const parsed = decodeSession(await secureGet(CLIENT_SESSION_KEY));
  if (!parsed) {
    await forgetClientSession();
    return "none";
  }
  const { error } = await supabase.auth.setSession({ access_token: parsed.access_token, refresh_token: parsed.refresh_token });
  if (error) {
    await forgetClientSession();
    return "expired";
  }
  return "restored";
}

/** Sign-out wipe: session, device registration on the server, local push token. */
export async function clearLocalClientData(): Promise<void> {
  const token = await secureGet(CLIENT_PUSH_TOKEN_KEY);
  if (token) {
    try {
      await (supabase as any).rpc("deactivate_client_push_token", { _token: token });
    } catch { /* session may already be gone */ }
  }
  await secureRemove(CLIENT_PUSH_TOKEN_KEY);
  await forgetClientSession();
}

export function attachClientSessionMirror(): () => void {
  if (!isNativeApp()) return () => undefined;
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      void clearLocalClientData();
      return;
    }
    if (session?.access_token && session.refresh_token) {
      void rememberClientSession(session.access_token, session.refresh_token, session.expires_at ?? null);
    }
  });
  return () => data.subscription.unsubscribe();
}
