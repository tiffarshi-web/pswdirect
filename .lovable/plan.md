
# Plan: Add Per-PSW Earnings Breakdown with Printable Yearly Reports

## Summary
Add a new "Per-PSW Earnings" section to the Admin Payroll Dashboard that shows individual worker earnings broken down by time period (This Week, This Month, This Year, All-Time), plus the ability to print/export yearly reports for each PSW or all PSWs combined.

---

## Current State

**Admin Payroll Dashboard shows:**
- Aggregate time-period cards (Today, Week, Month, Year) for ALL workers combined
- Pending/Cleared status cards (totals for all)
- Payroll entries table with individual shift payouts

**What's missing:**
- No per-PSW breakdown showing each worker's individual earnings by time period
- No printable yearly earnings report per worker
- No easy way to see how much each specific PSW has earned

---

## What Will Be Added

### 1. Per-PSW Earnings Summary Section
A new expandable section showing each PSW with their earnings breakdown:

```text
┌───────────────────────────────────────────────────────────────────────────┐
│  Per-PSW Earnings Summary                              [Print All Yearly] │
├───────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│  ┌─ John Smith ───────────────────────────────────────────── [Print] ─┐  │
│  │  This Week     This Month     This Year      All-Time              │  │
│  │  $312.50       $1,847.00      $8,435.75      $24,892.50            │  │
│  │  4 shifts      11 shifts      52 shifts      156 shifts            │  │
│  │  12.5 hrs      68.2 hrs       312.5 hrs      986.8 hrs             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌─ Sarah Johnson ────────────────────────────────────────── [Print] ─┐  │
│  │  This Week     This Month     This Year      All-Time              │  │
│  │  $198.00       $892.00        $5,120.00      $12,450.00            │  │
│  │  3 shifts      8 shifts       38 shifts      92 shifts             │  │
│  │  8.0 hrs       35.5 hrs       198.2 hrs      512.4 hrs             │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                           │
└───────────────────────────────────────────────────────────────────────────┘
```

### 2. Individual PSW Print Button
Each PSW card will have a "Print" button that generates a printable yearly earnings report for that specific worker.

### 3. "Print All Yearly Reports" Button
A master button to generate a combined yearly report for all PSWs, useful for end-of-year accounting and tax documentation.

---

## Printable Yearly Report Format

When printed, each PSW report will include:

```text
╔═══════════════════════════════════════════════════════════════════╗
║                    YEARLY EARNINGS REPORT                          ║
║                           2026                                     ║
╠═══════════════════════════════════════════════════════════════════╣
║  PSW Name: John Smith                                              ║
║  PSW ID: abc-123-xyz                                               ║
║  Report Generated: February 1, 2026                                ║
╠═══════════════════════════════════════════════════════════════════╣
║                                                                    ║
║  EARNINGS SUMMARY                                                  ║
║  ─────────────────────────────────────────────────                 ║
║  Total Hours Worked:        312.5 hrs                              ║
║  Total Shifts Completed:    52                                     ║
║  Total Gross Earnings:      $8,435.75                              ║
║                                                                    ║
║  BREAKDOWN BY SHIFT TYPE                                           ║
║  ─────────────────────────────────────────────────                 ║
║  Standard Home Care:   42 shifts   $6,160.00                       ║
║  Hospital Visits:       7 shifts   $1,568.00                       ║
║  Doctor Visits:         3 shifts     $707.75                       ║
║                                                                    ║
║  MONTHLY BREAKDOWN                                                 ║
║  ─────────────────────────────────────────────────                 ║
║  January:    8 shifts    $1,248.00                                 ║
║  February:   (to date)   $312.50                                   ║
║                                                                    ║
╚═══════════════════════════════════════════════════════════════════╝
```

---

## Implementation Steps

### Step 1: Create Per-PSW Earnings Calculation
Add a `useMemo` hook that groups all payroll entries by `psw_id` and calculates:
- Weekly earnings (last 7 days)
- Monthly earnings (current month)
- Yearly earnings (current year)
- All-time earnings

```typescript
const perPswEarnings = useMemo(() => {
  const pswMap = new Map<string, {
    pswId: string;
    pswName: string;
    weekly: { total: number; hours: number; count: number };
    monthly: { total: number; hours: number; count: number };
    yearly: { total: number; hours: number; count: number };
    allTime: { total: number; hours: number; count: number };
    yearlyEntries: PayrollEntry[]; // For detailed report
  }>();
  
  // Group and calculate for each PSW
  payrollEntries.forEach(entry => {
    // ... aggregation logic
  });
  
  return Array.from(pswMap.values()).sort((a, b) => 
    b.yearly.total - a.yearly.total
  );
}, [payrollEntries]);
```

### Step 2: Create Per-PSW Summary Cards UI
Add a new collapsible section with cards for each PSW showing their time-period earnings in a 4-column layout.

