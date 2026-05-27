## Scope

This builds on what's already in place (sign-in/out flow, `create_payout_request`, `admin_record_manual_payout`, 7-day eligibility, ManualPayoutsSection). I'll **audit the existing flow, fix gaps, and tighten the payout gate so only approved + client-paid shifts qualify**. No historical data will be touched; all changes apply forward.

---

## 1. PSW Sign-in / Sign-out (audit + harden)

Files: `src/components/psw/ActiveShiftTab.tsx`, `PSWActiveTab.tsx`, `src/lib/shiftStore.ts`

- Verify assignment guard: sign-in RPC/check confirms `bookings.psw_assigned = current PSW`.
- Replace any silent GPS failures with a clear toast + retry button (keep soft-fail geofence rule from memory).
- Add idempotency guards: block second check-in if `checked_in_at IS NOT NULL`; block second sign-out if `signed_out_at IS NOT NULL`.
- Auto-flag shifts with `checked_in_at` but no `signed_out_at` after scheduled end + 2h → set `verification_status = 'awaiting_review'`.
- Keep all admin overrides (`admin_override_shift_times`, `ShiftTimeAdjustmentDialog`, unassign, approve/reject) untouched.

## 2. Payout eligibility — tighten the gate

The current `create_payout_request` already excludes `requires_admin_review = true` and 7-day-old shifts. Add two more gates:

- **Approved only**: require `bookings.verification_status IN ('approved','paid')` for the linked booking.
- **Client-paid only**: require `bookings.payment_status = 'paid'` (and not refunded).

Migration: update `create_payout_request` SQL to JOIN bookings and filter on those two fields. Same filter applied to the PSW-side eligible-entries view.

## 3. Payroll/hours display — approved + client-paid only

Files: `src/hooks/usePayoutRequests.ts`, `PayoutStatusCard.tsx`, `PSWEarningsTab.tsx`, admin `PayrollDashboardSection`, `WorkedHoursSection`, `PayoutQueueSection`.

- New helper `isEligibleEntry(entry, booking)` requiring: `status != 'cleared'`, `!requires_admin_review`, booking approved, booking paid, not refunded/cancelled.
- All hour totals + dollar totals beside PSW names use this filter.
- PSW Earnings tab shows 4 status buckets: **Awaiting Approval / Awaiting Client Payment / Eligible / Paid Out**.

## 4. Pre-submit summary (already partially exists)

`PSWEarningsTab` confirmation dialog already lists per-shift date/hours/rate/amount. Add the booking ref (`CDT-######`) column and a status badge per row.

## 5. Admin "Mark Paid" — already complete

`admin_record_manual_payout` already captures paid date, method, note, and locks entries to `status='cleared'` so they can't be re-requested. No change.

## 6. Single source of truth

Document in code: `bookings` is canonical. `payroll_entries` derive from bookings via `upsert_payroll_entry_for_booking`. Payout requests reference `payroll_entries`. Already true — add a section to `ARCHITECTURE.md` clarifying this so it stays that way.

## 7. QA

Manual walkthrough on one PSW + one booking using `supabase--read_query`:
assign → sign in → sign out → approve → confirm client paid → request payout → admin marks paid → confirm shift no longer eligible.

---

## Technical details

**Migration** (`create_payout_request` v3):
```sql
... AND EXISTS (
  SELECT 1 FROM public.bookings b
  WHERE b.id = pe.shift_id::uuid
    AND b.verification_status IN ('approved','paid')
    AND b.payment_status = 'paid'
    AND COALESCE(b.was_refunded,false) = false
    AND b.status = 'completed'
)
```

**Front-end filter**: extend `eligibleEntries` in `usePayoutRequests.ts` to fetch each entry's booking and apply the same filter client-side for the summary UI.

**No changes** to: `admin_record_manual_payout`, `admin_override_shift_times`, payout history tables, historical `payroll_entries.status='cleared'` rows.

Confirm and I'll implement.