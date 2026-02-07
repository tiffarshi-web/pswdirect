
# End-to-End QA Test Plan for PSA Direct Platform

## Overview
This comprehensive QA test plan covers all critical workflows for the PSA Direct home care platform before live deployment. The plan ensures all systems function correctly while preventing real financial transactions.

---

## Pre-Test Configuration

### Payment Safety Controls
Before testing, the following must be configured:

1. **Stripe Test Mode Activation**
   - Navigate to Admin Portal > Stripe Settings
   - Toggle Payment Mode to "TEST" (purple indicator)
   - This sets `stripe_dry_run = true` in localStorage
   - **Note**: On production domain (psadirect.ca), this toggle is locked to LIVE mode

2. **Edge Function Behavior in Test Mode**
   - The `create-payment-intent` edge function checks `isLiveMode` parameter
   - When `isLiveMode = false`, it returns simulated payment IDs (`pi_test_...`)
   - Test card `4242 4242 4242 4242` will be accepted in test mode
   - Real cards will still work but no actual charges occur

3. **Current System State**
   - Active service radius: 55 km
   - ASAP pricing: Enabled (1.05x multiplier, 60-min lead time)
   - 9 active service tasks configured
   - Pricing configs and rates are properly set

---

## Test 1: PSW Onboarding Flow

### 1.1 Create Test PSW Profile

**Test Steps:**
1. Navigate to `/join-team` (PSW Signup page)
2. Complete Step 1 - Personal Info:
   - First Name: "QA"
   - Last Name: "Tester"
   - Email: Use a valid test email (e.g., qa.tester+psw1@gmail.com)
   - Phone: (416) 555-0100
   - Gender: Select any
   - Password: TestPSW2024!
   - Address: 123 Test Street, Toronto, ON M5V 1A1
   - Upload test profile photo
3. Complete Step 2 - Compliance:
   - HSCPOA Number: 12345678
   - Police Check Date: Recent valid date
   - Transport: "Yes, I have a car"
   - Accept vehicle disclaimer
   - Upload test vehicle photo
4. Complete Step 3 - Languages:
   - Select English + French
5. Complete Step 4 - Banking:
   - Institution: 001
   - Transit: 00001
   - Account: 1234567
6. Accept Terms and Submit

**Expected Results:**
- PSW profile created with `vetting_status = 'pending'`
- Welcome email sent via Resend API
- Profile appears in Admin > Pending PSWs section
- Auth account created in Supabase

**Verification Query:**
```sql
SELECT first_name, last_name, email, vetting_status 
FROM psw_profiles 
WHERE email LIKE 'qa.tester%' 
ORDER BY created_at DESC LIMIT 1;
```

### 1.2 Admin Approval Workflow

**Test Steps:**
1. Login to Admin Portal (tiffarshi@gmail.com)
2. Navigate to "Pending PSWs" section
3. Locate "QA Tester" in pending list
4. Review uploaded documents
5. Click "Approve"
6. Enter approval notes: "QA Test Approval"

**Expected Results:**
- Status changes from `pending` to `approved`
- Audit log entry created in `psw_status_audit` table
- PSW receives approval email with login QR code
- PSW moves to "Active Team" section

### 1.3 Status State Transitions

**Test the following state changes:**
- Pending → Approved ✓
- Approved → Flagged (with mandatory reason)
- Flagged → Approved (reinstate)
- Approved → Deactivated (with mandatory reason)
- Deactivated → Approved (reinstate from archive)
- Pending → Rejected (moved to archive)

---

## Test 2: Client Order Flow

### 2.1 Create Test Client Booking

**Test Steps:**
1. Navigate to Client Portal (`/client`)
2. Login or create test account:
   - Email: qa.client+test@gmail.com
   - Password: TestClient2024!
3. Click "Book Service"
4. Step 1 - Service For:
   - Select "Someone Else"
5. Step 2 - Patient & Address:
   - Patient Name: "Test Patient"
   - Relationship: "Parent"
   - Address: 200 Bay Street, Toronto, ON M5J 2J5
   - (Must be within 55km service radius)
6. Step 3 - Service Details:
   - Select services: Bathing & Personal Hygiene + Meal Preparation
   - Date: Tomorrow
   - Time: 10:00 AM
   - Gender preference: No preference
   - Language preference: English
7. Step 4 - Review:
   - Verify pricing calculation
   - Accept cancellation policy
8. Step 5 - Payment:
   - Verify "TEST MODE" badge appears
   - Enter test card: 4242 4242 4242 4242
   - Expiry: 12/29
   - CVC: 123
   - Submit payment

**Expected Results:**
- Booking created with status `pending`
- Payment intent ID starts with `pi_test_`
- Booking confirmation email sent
- Order appears in Admin > Orders Dashboard
- Order visible in Daily Operations Calendar

