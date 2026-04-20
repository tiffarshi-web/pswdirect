/**
 * Legacy localStorage cleanup
 *
 * The platform previously used a client-side payroll/payout/shift store backed
 * by localStorage. All of that data now lives in the database and is the
 * single source of truth. Stale localStorage entries from the old store can
 * still display incorrect totals (e.g. ghost payouts like -$450 / $150 for
 * caregivers who have never worked a shift).
 *
 * This utility purges those legacy keys exactly once per browser, gated by a
 * sentinel key so the cleanup runs cheaply on every load after the first.
 *
 * Safe to call from any PSW-authenticated entry point (e.g. PSWDashboard).
 * It does NOT touch auth tokens, Supabase session, or any unrelated keys.
 */

const SENTINEL_KEY = "pswdirect_legacy_purge_v1";

// Exact legacy keys known to have been written by the old payroll/shift store.
const LEGACY_EXACT_KEYS = [
  "pswdirect_shifts",
  "pswdirect_payroll",
  "pswdirect_payroll_entries",
  "pswdirect_payout_requests",
  "pswdirect_payouts",
  "pswdirect_earnings",
];

// Prefix patterns covering per-PSW cached payroll/payout/earnings/shift records.
const LEGACY_PREFIXES = [
  "psw_payroll_",
  "psw_payout_",
  "psw_earnings_",
  "psw_shifts_",
  "payout_request_",
  "payroll_entry_",
];

export function purgeLegacyPayrollLocalStorage(): void {
  if (typeof window === "undefined") return;

  try {
    if (localStorage.getItem(SENTINEL_KEY)) return;

    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (LEGACY_EXACT_KEYS.includes(key)) {
        toRemove.push(key);
        continue;
      }
      if (LEGACY_PREFIXES.some((p) => key.startsWith(p))) {
        toRemove.push(key);
      }
    }

    toRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch {
        // ignore individual key failures
      }
    });

    localStorage.setItem(SENTINEL_KEY, new Date().toISOString());

    if (toRemove.length > 0) {
      console.info(
        `[legacy-cleanup] Purged ${toRemove.length} legacy payroll/shift localStorage key(s).`
      );
    }
  } catch (err) {
    // localStorage can throw in private mode; never block the app on cleanup.
    console.warn("[legacy-cleanup] Skipped:", err);
  }
}
