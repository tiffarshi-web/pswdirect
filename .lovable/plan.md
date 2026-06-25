## Goal
Reset the PSW app so every PSW sees an empty **History** tab and **$0 earnings** (week / month / year / all-time), while keeping booking records intact for admin/client portals.

## Scope (all PSWs)
- Completed-shift History list → empty
- Earnings widgets (week/month/year/all-time) → $0
- Active shifts / pending claims → untouched
- Client-side and admin order data → untouched
- Stripe / invoices / client billing → untouched

## What the PSW History tab actually reads
`PSWHistoryTab.tsx` calls `getCompletedShiftsAsync(user.id)` from `shiftStore.ts`, which pulls bookings where the PSW is the assigned PSW and status is `completed`. Earnings are computed from `checked_in_at` / `signed_out_at` on those same booking rows.

So "reset to 0" means we must remove the PSW from the historical bookings (and clear the time-clock fields), not delete the bookings themselves.

## Changes (data only — single migration of UPDATE/DELETE statements)

For every booking currently in `completed` status that has a PSW assigned:
1. Null out PSW assignment fields: `assigned_psw_user_id`, `assigned_psw_profile_id`, `assigned_psw_name`, `assigned_psw_photo`, `claimed_at`, plus any PSW-side links.
2. Clear time-clock fields used by the earnings calc: `checked_in_at`, `signed_out_at`, `check_in_lat/lng`, `check_out_lat/lng`, `overtime_minutes`, `payable_minutes_override`.
3. (Booking status stays `completed` so admin/client history is unaffected.)

Wipe PSW-side compensation tables so the Earnings tab and Payouts read 0:
4. `DELETE FROM payout_entry_links` (31 rows)
5. `DELETE FROM payout_requests` (3 rows)
6. `DELETE FROM payouts` (17 rows)
7. `DELETE FROM payroll_entries` (70 rows)
8. `DELETE FROM shift_admin_adjustments`, `shift_time_adjustments` (PSW-side time edits)
9. `DELETE FROM overtime_charges` rows tied to those bookings

No schema changes, no code changes. Bookings, clients, invoices, Stripe data are untouched.

## Confirmations needed before I run this
- Affects **all 9 completed bookings** + **70 payroll entries** + **17 payouts** + **3 payout requests** site-wide.
- **Irreversible** — there's no undo once payroll/payout history is deleted.

Reply "go" to switch to build mode and I'll execute the migration.