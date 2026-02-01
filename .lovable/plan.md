
# Plan: Add Time-Period Earnings Summary to Admin Payroll Dashboard

## Summary
Add time-period based earnings summary cards (Today, This Week, This Month, This Year) to the Admin Payroll Dashboard so you can see at-a-glance totals of PSW payouts by timeframe, similar to the cards added for PSWs in their History tab.

---

## Current State

**Admin Payroll Dashboard currently shows:**
- Pending Payments: Count + total owed
- Cleared Payments: Count + total paid
- Total Processed: Count + all-time total

**What's missing:**
- No breakdown by time period (Today, Week, Month, Year)
- No quick view of recent payout obligations

---

## What Will Be Added

### New Time-Period Summary Section
A 4-card grid showing payouts broken down by timeframe:

| Today | This Week | This Month | This Year |
|-------|-----------|------------|-----------|
| $XXX | $X,XXX | $XX,XXX | $XXX,XXX |
| X entries | X entries | X entries | X entries |
| X hours | X hours | X hours | X hours |

### Card Details
Each card will show:
- Total amount paid/owed for that period
- Number of payroll entries
- Total hours worked
- Color-coded for quick scanning

---

## UI Preview

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Time-Period Payouts                                                     │
├─────────────────┬─────────────────┬─────────────────┬────────────────────┤
│ Today           │ This Week       │ This Month      │ This Year (2026)   │
│ $156.00         │ $1,248.50       │ $4,892.00       │ $28,456.75         │
│ 2 entries       │ 14 entries      │ 52 entries      │ 312 entries        │
│ 6.5 hrs         │ 48.2 hrs        │ 186.5 hrs       │ 1,142.8 hrs        │
└─────────────────┴─────────────────┴─────────────────┴────────────────────┘

┌───────────────────┬───────────────────┬────────────────────┐
│ Pending Payments  │ Cleared Payments  │ Total Processed    │  <-- existing cards
│ 8                 │ 304               │ 312                │
│ $892.50 owed      │ $27,564.25 paid   │ $28,456.75 all time│
└───────────────────┴───────────────────┴────────────────────┘
```

---

## Implementation Steps

### Step 1: Add Time-Period Calculations
Add new `useMemo` hooks in `PayrollDashboardSection.tsx`:
- **todayPayouts**: Entries where `scheduled_date` is today
- **weeklyPayouts**: Entries from the last 7 days
- **monthlyPayouts**: Entries from the 1st of current month
- **yearlyPayouts**: Entries from January 1st of current year

Each calculation returns: `{ total, hours, count }`

### Step 2: Add Time-Period Summary Cards
Insert a new section above the existing status cards with a responsive 2x2 grid:
- Today card: Rose/red theme
- This Week card: Emerald/green theme
- This Month card: Blue theme
- This Year card: Purple theme

### Step 3: Maintain Existing Cards
Keep the current Pending/Cleared/Total Processed cards unchanged below the new time-period section

---

## Technical Details

**File to Modify:**
- `src/components/admin/PayrollDashboardSection.tsx`

**New Calculations:**
```typescript
// Today's payouts
const todayPayouts = useMemo(() => {
  const today = format(new Date(), "yyyy-MM-dd");
  const entries = payrollEntries.filter(e => e.scheduled_date === today);
  return {
    total: entries.reduce((sum, e) => sum + e.total_owed, 0),
    hours: entries.reduce((sum, e) => sum + e.hours_worked, 0),
    count: entries.length
  };
}, [payrollEntries]);

// Weekly payouts (last 7 days)
const weeklyPayouts = useMemo(() => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const entries = payrollEntries.filter(e => new Date(e.scheduled_date) >= weekAgo);
  return { total, hours, count };
}, [payrollEntries]);

// Monthly payouts (current month)
const monthlyPayouts = useMemo(() => {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const entries = payrollEntries.filter(e => new Date(e.scheduled_date) >= monthStart);
  return { total, hours, count };
}, [payrollEntries]);

// Yearly payouts (current year)
const yearlyPayouts = useMemo(() => {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  const entries = payrollEntries.filter(e => new Date(e.scheduled_date) >= yearStart);
  return { total, hours, count };
}, [payrollEntries]);
```

**Card Color Themes:**
- Today: `border-rose-200 bg-rose-50/50` with rose icon
- Weekly: `border-emerald-200 bg-emerald-50/50` with emerald icon
- Monthly: `border-blue-200 bg-blue-50/50` with blue icon
- Yearly: `border-purple-200 bg-purple-50/50` with purple icon

---

## Responsive Design
- Desktop: 4 cards in a row (grid-cols-4)
- Tablet: 2x2 grid (grid-cols-2)
- Mobile: Single column stack

---

## Benefits for Admins
- Quick at-a-glance view of recent payout obligations
- Easy to track daily/weekly payroll trends
- Helps with cash flow planning
- Year-to-date totals for accounting/reporting