### Step 3: Add Individual Print Function
Create a `printPswYearlyReport(pswId)` function that:
- Opens a new print window
- Generates formatted HTML for the yearly report
- Includes monthly breakdown
- Triggers browser print dialog

### Step 4: Add "Print All" Function
Create a `printAllYearlyReports()` function that:
- Generates a combined report for all PSWs
- Each PSW on a separate page (page-break)
- Summary page at the end with totals

### Step 5: Add CSV Export Per-PSW
Enhance the existing CSV export to include:
- Per-PSW yearly summary
- Monthly breakdown per PSW

---

## Technical Details

**File to Modify:**
- `src/components/admin/PayrollDashboardSection.tsx`

**New State/Memos:**
```typescript
// Per-PSW earnings breakdown
const perPswEarnings = useMemo(() => {
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const yearStart = new Date(now.getFullYear(), 0, 1);
  
  // Group entries by PSW
  const pswMap = new Map();
  
  payrollEntries.forEach(entry => {
    const entryDate = new Date(entry.scheduled_date);
    
    if (!pswMap.has(entry.psw_id)) {
      pswMap.set(entry.psw_id, {
        pswId: entry.psw_id,
        pswName: entry.psw_name,
        weekly: { total: 0, hours: 0, count: 0 },
        monthly: { total: 0, hours: 0, count: 0 },
        yearly: { total: 0, hours: 0, count: 0 },
        allTime: { total: 0, hours: 0, count: 0 },
        yearlyEntries: []
      });
    }
    
    const psw = pswMap.get(entry.psw_id);
    
    // All-time
    psw.allTime.total += entry.total_owed;
    psw.allTime.hours += entry.hours_worked;
    psw.allTime.count++;
    
    // Yearly
    if (entryDate >= yearStart) {
      psw.yearly.total += entry.total_owed;
      psw.yearly.hours += entry.hours_worked;
      psw.yearly.count++;
      psw.yearlyEntries.push(entry);
    }
    
    // Monthly
    if (entryDate >= monthStart) {
      psw.monthly.total += entry.total_owed;
      psw.monthly.hours += entry.hours_worked;
      psw.monthly.count++;
    }
    
    // Weekly
    if (entryDate >= weekAgo) {
      psw.weekly.total += entry.total_owed;
      psw.weekly.hours += entry.hours_worked;
      psw.weekly.count++;
    }
  });
  
  return Array.from(pswMap.values())
    .sort((a, b) => b.yearly.total - a.yearly.total);
}, [payrollEntries]);
```

**Print Function:**
```typescript
const printPswYearlyReport = (pswId: string) => {
  const psw = perPswEarnings.find(p => p.pswId === pswId);
  if (!psw) return;
  
  const year = new Date().getFullYear();
  
  // Group yearly entries by month
  const monthlyBreakdown = psw.yearlyEntries.reduce((acc, entry) => {
    const month = format(new Date(entry.scheduled_date), "MMMM");
    if (!acc[month]) acc[month] = { total: 0, hours: 0, count: 0 };
    acc[month].total += entry.total_owed;
    acc[month].hours += entry.hours_worked;
    acc[month].count++;
    return acc;
  }, {});
  
  // Generate HTML and open print window
  const printWindow = window.open('', '_blank');
  printWindow.document.write(`
    <html>
      <head>
        <title>Yearly Report - ${psw.pswName}</title>
        <style>
          /* Print styles */
        </style>
      </head>
      <body>
        <!-- Report content -->
      </body>
    </html>
  `);
  printWindow.print();
};
```

**Card Color Scheme:**
- Weekly: Emerald (green)
- Monthly: Blue
- Yearly: Purple
- All-Time: Primary brand

---

## UI Components

### Per-PSW Card Component
```typescript
const PswEarningsCard = ({ psw, onPrint }) => (
  <Card className="border-l-4 border-l-primary">
    <CardHeader className="pb-2">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <User className="w-5 h-5" />
          {psw.pswName}
        </CardTitle>
        <Button size="sm" variant="outline" onClick={() => onPrint(psw.pswId)}>
          <Printer className="w-4 h-4 mr-1" />
          Print Yearly
        </Button>
      </div>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Weekly */}
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
          <p className="text-xs text-emerald-600">This Week</p>
          <p className="font-bold text-emerald-700">${psw.weekly.total.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">{psw.weekly.count} shifts</p>
        </div>
        {/* Monthly, Yearly, All-Time similarly */}
      </div>
    </CardContent>
  </Card>
);
```

---

## Responsive Design
- Desktop: 4-column earnings grid per PSW card
- Tablet: 2x2 grid
- Mobile: Stack all earnings in single column

---

## New Icons Needed
- `User` - for PSW identification
- `Printer` - for print buttons
- `Users` - for "Print All" button

---

## Benefits for Admins
- See exactly how much each PSW has earned by time period
- Generate printable yearly earnings statements for tax purposes
- Easy comparison of worker productivity/earnings
- One-click yearly reports for end-of-year accounting
