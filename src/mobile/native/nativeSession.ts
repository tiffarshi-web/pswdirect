import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "./platform";
import { clearAllDrafts } from "./careSheetDraftStore";
import { secureGet, secureRemove, secureSet, secureStoreStatus } from "./secureStore";

/**
 * Session handling for the packaged Worker app.
 *
 * Tokens live ONLY in hardware-backed secure storage (iOS Keychain / Android
 * Keystore-protected encrypted storage) — see `secureStore.ts`. Earlier builds
 * mirrored them into Capacitor Preferences; that copy is migrated once and then
 * deleted. If secure storage is unavailable we keep nothing at all and the
 * worker simply signs in again; we never write a token in the clear.
 *
 * Care-sheet drafts are deliberately NOT cleared when a session merely expires —
 * only on explicit sign-out or account deletion — so unsent work survives.
 */

export const SESSION_KEY = "psw.worker.session";
/** Legacy unencrypted location, migrated and removed on first run. */
export const LEGACY_SESSION_KEY = "psw.worker.session";
const PUSH_TOKEN_KEY = "psw.worker.pushToken";

export interface StoredSession {
  access_token: string;
  refresh_token: string;
  savedAt: string;
  expires_at?: number | null;
}

export type RestoreOutcome = "restored" | "none" | "expired" | "insecure_storage";

export function encodeSession(
  accessToken: string,
  refreshToken: string,
  expiresAt?: number | null,
  now: Date = new Date(),
): string {
  const payload: StoredSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    savedAt: now.toISOString(),
    expires_at: expiresAt ?? null,
  };
  return JSON.stringify(payload);
}

/** Returns null for anything that is not a complete, parseable session. */
export function decodeSession(raw: string | null | undefined): StoredSession | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (typeof parsed?.access_token !== "string" || typeof parsed?.refresh_token !== "string") return null;
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date(0).toISOString(),
      expires_at: typeof parsed.expires_at === "number" ? parsed.expires_at : null,
    };
  } catch {
    return null;
  }
}

/** Access-token expiry only; an expired access token can still be refreshed. */
export function isSessionExpired(session: StoredSession | null, nowMs: number = Date.now()): boolean {
  if (!session?.expires_at) return false;
  return session.expires_at * 1000 <= nowMs;
}

export async function rememberSession(
  accessToken: string,
  refreshToken: string,
  expiresAt?: number | null,
): Promise<boolean> {
  if (!isNativeApp()) return false;
  const stored = await secureSet(SESSION_KEY, encodeSession(accessToken, refreshToken, expiresAt));
  if (!stored) {
    // Secure storage refused the write — keep nothing rather than a clear copy.
    await secureRemove(SESSION_KEY);
  }
  return stored;
}

export async function forgetSession(): Promise<void> {
  await secureRemove(SESSION_KEY);
  try {
    await Preferences.remove({ key: LEGACY_SESSION_KEY });
  } catch {
    /* nothing stored */
  }
}

/**
 * Moves a pre-existing Preferences session into secure storage exactly once.
 * The plaintext copy is always removed afterwards, migrated or not.
 */
export async function migrateLegacySession(): Promise<"migrated" | "none" | "failed"> {
  if (!isNativeApp()) return "none";
  let legacy: string | null = null;
  try {
    legacy = (await Preferences.get({ key: LEGACY_SESSION_KEY })).value;
  } catch {
    return "none";
  }
  if (!legacy) return "none";

  const parsed = decodeSession(legacy);
  let outcome: "migrated" | "failed" = "failed";
  if (parsed) {
    const ok = await secureSet(
      SESSION_KEY,
      encodeSession(parsed.access_token, parsed.refresh_token, parsed.expires_at),
    );
    outcome = ok ? "migrated" : "failed";
  }
  try {
    await Preferences.remove({ key: LEGACY_SESSION_KEY });
  } catch {
    /* best effort */
  }
  return outcome;
}

/** Replays a stored session into Supabase when the WebView has lost it. */
export async function restoreSession(): Promise<RestoreOutcome> {
  if (!isNativeApp()) return "none";

  const { data } = await supabase.auth.getSession();
  if (data.session) return "restored";

  if ((await secureStoreStatus()) !== "ok") {
    await forgetSession();
    return "insecure_storage";
  }

  await migrateLegacySession();

  const parsed = decodeSession(await secureGet(SESSION_KEY));
  if (!parsed) {
    await forgetSession();
    return "none";
  }

  const { error } = await supabase.auth.setSession({
    access_token: parsed.access_token,
    refresh_token: parsed.refresh_token,
  });

  if (error) {
    // Expired refresh token: send the worker to sign-in but keep local drafts.
    await forgetSession();
    return "expired";
  }
  return "restored";
}

/** Full local wipe: sign-out and account deletion. */
export async function clearLocalWorkerData(): Promise<void> {
  await forgetSession();
  await clearAllDrafts();
  await secureRemove(PUSH_TOKEN_KEY);
  try {
    await Preferences.remove({ key: PUSH_TOKEN_KEY });
  } catch {
    /* nothing stored */
  }
}

/** Keeps the secure copy in step with Supabase's own auth events. */
export function attachSessionMirror(): () => void {
  if (!isNativeApp()) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      void clearLocalWorkerData();
      return;
    }
    if (session?.access_token && session.refresh_token) {
      void rememberSession(session.access_token, session.refresh_token, session.expires_at ?? null);
    }
  });

  return () => data.subscription.unsubscribe();
}
