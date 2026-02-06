
# Plan: Add Overtime Visibility & Tracking Across Admin & Client Views

## Overview
Add visible overtime indicators to both the Admin Order List and Client Order views so administrators and clients can clearly see when a booking has required overtime charges, including the charge breakdown and Stripe reference ID. This ensures full transparency of the additional fee and maintains a complete audit trail.

## Current State Analysis

### Where Overtime Data Flows
1. **PSW Sign-Out** (`shiftStore.ts`): When a PSW signs out 15+ minutes after scheduled end time, `flaggedForOvertime` is set to true
2. **Edge Function** (`charge-overtime`): Calculates the charge based on the grace period logic and processes Stripe payment
3. **Database Update** (`bookings` table):
   - `payment_status` → `"overtime_adjusted"`
   - `total` → increased by surcharge amount
4. **Payroll Update** (`payroll_entries` table):
   - `status` → `"overtime_adjusted"`
   - `surcharge_applied` → amount paid to PSW
5. **Stripe Reference**: The `payment_intent_id` from the charge is returned but NOT stored in the booking record

### Current Visibility Gaps

| Location | Current Display | Missing |
|----------|-----------------|---------|
| Admin Order List | Shows total, status, PSW | No overtime badge, no surcharge breakdown, no charge timestamp |
| Client Past Services | Shows total, time | No overtime notification, no surcharge shown separately |
| Accounting Dashboard | Shows final totals | Overtime entries are mingled with regular service data |

## Proposed Implementation

### 1. Database Schema Enhancement
Add two new fields to `bookings` table:
- `overtime_minutes` (integer): Actual minutes worked over scheduled time
- `overtime_payment_intent_id` (text): Stripe PaymentIntent ID for the overtime charge

This allows:
- Full transparency of exactly how much overtime was worked
- Direct link to Stripe for audit purposes
- Ability to filter/search overtime bookings

### 2. Admin Order List Updates (`OrderListSection.tsx`)

**New Badge System:**
Add an "⏱️ Overtime Charged" badge to the order row when `payment_status = 'overtime_adjusted'`

Badge styling:
- Background: orange/amber (warning color)
- Icon: Clock or Zap icon
- Hover tooltip showing: "X minutes overtime | Charged for Y minutes | Amount: $Z | Stripe ID: [reference]"

**New Filter Option:**
Add to the timeFilter/viewMode options:
- "Overtime Only" - Shows only bookings with `payment_status = 'overtime_adjusted'`
- Summary card: "X orders had overtime charges | Total overtime revenue: $Y"

**Table Enhancement:**
In the order details row, add a new "Overtime" column showing:
- Actual minutes worked over scheduled end time
- Amount charged (e.g., "$17.50 for 30-min block")
- Stripe transaction ID (truncated, clickable for full ID in tooltip)

### 3. Client Order View Updates (`PastServicesSection.tsx`)

**Overtime Banner:**
If a completed service had overtime:
```
⏱️ Extended Service Notice
This service ran +X minutes past the scheduled time.
An additional charge of $Z was applied to your account for the extended time.
```

**Pricing Breakdown:**
Expand the service card to show:
- Base Service: $X
- Overtime Adjustment: +$Y (if applicable)
- Tax (if applicable): +$Z
- **Total Charged: $FINAL**

**Stripe Confirmation:**
Add a "Payment Details" section showing:
- Stripe reference ID
- Original charge timestamp
- If multiple charges (base + overtime): list both

### 4. Charge-Overtime Edge Function Update

Modify the function to return the overtime payment intent ID:
```typescript
// Already returns this, but ensure it's saved to bookings:
const result = {
  success: true,
  charged: true,
  paymentIntentId: paymentIntent.id,  // ← This needs to go to bookings
  overtimeMinutes,
  billableMinutes,
  chargeAmount: chargeAmount / 100,
};
```

Then update the Supabase query to save:
```typescript
await supabase
  .from("bookings")
  .update({
    total: newTotal,
    payment_status: "overtime_adjusted",
    overtime_minutes: overtimeMinutes,        // ← New
    overtime_payment_intent_id: paymentIntent.id,  // ← New
  })
  .eq("booking_code", bookingId);
```

### 5. Admin Overtime Management View

**Existing:** `OvertimeBillingSection.tsx` shows payroll entries with `status = 'overtime_adjusted'`

**Enhancement:**
- Link payroll entries to their corresponding bookings for cross-reference
- Add "View Client Invoice" button that shows what the client paid
- Add "Verify Stripe Charge" button that opens Stripe dashboard snippet
- Show side-by-side comparison: Client Charged vs PSW Paid

## Technical Implementation Details

### Files to Modify

| File | Change | Impact |
|------|--------|--------|
| `supabase/migrations/[date]_add_overtime_tracking.sql` | Add `overtime_minutes` and `overtime_payment_intent_id` to bookings | Database schema |
| `supabase/functions/charge-overtime/index.ts` | Save overtime IDs to bookings table | Backend tracking |
| `src/components/admin/OrderListSection.tsx` | Add overtime badge, filter, and details column | Admin visibility |
| `src/components/client/PastServicesSection.tsx` | Add overtime banner and pricing breakdown | Client transparency |
| `src/components/admin/OvertimeBillingSection.tsx` | Link to bookings, add verification tools | Admin oversight |
| `src/components/ui/BookingStatusIcon.tsx` | Add "overtime_adjusted" status icon | Visual consistency |
| `src/integrations/supabase/types.ts` | Auto-updated by migration | Type safety |

### Data Flow Diagram

```
PSW Signs Out (15+ mins late)
        ↓
shiftStore.signOutFromShift()
        ↓
flaggedForOvertime = true
        ↓
charge-overtime edge function
        ↓
Calculate charge + Process Stripe
        ↓
Save to bookings:
  - payment_status: "overtime_adjusted"
  - total: updated amount
  - overtime_minutes: ← NEW
  - overtime_payment_intent_id: ← NEW
        ↓
Admin sees badge in order list
Client sees breakdown in past services
```

## Security & Privacy Considerations

- Stripe PaymentIntent IDs are internal references; safe to store and display
- Client sees only the amount charged, not the PSW's payout
- Admin can see full audit trail with Stripe references
- Overtime data persists in accounting vault for 5+ years per existing design

## Testing Checklist

1. Create a test booking with scheduled end time (e.g., 2:00 PM)
2. PSW signs out 20 minutes late (2:20 PM)
3. Verify in Admin Order List:
   - "⏱️ Overtime Charged" badge appears
   - Hover tooltip shows: "20 minutes overtime | Charged for 30 minutes | Amount: $17.50"
4. Verify in Client Past Services:
   - Orange banner shows overtime message
   - Pricing breakdown shows separate overtime line item
5. Verify Stripe reference ID is displayed and matches charge history
6. Filter admin list by "Overtime Only" and confirm only overtime orders appear
7. Check Accounting Dashboard shows overtime entries with proper categorization

## Next Steps Priority

1. **High:** Add database fields via migration
2. **High:** Update charge-overtime edge function to save IDs
3. **Medium:** Update Admin Order List with badge and filter
4. **Medium:** Update Client Past Services with breakdown
5. **Low:** Add Stripe verification tools to admin panel
