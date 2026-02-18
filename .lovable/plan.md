
# Production Launch Fix: Invalid API Key Error

## Problem Summary
PSW signup on the **live production site** fails with "Invalid API Key" error. Investigation confirms the preview environment works correctly but the production site is running outdated code.

## Root Cause
The production site has not been republished with:
1. The latest Supabase client configuration
2. The database persistence fixes (replacing localStorage with Supabase writes)
3. Current environment variable bindings

## Solution

### Step 1: Verify Environment Variables Before Publish
Before publishing, confirm the production build will include:
- `VITE_SUPABASE_URL` = `https://pavibobervhqkfzwkotw.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = the correct anon key

### Step 2: Publish Latest Code
Deploy the current codebase to production, which includes:
- PSW signup writing directly to `psw_profiles` table
- Banking info writing to `psw_banking` table
- Correct Supabase client initialization

### Step 3: Post-Publish Verification
1. Navigate to production PSW signup (`psadirect.ca/psw-signup` or `pswdirect.lovable.app/psw-signup`)
2. Complete a test signup with valid data
3. Verify console shows success logs:
   - "PSW auth account created"
   - "PSW profile saved to database"
   - "PSW banking info saved to database"
4. Check database for the new record

## Technical Details

### Files Updated in Recent Session
| File | Change |
|------|--------|
| `src/pages/PSWSignup.tsx` | Replaced localStorage with `createPSWProfileInDB()` and direct Supabase insert for banking |
| `src/lib/pswDatabaseStore.ts` | New database store with proper Supabase operations |

### Current RLS Configuration (Verified Working)
```text
Policy: "Anyone can create a PSW profile application"
Command: INSERT
Roles: public
WITH CHECK: true
```

### Expected Behavior After Fix
1. User submits PSW signup form
2. `supabase.auth.signUp()` creates auth account
3. `createPSWProfileInDB()` inserts profile to `psw_profiles`
4. Banking info inserts to `psw_banking`
5. Welcome email sends via edge function
6. User sees success screen

## Action Required
**Publish the latest changes** using the Lovable "Publish" button to deploy the fixed code to production.
