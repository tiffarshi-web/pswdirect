
# Plan: Add Monthly and Yearly Earnings Totals for PSWs

## Summary
Add "This Month" and "This Year" earnings summaries to the PSW History tab, giving PSWs a clear view of their earnings across different time periods. This will also help with tax reporting and income tracking.

---

## Current State

**PSW History Tab shows:**
- This Week: Earnings from the last 7 days
- All-Time: Total earnings across all completed shifts
- List of completed shifts with individual earnings

**What's missing:**
- No monthly earnings total
- No yearly earnings total
- No breakdown by time period

---

## What Will Be Added

### 1. Expanded Earnings Summary Cards
Replace the current 2-card layout with a 4-card grid showing:

| This Week | This Month | This Year | All-Time |
|-----------|------------|-----------|----------|
| $XXX.XX   | $X,XXX.XX  | $XX,XXX.XX| $XX,XXX.XX |
| X shifts  | X shifts   | X shifts  | X shifts |

### 2. Time Period Calculations
New `useMemo` hooks for:
- **monthlyEarnings**: Shifts from the 1st of current month to today
- **yearlyEarnings**: Shifts from January 1st of current year to today

### 3. Visual Enhancements
- Weekly card: Emerald/green theme (existing)
- Monthly card: Blue theme
- Yearly card: Purple theme
- All-Time card: Primary brand color (existing)

---

## UI Preview

```text
┌─────────────────────────────────────────────────────────────┐
│  History                                                    │
│  12 shifts completed                                        │
├──────────────────────────┬──────────────────────────────────┤
│ 📈 This Week             │ 📅 This Month                    │
│ $312.50                  │ $1,847.00                        │
│ 4 shifts                 │ 11 shifts                        │
│ +$45.00 Urban Bonus      │ +$120.00 Urban Bonus             │
├──────────────────────────┼──────────────────────────────────┤
│ 📊 This Year (2026)      │ 💰 All-Time Earnings             │
│ $8,435.75                │ $24,892.50                       │
│ 52 shifts                │ 156 shifts                       │
│ +$890.00 Urban Bonus     │ incl. $2,340.00 urban            │
└──────────────────────────┴──────────────────────────────────┘
```

---

## Implementation Steps

### Step 1: Add Monthly Earnings Calculation
Add a new `useMemo` hook in `PSWHistoryTab.tsx`:
- Get first day of current month
- Filter shifts completed within that range
- Sum base pay and urban bonuses
- Count shifts

### Step 2: Add Yearly Earnings Calculation  
Add another `useMemo` hook:
- Get January 1st of current year
- Filter shifts completed within that range
- Sum base pay and urban bonuses
- Count shifts

### Step 3: Update Card Layout
Reorganize the summary section:
- Use a responsive 2x2 grid on desktop, stack on mobile
- Add "This Month" card with blue styling
- Add "This Year" card with purple styling
- Keep existing Week and All-Time cards

### Step 4: Add Year Label
Include the current year in the "This Year" card header for clarity (e.g., "This Year (2026)")

---

## Technical Details

**File to Modify:**
- `src/components/psw/PSWHistoryTab.tsx`

**New Calculations:**
```typescript
// Monthly earnings (current month)
const monthlyEarnings = useMemo(() => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  
  // Filter and sum shifts from monthStart to now
  // Return: { base, urban, total, shifts }
}, [completedShifts]);

// Yearly earnings (current year)
const yearlyEarnings = useMemo(() => {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);
  
  // Filter and sum shifts from yearStart to now
  // Return: { base, urban, total, shifts }
}, [completedShifts]);
```

**Card Color Themes:**
- Weekly: `border-emerald-200 bg-emerald-50/50` (existing)
- Monthly: `border-blue-200 bg-blue-50/50`
- Yearly: `border-purple-200 bg-purple-50/50`
- All-Time: `border-primary/20 bg-primary/5` (existing)

---

## Responsive Design
- Desktop: 2x2 grid of cards
- Mobile: Single column stack (4 cards)

---

## Optional Admin Enhancement
If desired, a similar yearly breakdown could be added to the Admin Payroll Dashboard to show per-PSW annual earnings, but the primary scope is the PSW-facing History tab.
