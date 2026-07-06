# PSW App — Repair Progress + Linter Warning Audit

## ✅ Completed this cycle

1. **Critical #1 — Vehicle enforcement in `claim_booking`** (migration `20260705175320`). Non-admin claims for transport bookings now require `has_own_transport = true`. Returns `reason: 'vehicle_required'`.
2. **Critical #2 — Self-unassign RPC** (`psw_unassign_booking`). Policy: PSWs may release only when `start_time >= now() + 2h`; increments `psw_profiles.cancel_count`. **Admins can unassign at any time.** `GRANT EXECUTE` to `authenticated` + `service_role`.
3. **High #6 — Dispatch idempotency index** on `dispatch_logs(booking_id, created_at DESC)`.
4. **Legacy shim removed** — `src/components/psw/AvailableShiftsTab.tsx` (verified zero remaining imports before deletion).
5. **High #3 — AuthContext loading race — FIXED** (`src/contexts/AuthContext.tsx`).
   - `roleResolved` flag now gates the fallback timer, so it cannot flip `isLoading=false` while `handleSupabaseUser` is still in flight.
   - Fallback extended 6s → 15s (hard emergency release only).
   - `handleSupabaseUser` awaited before `setIsLoading(false)` in every branch.
   - Result: no more "signed out" flash on slow networks. Regression surface: every portal — please smoke-test PSW / Client / Admin login.

## 📋 Deferred (awaiting investigation & approval)

- **Medium #9 — Payroll adjustment tables** (`shift_admin_adjustments` vs `shift_time_adjustments`). Not touched. Will produce a usage map + consolidation proposal in a separate cycle before any migration.
- **High #4 — Duplicate role/approval logic** (`AuthContext` vs `pswApproval.ts`). Deferred; low urgency now that the loading race is closed.
- **Medium #7, #8, #10 and Low items** — unchanged.

---

## 🔒 Supabase Linter Audit — 171 Findings

**Raw distribution (single scan, no code changes yet):**

| Lint code | Level | Count | What it means |
|---|---|---|---|
| `0010_security_definer_view` | ERROR | **1** | One view is defined with `SECURITY DEFINER`, so it enforces the creator's RLS instead of the caller's. |
| `0028_anon_security_definer_function_executable` | WARN | **83** | `SECURITY DEFINER` functions where `PUBLIC`/`anon` still holds `EXECUTE`. Callable without login. |
| `0029_authenticated_security_definer_function_executable` | WARN | **87** | `SECURITY DEFINER` functions where `authenticated` still holds `EXECUTE`. Callable by any logged-in user. |
| **Total** | | **171** | All in the **SECURITY** category. No PERFORMANCE / RLS-disabled / policy-missing findings. |

### Severity classification (my recommendation, for your approval)

#### 🔴 Critical (fix this cycle) — 1 finding
- **`0010` Security Definer View (×1)**. A view running as its owner bypasses caller RLS. Depending on which view it is, this could expose rows across tenants. **Action:** identify the view, either add explicit RLS-scoped filtering to the underlying query or drop `SECURITY DEFINER` in favour of `security_invoker=true` (Postgres 15+). Needs read of `pg_views` to name the offender before I can size the fix.

#### 🟠 High (audit function-by-function; fix the ones that shouldn't be public) — up to ~30 findings
The 0028 warnings that are genuinely reachable via PostgREST from anon. Candidates that MUST NOT be anon-callable:
- Admin RPCs (`admin_manual_signout`, `admin_reassign_booking`, override RPCs, audit-writing helpers)
- Payroll RPCs (`upsert_payroll_entry_for_booking`, `sync_completed_bookings_to_payroll`, payout allocation)
- Refund / financial mutation RPCs
- Any RPC that writes to `bookings`, `psw_profiles.vetting_status`, `user_roles`

**Action:** for each, `REVOKE EXECUTE ... FROM anon, public;` and grant only to `authenticated` (gated inside by `has_role`) or `service_role` (edge-function only). This is the highest-value slice — I estimate ~20–30 of the 83 fall here; the rest are legitimately public (e.g. `has_role`, geocoding helpers, `get_nearby_psws` if we still want anon to see availability).

#### 🟡 Medium (harden, but not exploitable today) — ~60 findings
0028 + 0029 warnings on functions that are **intended** to be callable but currently rely solely on internal `auth.uid()` / `has_role` gating instead of layered `GRANT`s. Defense in depth:
- Add `REVOKE EXECUTE ... FROM public` even where `authenticated` should keep it, so anon cannot even fingerprint the function surface.
- Add `SET search_path = public` to any `SECURITY DEFINER` function that lacks it (search-path injection hardening).

#### 🟢 Low (informational / accept-and-document) — remaining ~80 findings
0029 warnings on functions where authenticated execution is the **entire point** (e.g. `claim_booking`, `psw_unassign_booking`, `has_role`, notification-read helpers). These are false positives against our design. **Action:** silence with `security--manage_security_finding` per finding once we've confirmed each is intentional, and record the rationale in `@security-memory`.

### Production/perf/maintainability impact

- **Production impact:** low today. Every one of these functions already has internal authorization checks (added during the earlier security-hardening pass). The linter is flagging **layered defense**, not open holes — except for the single `0010` view, which is genuinely worth investigating.
- **Performance:** none. `SECURITY DEFINER` vs `INVOKER` does not affect execution cost.
- **Maintainability:** high. Left alone, this list will grow with every new RPC and drown real signal in noise. Cleaning it once + adopting a "REVOKE from public by default" template gets us back to a scannable list.

### Recommended remediation slices (require your approval per slice)

- **Slice A — Critical only:** identify + fix the single `0010` view. ~1 migration, low risk.
- **Slice B — High:** enumerate all admin / payroll / financial RPCs and revoke anon + public execute. ~1 migration, medium risk (must verify each edge-function still calls via `service_role`).
- **Slice C — Medium:** blanket `REVOKE EXECUTE ... FROM public` on remaining 0028 functions, keep grants for the roles they're designed for. ~1 migration.
- **Slice D — Low:** file `manage_security_finding` ignore entries + update `@security-memory` with the "authenticated RPC + internal `has_role` gating is acceptable" rationale so the scanner stops flagging them.

**No linter fixes have been applied yet.** Awaiting your green-light on which slice(s) to run and in what order. Recommend **A → B → D → C**.

---

## 🚦 Production features that MUST NOT break during any repair

Stripe · Booking · Dispatch · Orders Pipeline · Coverage Map · Payroll · Admin Portal · SEO · Notifications · GPS · Care Sheets · Client Portal.
