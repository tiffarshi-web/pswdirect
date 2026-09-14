# PSW Direct Canada — Security audit and remediation pass (pre-Phase 3)

Date: 2026-09-14. Read-and-remediate pass. Nothing published. No charges, refunds,
payouts, emails or notifications were sent. No production data deleted or reset.

## 1. Breakdown of the 228 warnings

| Severity | Count | Group |
| --- | --- | --- |
| Critical | 2 | Scanner (access control): booking column tampering, caregiver self-approval |
| High | 101 | "Public can execute SECURITY DEFINER function" (signed-out callable) |
| Medium | 124 | "Signed-in users can execute SECURITY DEFINER function" |
| Low / Info | 1 | RLS enabled, no policy (`internal_invoke_tokens`) |
| Informational | 2 | Security definer views (`psw_safe_booking_view`, `psw_public_directory`) |
| False positive | 0 unique | — |
| Duplicates | 223 of 228 | All roll up into the root causes below |

Dependency scan: no high or critical vulnerabilities. Nothing upgraded.

## 2. Unique root causes: 5

1. **Blanket `EXECUTE` to `anon`/`PUBLIC` on every SECURITY DEFINER function** (101 warnings).
   Supabase's default `public` schema grants meant every admin RPC, trigger helper and
   internal job function was callable by signed-out visitors over the Data API.
   Exploitable by anyone on the internet for the functions whose bodies do not
   self-check `is_admin()`; the admin RPCs did self-check, but the surface was wrong.
   *Fixed.*
2. **Blanket `EXECUTE` to `authenticated` on internal/scheduled helpers** (124 warnings, subset fixed).
   Exploitable by any signed-in client or caregiver for maintenance helpers such as
   `delete_psw_cascade`, `_invoke_edge_function`, payroll upsert and VSC cron helpers.
   *Fixed for all internal/cron helpers; admin RPCs intentionally stay callable by
   signed-in users because they verify `is_admin()` in the function body.*
3. **`bookings` INSERT had no column guard** (scanner critical).
   A signed-in client could create a booking row with `payment_status='paid'`,
   arbitrary `total`/`hourly_rate`/`psw_pay_rate`, or `status='completed'` — free service
   and payout manipulation. Update path was already guarded; insert path was not. *Fixed.*
4. **`psw_profiles` INSERT had no restrictive guard** (scanner critical).
   A new caregiver could self-insert with `vetting_status='approved'`,
   `gov_id_status/psw_cert_status='approved'`, `psw_number`, `banned_at=null` — bypassing
   vetting and reaching real clients. *Fixed.*
5. **`internal_invoke_tokens` readable grant + `psw_safe_booking_view` anon grant.**
   RLS with no policy already denied reads, so not exploitable, but the grants were
   unnecessary. *Fixed (defence in depth).*

## 3. Confirmed vulnerabilities (fixed)

- Anonymous execution of administrative and internal database functions (root cause 1).
- Signed-in execution of internal/cron helpers including caregiver cascade delete (root cause 2).
- Client-side booking fabrication / payment-state tampering (root cause 3).
- Caregiver self-approval at sign-up (root cause 4).

## 4. False positives / accepted

- `psw_public_directory` (SECURITY DEFINER view): intentional masked public directory —
  first name, last-name initial, city, approved status only. No contact data, no address.
- `psw_safe_booking_view` (SECURITY DEFINER view): gates rows internally by
  `current_psw_profile_id()`/`is_admin()`; anon grant now removed.
- `internal_invoke_tokens` "RLS enabled, no policy": deliberate — service role only.
- Remaining 86 "signed-in users can execute" warnings: admin RPCs that verify
  `is_admin()` inside the function. Accepted; revoking `authenticated` would lock
  administrators out of the office console (stop condition).

## 5. Medium / Low items documented for a later pass

- Admin RPCs rely on in-body `is_admin()` rather than role-restricted grants. Safe today;
  a future pass could move them into a dedicated schema not exposed by the Data API.
- No server-side rate limiting on edge functions (no platform primitive available).
- Content-Security-Policy headers are not set at the edge for the published site.
- `pricing_settings_public`, `v_psw_coverage_map`, `profiles` are `security_invoker` views —
  correct, no change required.

## 6. Checks performed and unchanged

- **Storage:** both buckets (`psw-documents`, `database_export_16_07_26`) are private.
  No public bucket exists. Caregiver documents are reached through signed URLs with
  per-profile folder policies (`is_own_psw_folder`). Care-sheet photographs are stored
  with the care sheet record, not as guessable public URLs.
- **Stripe:** client-charge only. No transfer, Connect payout or provider withdrawal code
  exists. `AUTOMATIC_PROVIDER_PAYOUTS_ENABLED` remains `false`.
- **Phase 2:** wrong-day correction RPC, immutable `wrong_day_corrections` and
  `provider_earning_status_audit` triggers untouched; all Phase 2 tests pass.
- **Dependencies:** no high/critical vulnerabilities; no upgrades performed.
- **Secrets:** repository scan found no keys; only guard code and test fixtures match.

## 7. Migrations created

- `20260914154309_*.sql` — revoke anon/PUBLIC execute across SECURITY DEFINER functions
  (allowlist: `is_admin`, `has_role`, `is_approved_psw`, `is_qa_psw`,
  `current_psw_profile_id`, `active_service_radius_km`, `dispatch_location_max_age_hours`,
  `get_unserved_order_by_token`); revoke all execute on trigger functions; revoke table
  grants on `internal_invoke_tokens` and anon on `psw_safe_booking_view`.
- `20260914154428_*.sql` — `guard_client_booking_insert` trigger on `bookings`;
  `guard_psw_self_insert` trigger on `psw_profiles`; revoke signed-in execute on 16
  internal/scheduled helpers.

## 8. Result

Scanner warnings: **228 → 97**, all remaining accepted and documented above.
Test suite: 457 passing (30 files), including 12 new hardening tests.
Typecheck, lint on changed files and production build all pass.
