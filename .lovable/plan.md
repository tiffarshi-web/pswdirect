
# Allow Existing Users to Register as PSW

## Problem Summary

Your email (`tiffarshi@gmail.com`) already exists in Supabase Auth as an admin account, so the PSW signup form fails at `supabase.auth.signUp()` with "email already in use." The current signup flow doesn't support users who already have an auth account but want to also become a PSW.

---

## Current State

| System | Status |
|--------|--------|
| `auth.users` | ✓ Account exists (created Jan 18) |
| `user_roles` | ✓ Has `admin` role |
| `psw_profiles` | ✗ No PSW profile exists |

---

## Solution Options

### Option A: Quick Fix - Create PSW Profile via Database (Recommended for Testing)

Directly insert your PSW profile into the database and add the PSW role. This is the fastest way to unblock you for Progressier testing.

**Steps:**
1. Insert a record into `psw_profiles` with your details
2. Add a `psw` role to your `user_roles` entry
3. Set `vetting_status = 'approved'` so you can access the dashboard immediately

This requires no code changes - just database operations.

---

### Option B: Update PSW Signup Flow (Long-term Fix)

Modify `PSWSignup.tsx` to handle existing accounts:

1. Before calling `signUp()`, check if email already exists using `signInWithPassword` or a custom lookup
2. If account exists, prompt user to login first OR link to an "Add PSW Profile" flow
3. If account doesn't exist, proceed with normal signup

**Code Changes:**

```
┌─────────────────────────────────────────────────────────────┐
│  PSWSignup.tsx - handleSubmit() modification               │
├─────────────────────────────────────────────────────────────┤
│  1. Try signUp() first                                     │
│  2. If "already registered" error:                         │
│     a. Check if psw_profile exists for this email          │
│     b. If no profile: prompt "Login to add PSW profile"    │
│     c. If profile exists: prompt "Login to continue"       │
│  3. If signUp succeeds: continue normal flow               │
└─────────────────────────────────────────────────────────────┘
```

---

## Recommended Approach

**For immediate testing:** Use Option A to create your PSW profile via database insert. This gets you unblocked in minutes.

**For production:** Implement Option B so existing users (like clients who later want to become PSWs) can add a PSW profile without creating a new auth account.

---

## Implementation Details (Option A - Database Insert)

### Step 1: Create PSW Profile

```sql
INSERT INTO psw_profiles (
  first_name,
  last_name,
  email,
  phone,
  vetting_status,
  applied_at,
  approved_at,
  languages
) VALUES (
  'Tiffany',       -- Update with your first name
  'Admin',         -- Update with your last name  
  'tiffarshi@gmail.com',
  '555-555-5555',  -- Update with your phone
  'approved',
  NOW(),
  NOW(),
  ARRAY['en']
);
```

### Step 2: Add PSW Role

```sql
INSERT INTO user_roles (user_id, role)
VALUES ('8eb12072-0d08-4896-962b-8fb9ddaba3b8', 'psw');
```

---

## Files to Modify (Option B - Long-term)

| File | Change |
|------|--------|
| `src/pages/PSWSignup.tsx` | Update handleSubmit to detect existing accounts and offer login path |
| `src/pages/PSWLogin.tsx` | Add logic to create PSW profile if authenticated user doesn't have one |

---

## Which option would you like?

1. **Option A** - I'll run the database inserts to create your PSW profile immediately
2. **Option B** - I'll modify the signup flow to handle existing accounts gracefully
3. **Both** - Quick fix now via database, plus code changes for production