**Verification Query:**
```sql
SELECT booking_code, client_name, patient_name, status, 
       payment_status, total, stripe_payment_intent_id
FROM bookings 
WHERE client_email LIKE 'qa.client%'
ORDER BY created_at DESC LIMIT 1;
```

### 2.2 Validate Address Coverage Check

**Test postal codes:**
- Within radius (should pass): M5V 1A1, K8N 2B3
- Outside radius (should fail): V6B 1A1 (Vancouver)
- Invalid format (should fail): XXXXX

---

## Test 3: Admin Approval & Scheduling

### 3.1 Order Dashboard Verification

**Test Steps:**
1. Admin Portal > Booking Management
2. Locate new test booking in "New Bookings" alert
3. Verify all fields display correctly:
   - Booking code format: PSW-XXXXXX
   - Client info
   - Patient info
   - Service types
   - Pricing breakdown
   - Payment status

### 3.2 Assign PSW to Shift

**Test Steps:**
1. Navigate to Admin > Daily Operations
2. Select the booking date
3. Verify order appears in day view
4. Use PSW assignment (manual or via PSW app)

**Alternative - PSW Claims Shift:**
1. Login as test PSW
2. Navigate to "Available Shifts"
3. Locate test booking
4. Click "Claim Shift"
5. Accept agreement

**Expected Results:**
- Booking status changes to `active`
- PSW assigned fields populated
- Client receives "Job Claimed" notification email
- Shift appears in PSW's "Upcoming" tab

---

## Test 4: Shift Execution Lifecycle

### 4.1 Check-In Process

**Test Steps:**
1. Login as test PSW on mobile
2. Navigate to claimed shift
3. When at patient location, click "Check In"
4. Grant location permission
5. Verify geofence validation (within 500m of patient address)

**Expected Results:**
- Shift status: `checked-in`
- Booking status: `in-progress`
- Client receives "PSW Arrived" notification
- Location logged to `location_logs` table
- Timer starts on PSW dashboard

### 4.2 Active Shift Monitoring (Admin)

**Test Steps:**
1. Admin Portal > Active Shifts section
2. Verify PSW location appears on map
3. Check real-time status updates

### 4.3 Sign-Out & Care Sheet

**Test Steps:**
1. As PSW, click "Complete Shift"
2. Fill care sheet:
   - Mood on arrival: Content
   - Tasks completed: Select all performed
   - Observations: "Test observation notes"
   - Mood on departure: Happy
3. Submit care sheet

**Expected Results:**
- Shift status: `completed`
- Booking status: `completed`
- Care sheet data saved to booking record
- Care sheet email sent to client
- Payroll entry auto-created

### 4.4 Overtime Scenario (Optional)

**Test Steps:**
1. Create booking with short duration (30 mins)
2. Sign out 20+ minutes after scheduled end

**Expected Results:**
- `flaggedForOvertime = true`
- `overtime_minutes` calculated correctly
- In test mode: No actual charge
- Overtime notification email sent

---

## Test 5: Post-Completion Automation

### 5.1 Payroll Entry Creation

**Verification Query:**
```sql
SELECT pe.psw_name, pe.shift_id, pe.hours_worked, 
       pe.hourly_rate, pe.total_owed, pe.status
FROM payroll_entries pe
ORDER BY created_at DESC LIMIT 5;
```

**Expected:**
- Entry created with `status = 'pending'`
- Hours calculated from check-in to sign-out
- Rate matches task type (standard/hospital/doctor)

### 5.2 Accounting Vault Entry

**Test Steps:**
1. Admin Portal > Accounting Vault
2. Set date filter to include test booking date
3. Verify entry appears in ledger

**Expected Fields:**
- Gross amount matches booking total
- HST calculated at 13%
- PSW payout from payroll entry
- Platform fee (gross - tax - payout)
- Stripe reference ID (test mode format)

### 5.3 Client Database Update

**Verification:**
- Booking record updated with care sheet
- `care_sheet_submitted_at` timestamp set
- `psw_first_name` populated

---

## Test 6: Pricing & Surge Validation

### 6.1 Standard Pricing Verification

**Test Calculation:**
- Bathing (30 min, $15) + Meal Prep (30 min, $15) = $30 base
- ASAP multiplier if applicable: 1.05x
- HST if applicable: +13%

### 6.2 Surge Scheduling Test

**Test Steps:**
1. Admin Portal > Surge Scheduling
2. Create test rule:
   - Name: "QA Test Surge"
   - Enabled: Yes
   - Multiplier: 1.25 (25% surge)
   - Date range: Today only
   - Time range: 12:00 - 23:59
3. Create booking during surge window
4. Verify pricing shows surge breakdown

**Expected:**
- `surge_amount` field populated
- Total = subtotal + surge_amount
- Surge recorded in accounting

### 6.3 Urban (Toronto) Premium Test

