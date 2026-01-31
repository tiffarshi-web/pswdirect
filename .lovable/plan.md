
# Plan: Archive Orders System

## Summary
Add an "archived" status to bookings that removes orders from the Live Map and Active views while preserving them in a dedicated "Archived Orders" section for record-keeping and auditing.

---

## How It Will Work

**For Admins:**
1. In the Order List and Booking Management sections, you'll see an "Archive" button on past-due or cancelled orders
2. Archived orders disappear from the Live Map and Active Shifts views
3. A new "Archived" tab in Order List shows all historical records
4. You can bulk-archive all past-due incomplete orders with one click
5. Archived orders can be restored if needed

**What Gets Hidden:**
- Live Map: Archived orders won't appear as markers
- Active Shifts: Archived orders won't show in the active list
- Order List: By default, archived orders are filtered out (but visible in the Archived tab)

**What's Preserved:**
- Full order history in the Archived tab
- All client details, PSW assignment, payment info
- Searchable by Order ID anytime
- Revenue still counts in statistics (with optional filter)

---

## Implementation Steps

### 1. Add "archived" Status Support

**Update BookingStatusIcon.tsx:**
- Add visual indicator for archived status (gray/muted styling)

### 2. Update Live Map Filtering

**Modify ActiveShiftsMapView.tsx:**
- Add `status !== 'archived'` to the query filter
- Archived bookings won't appear on the map

### 3. Update Active Shifts Section

**Modify ActiveShiftsSection.tsx:**
- Filter out archived bookings from the active view

### 4. Add Archive Actions to Order List

**Modify OrderListSection.tsx:**
- Add "Archive" button with archive icon to each order row
- Add "Archive Past Due" bulk action button
- Add "Archived" filter tab to view archived orders
- Add "Restore" option for archived orders

### 5. Add Archive Functions to Booking Store

**Modify bookingStore.ts:**
- Add `archiveBooking(id)` function
- Add `restoreBooking(id)` function
- Add `archivePastDueBookings()` bulk function

---

## UI Preview

**Order Row Actions:**
```text
[View] [Archive] (for past-due/cancelled orders)
```

**Bulk Actions Bar:**
```text
[Archive Past Due Orders] - Archives X orders from before today that aren't completed
```

**Order List Tabs:**
```text
[ Daily | Weekly | Monthly | Yearly | Archived ]
```

---

## Technical Details

**Files to Modify:**
1. `src/components/ui/BookingStatusIcon.tsx` - Add archived status styling
2. `src/components/admin/ActiveShiftsMapView.tsx` - Exclude archived from map
3. `src/components/admin/OrderListSection.tsx` - Add archive UI and filters
4. `src/lib/bookingStore.ts` - Add archive/restore functions

**Database Changes:**
- No schema changes needed - "archived" is just another status value
- The existing `status` column can store "archived"

**Query Updates:**
- Live Map: Add `.not('status', 'eq', 'archived')` or exclude from status array
- Active Shifts: Same exclusion filter

**Archive Criteria:**
- Orders with scheduled_date in the past AND status is NOT "completed"
- Cancelled orders (can be archived immediately)
- Manual archive by admin (any order except in-progress)

---

## Safety Features
- Cannot archive "in-progress" orders (active care)
- Confirmation dialog before bulk archive
- Restore capability for accidentally archived orders
- Order ID search still finds archived orders (with "Archived" badge)
