# Stripe Additional-Charge Repair + Multi-Day Booking — Audit Report and Plan

## Part A — Audit findings (production data, read-only)

### A1. Root cause of the additional-charge failure (confirmed)

Additional charges have **never once succeeded** in production:

| Metric | Count |
|---|---|
| Bookings with a billing adjustment amount | 22 |
| Adjustments that produced a Stripe payment intent | **0** |
| Adjustments with any Stripe status | **0** |

The blocker is `charge-billing-adjustment`, which refuses with `no_saved_card`
whenever `stripe_payment_method_id` is missing. Of 262 paid bookings, only 104
have a saved card — and it is still failing recently (July: 25 of 106).

The reason the card is missing is a short-circuit in the finalize routine
`admin_finalize_paid_booking_from_stripe`:

```text
1. Browser confirms the card with Stripe Elements.
2. The client-side success path writes payment_status='paid' and the
   payment intent id onto the booking.
3. The Stripe webhook arrives moments later carrying the customer id and
   the payment method id.
4. The finalize routine sees "already paid with this same payment intent",
   returns already_finalized, and NEVER writes stripe_customer_id or
   stripe_payment_method_id.
```

So the only bookings that keep a reusable card are those where the webhook
happened to win the race. Everything downstream that needs a card on file
fails: billing adjustments, overtime auto-charge, one-click rebook, admin
"charge saved card".

### A2. Secondary Stripe findings

- `create-payment-intent` trusts the **client-supplied amount** and never
  recomputes it from the booking. It also never adds `parking_fee`, so the
  parking field can only ever be charged through the admin manual-order path
  (there, `create-booking` correctly recomputes the total server-side).
- `parking_fee` has never been used in production (0 bookings > $0).
- Invoices have no parking line; the amount is folded into `total`, so
  subtotal + tax does not reconcile to the total when parking is present.
- The webhook has correct signature verification, duplicate-event guarding,
  unreconciled-payment recovery and failure logging. One event
  (`evt_3TfTcZ…`, 2026-06-06) is still stuck at `received`.
- The webhook does **not** verify that the amount received equals the
  booking total, so a tampered client amount would still finalize.

### A3. Multi-day booking — current state

There is no multi-day capability. `bookings` has `is_recurring` and
`parent_schedule_id` pointing at `recurring_schedules` (3 rows, unused in
practice). There is no visit group, no grouped invoice, no per-visit dispatch,
and no per-visit cancellation. Every booking is a single visit with a single
payment intent and a single invoice.

## Part B — Proposed repair (needs your approval before any change)

### B1. Fix the saved-card loss (highest priority, small change)

Change the finalize routine so the "already finalized" branch still
back-fills `stripe_customer_id`, `stripe_payment_method_id` and the charge id
when they are missing. Then run a one-time backfill that reads the payment
method from Stripe for the ~158 paid bookings that are missing one, so
existing clients become chargeable for adjustments and rebooks.

### B2. Harden the charge path

- Recompute the payment amount server-side in `create-payment-intent` from
  the booking record (including `parking_fee`) and reject client/server
  mismatches instead of trusting the browser.
- Verify amount received against booking total in the webhook and flag
  mismatches for admin review rather than silently finalizing.
- Add a clear admin-facing reason and a "collect a card" action when an
  adjustment cannot be charged, replacing the silent `no_saved_card` error.
- Replay the one stuck webhook event.

### B3. Parking on invoices

Add parking as an explicit non-taxable line on the invoice document and in
the invoice snapshot so subtotal + HST + parking = total.

### B4. Multi-day booking architecture

- New `booking_groups` table: one row per multi-day request, holding client,
  recipient, group total and a single payment intent.
- Each selected date creates a normal `bookings` row linked to the group, so
  dispatch, check-in, care sheets and payroll keep working unchanged per visit.
- One payment upfront for the whole group; one grouped invoice listing each
  visit as a line item.
- Cancelling a single visit refunds that visit's share per the existing
  4-hour policy and leaves the rest of the group intact; cancelling the group
  cancels every remaining visit.
- Booking UI gains a multi-date picker with a per-visit and total price
  breakdown; admin order pipeline shows the group and its visits together.

## Sequencing

B1 and B2 are production incidents and should ship first and separately from
B4, which is a schema-level feature and needs its own migration and QA pass.