**Test Steps:**
1. Create Hospital Discharge booking
2. Use Toronto postal code (M5V...)

**Expected:**
- Urban bonus badge visible
- PSW payout includes $15 urban bonus

---

## Test 7: Notification System Validation

### 7.1 Email Notifications Checklist

| Trigger | Template | Recipient |
|---------|----------|-----------|
| PSW Signup | psw-signup | PSW |
| PSW Approved | psw-approved-with-qr | PSW |
| Booking Confirmed | booking-confirmation | Client |
| Job Claimed | job-claimed | Client |
| PSW Arrived | psw-arrived | Client |
| Care Sheet Delivered | care-sheet-delivery | Client |
| Overtime Adjustment | overtime-adjustment | Client |
| Refund Processed | refund-confirmation | Client |

**Verification:**
- Check `email_logs` table for all sent emails
- Verify sender: admin@psadirect.ca
- Verify Resend API key is active

**Query:**
```sql
SELECT recipient_email, subject, status, created_at
FROM email_logs
ORDER BY created_at DESC LIMIT 20;
```

---

## Test 8: Payment Safety Verification

### 8.1 Test Mode Confirmation

**Checklist:**
- [ ] Stripe Settings shows "TEST" badge (purple)
- [ ] Payment form shows "TEST MODE" indicator
- [ ] Test card 4242... is accepted
- [ ] Payment intent IDs start with `pi_test_`
- [ ] No real Stripe dashboard transactions

### 8.2 Live Mode Blocking (Do NOT test on production)

**Expected Behavior:**
- On production domain, toggle locked to LIVE
- Test cards rejected with error message
- Live key prefix validation (`sk_live_`)

---

## Test 9: Admin Dashboard Verification

### 9.1 Orders Dashboard
- [ ] Daily/Weekly/Monthly/Yearly tabs work
- [ ] Search by Order ID works
- [ ] Status badges display correctly
- [ ] Care sheet viewer opens

### 9.2 Scheduling Calendar
- [ ] Orders appear on correct dates
- [ ] Status indicators (pending/active/completed)
- [ ] PSW assignment visible
- [ ] Manual ping function works

### 9.3 Payroll Dashboard
- [ ] Sync Completed Shifts works
- [ ] Pending vs Cleared tabs
- [ ] Export to CSV functional
- [ ] Per-PSW earnings summary accurate

### 9.4 Accounting Vault
- [ ] Financial summary calculations correct
- [ ] Transaction ledger displays all fields
- [ ] Month/Year folder filter works
- [ ] Export CSV functional
- [ ] Report generator works

### 9.5 PSW Oversight
- [ ] Active team table displays
- [ ] Status badges (Active/Flagged/Deactivated)
- [ ] Status change with mandatory reason
- [ ] Audit log records all changes

---

## Technical Audit Checklist

### Database Integrity
- [ ] All foreign key relationships valid
- [ ] RLS policies enforced (admin-only tables protected)
- [ ] No orphaned records

### Edge Functions
- [ ] send-email: Resend API connected
- [ ] create-payment-intent: Stripe connected
- [ ] charge-overtime: Test mode bypass working
- [ ] process-refund: Test mode bypass working

### Environment Variables
- [ ] VITE_SUPABASE_URL set
- [ ] VITE_SUPABASE_PUBLISHABLE_KEY set
- [ ] STRIPE_SECRET_KEY configured
- [ ] RESEND_API_KEY configured

---

## Expected Test Data Summary

After completing all tests:

| Table | Expected Records |
|-------|-----------------|
| psw_profiles | 1+ test PSW |
| psw_status_audit | 2+ audit entries |
| bookings | 2+ test bookings |
| payroll_entries | 1+ entries |
| email_logs | 10+ emails |
| location_logs | 1+ GPS records |

---

## Pass/Fail Criteria

### Critical (Must Pass)
- PSW signup creates account
- Admin can approve/reject PSWs
- Booking flow completes
- Payment in test mode (no real charges)
- Care sheet submission
- Payroll entry creation
- Email notifications send

### Important (Should Pass)
- Surge pricing calculation
- Overtime detection
- Refund processing (test mode)
- Geographic coverage validation
- Language matching

### Nice-to-Have
- Map visualization
- CSV exports
- Report generation

---

## Recommended Fixes Before Launch

Based on code analysis:

1. **Database Initialization**: The `bookings` and `psw_profiles` tables are currently empty - test data will populate these during QA

2. **Email Delivery**: Verify Resend domain (psadirect.ca) is fully verified with SPF/DKIM/DMARC records

3. **Production Stripe Key**: Ensure `STRIPE_SECRET_KEY` starts with `sk_live_` for production

4. **Netlify Environment Variables**: Confirm `VITE_SUPABASE_PUBLISHABLE_KEY` is set (not `VITE_SUPABASE_ANON_KEY`)

