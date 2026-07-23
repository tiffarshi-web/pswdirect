// Automatic stale-PWA recovery for token-exchange failures.
//
// When Supabase auth token exchange fails with a signature that indicates the
// bundle / service worker is stale (e.g. "Invalid API key", "apikey", "JWT",
// "signature", or a network-level failure against the auth endpoint), we
// force a one-shot cache + service-worker purge and hard reload. After the
// reload the user lands on the login page with a current bundle and can
// sign in normally.
//
// Guarded by sessionStorage so we never loop: at most one auto-recovery per
// tab session.

const GUARD_KEY = "psa_stale_bundle_recovered";

// Only auth/signature errors indicate a genuinely stale bundle.
// We intentionally exclude generic network failures ("failed to fetch",
// "networkerror") — those routinely occur when a PSW is on flaky mobile data
// or briefly offline, and wiping the service worker + caches + auth tokens in
// that situation destroys the installed offline PWA for no reason.
const STALE_SIGNATURES = [
  "invalid api key",
  "apikey",
  "no api key",
  "invalid jwt",
  "jwt expired",
  "jws",
  "signature",
];

export function isStaleBundleAuthError(err: unknown): boolean {
  if (!err) return false;
  // If the browser reports we're offline, this is a connectivity issue, not a
  // stale bundle. Never trigger recovery while offline — the hard reload would
  // itself fail and leave the user on a broken screen.
  if (typeof navigator !== "undefined" && navigator.onLine === false) return false;
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  if (!msg) return false;
  // Never treat "invalid login credentials" as stale — that's a real user error.
  if (msg.includes("invalid login credentials")) return false;
  return STALE_SIGNATURES.some((sig) => msg.includes(sig));
}

/** Returns true if recovery was triggered (caller should stop UI work — a reload is imminent). */
export function recoverFromStaleBundle(reason: string): boolean {
  try {
    if (sessionStorage.getItem(GUARD_KEY)) {
      console.warn("[StaleBundleRecovery] Already recovered this session, not looping.");
      return false;
    }
    sessionStorage.setItem(GUARD_KEY, "1");
  } catch {
    // sessionStorage unavailable — proceed once without guard.
  }

  console.warn(`[StaleBundleRecovery] Triggering stale-bundle recovery (reason: ${reason})`);

  (async () => {
    try {
      // Unregister only same-origin app service workers (not Progressier's push worker).
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const reg of regs) {
          try {
            const scriptUrl =
              reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
            if (!scriptUrl) continue;
            const url = new URL(scriptUrl);
            if (url.origin !== window.location.origin) continue;
            if (!url.pathname.endsWith("/sw.js")) continue;
            await reg.unregister();
          } catch {
            /* ignore individual worker failures */
          }
        }
      }

      // Delete only legacy app caches; leave Progressier / third-party caches alone.
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.allSettled(
          names
            .filter((n) => /(^|-)precache-v\d+-|(^|-)runtime-|^psw-|^psa-/.test(n))
            .map((n) => caches.delete(n)),
        );
      }

      // Clear cached auth tokens so the next boot starts clean.
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-") || k === "psa_app_version" || k === "psa_build_ts")
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
      }
    } catch (e) {
      console.error("[StaleBundleRecovery] cleanup error", e);
    } finally {
      // Hard reload — bypass HTTP cache where supported.
      window.location.reload();
    }
  })();

  return true;
}
