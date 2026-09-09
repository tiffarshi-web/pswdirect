import { Preferences } from "@capacitor/preferences";
import { supabase } from "@/integrations/supabase/client";
import { isNativeApp } from "./platform";
import { clearAllDrafts } from "./careSheetDraftStore";

/**
 * Secure session handling for the packaged app.
 *
 * WebView localStorage can be evicted by the OS, so the tokens are mirrored
 * into the app's private Preferences store and replayed on cold start. Drafts
 * are deliberately NOT cleared when a session merely expires — only on an
 * explicit sign-out or account deletion — so unsent care-sheet work survives.
 */

const SESSION_KEY = "psw.worker.session";

interface StoredSession {
  access_token: string;
  refresh_token: string;
  savedAt: string;
}

export async function rememberSession(accessToken: string, refreshToken: string): Promise<void> {
  if (!isNativeApp()) return;
  const payload: StoredSession = {
    access_token: accessToken,
    refresh_token: refreshToken,
    savedAt: new Date().toISOString(),
  };
  await Preferences.set({ key: SESSION_KEY, value: JSON.stringify(payload) });
}

export async function forgetSession(): Promise<void> {
  await Preferences.remove({ key: SESSION_KEY });
}

/** Replays a stored session into Supabase when the WebView has lost it. */
export async function restoreSession(): Promise<"restored" | "none" | "expired"> {
  if (!isNativeApp()) return "none";

  const { data } = await supabase.auth.getSession();
  if (data.session) return "restored";

  const stored = await Preferences.get({ key: SESSION_KEY });
  if (!stored.value) return "none";

  let parsed: StoredSession;
  try {
    parsed = JSON.parse(stored.value) as StoredSession;
  } catch {
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
  try {
    await Preferences.remove({ key: "psw.worker.pushToken" });
  } catch {
    /* nothing stored */
  }
}

/** Keeps the mirrored copy in step with Supabase's own auth events. */
export function attachSessionMirror(): () => void {
  if (!isNativeApp()) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      void clearLocalWorkerData();
      return;
    }
    if (session?.access_token && session.refresh_token) {
      void rememberSession(session.access_token, session.refresh_token);
    }
  });

  return () => data.subscription.unsubscribe();
}
