// Single source of truth for PSW approval state.
//
// A PSW is considered "approved" (can use the dashboard) ONLY when the
// database row satisfies all of the following:
//
//   • vetting_status = 'approved'
//   • lifecycle_status != 'banned'  (banned/deactivated are removed)
//   • archived_at is null
//   • banned_at is null
//
// Any other combination is treated as "not approved" (pending screen).
//
// This helper is intentionally strict on the *positive* side and forgiving
// on transient fetch failures — a null profile is treated as "unknown",
// not "not approved". Callers keep the previously known state until the
// next successful fetch, which prevents an approved PSW from being kicked
// to /psw-pending on a network blip or a stale PWA cache.

import { supabase } from "@/integrations/supabase/client";

export type ApprovalCheckResult =
  | { state: "approved"; row: any }
  | { state: "not_approved"; row: any; reason: string }
  | { state: "unknown"; error?: unknown };

const APPROVAL_COLUMNS =
  "id, email, first_name, last_name, vetting_status, lifecycle_status, archived_at, banned_at, approved_at";

/**
 * Fetch the current PSW's row using the auth user id first, then a
 * case-insensitive email fallback. Returns "unknown" on network / RLS
 * errors so callers can retry without flipping the UI to the wrong state.
 */
export async function checkPSWApproval(params: {
  userId?: string | null;
  email?: string | null;
}): Promise<ApprovalCheckResult> {
  const { userId, email } = params;

  const tryClassify = (row: any): ApprovalCheckResult => {
    if (!row) return { state: "unknown" };
    const status = String(row.vetting_status ?? "").toLowerCase();
    const lifecycle = String(row.lifecycle_status ?? "").toLowerCase();
    if (row.banned_at) return { state: "not_approved", row, reason: "banned" };
    if (row.archived_at) return { state: "not_approved", row, reason: "archived" };
    if (lifecycle === "banned" || lifecycle === "deactivated") {
      return { state: "not_approved", row, reason: `lifecycle:${lifecycle}` };
    }
    if (status === "approved") return { state: "approved", row };
    return { state: "not_approved", row, reason: `vetting:${status || "unknown"}` };
  };

  // 1. Try by auth user id (matches psw_profiles.id when it was seeded
  //    from auth.users.id, which is the current convention).
  if (userId) {
    try {
      const { data, error } = await supabase
        .from("psw_profiles")
        .select(APPROVAL_COLUMNS)
        .eq("id", userId)
        .maybeSingle();
      if (error) {
        // fall through to email
        console.warn("[approval] id lookup failed:", error.message);
      } else if (data) {
        return tryClassify(data);
      }
    } catch (e) {
      console.warn("[approval] id lookup threw:", e);
    }
  }

  // 2. Fall back to case-insensitive email match.
  if (email) {
    try {
      const { data, error } = await supabase
        .from("psw_profiles")
        .select(APPROVAL_COLUMNS)
        .ilike("email", email.trim().toLowerCase())
        .maybeSingle();
      if (error) {
        console.warn("[approval] email lookup failed:", error.message);
        return { state: "unknown", error };
      }
      if (data) return tryClassify(data);
    } catch (e) {
      console.warn("[approval] email lookup threw:", e);
      return { state: "unknown", error: e };
    }
  }

  return { state: "unknown" };
}
