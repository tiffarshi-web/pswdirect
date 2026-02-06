

# Admin Login Recovery Plan

## Problem Summary
The admin login is failing because there are two disconnected authentication systems:
1. **Supabase Auth** - Handles actual email/password authentication (works correctly)
2. **AuthContext** - In-memory React state used by route protection (not persisted, not synced)

When you log in at `/office-login`, Supabase authenticates you successfully, but when you navigate to `/admin` or refresh the page, the AuthContext starts with `user = null`, causing an immediate redirect back to login.

---

## Solution: Sync AuthContext with Supabase Session

### Step 1: Update AuthContext to persist state and sync with Supabase

Modify `src/contexts/AuthContext.tsx` to:
- Initialize from an existing Supabase session on app load
- Listen for Supabase auth state changes
- Verify admin role from the `user_roles` table
- Add loading state to prevent premature redirects

```text
+----------------------------------------+
|     App Loads / Page Refresh           |
+----------------------------------------+
               |
               v
+----------------------------------------+
| Check Supabase Session (getSession)    |
+----------------------------------------+
               |
       Has Session?
      /           \
    Yes            No
     |              |
     v              v
+------------------+  +------------------+
| Fetch user_roles |  | user = null      |
| from database    |  | isLoading = false|
+------------------+  +------------------+
     |
     v
+------------------+
| Populate         |
| AuthContext      |
| with role        |
+------------------+
     |
     v
+------------------+
| isLoading = false|
+------------------+
```

### Step 2: Update AdminRoute to respect loading state

Modify `src/App.tsx` to:
- Show a loading spinner while auth is being verified
- Only redirect after loading is complete

### Step 3: Ensure OfficeLogin triggers session sync

The current login flow already creates a Supabase session. Once AuthContext listens to Supabase, the user will be automatically populated.

---

## Technical Details

### Changes to `src/contexts/AuthContext.tsx`

1. Add `isLoading` state to prevent redirects during initialization
2. Add `useEffect` to check for existing Supabase session on mount
3. Add Supabase `onAuthStateChange` listener
4. For admin logins, verify role exists in `user_roles` table
5. Keep the temporary master admin bypass for `tiffarshi@gmail.com`

### Changes to `src/App.tsx`

1. Update `AdminRoute` to check `isLoading`
2. Show loading spinner while auth is being verified
3. Only redirect to `/office-login` after loading is complete and user is not admin

### No changes needed to:
- `OfficeLogin.tsx` - The Supabase login is already working
- Database - User roles are correctly configured

---

## Expected Behavior After Fix

1. You visit `pswdirect.ca/office-login`
2. Enter email and password
3. Supabase authenticates you
4. AuthContext picks up the session and populates user with admin role
5. You're redirected to `/admin`
6. **On refresh**: AuthContext loads the existing Supabase session and verifies admin role before rendering
7. You stay on `/admin` instead of being kicked out

---

## Risk Mitigation

- The master admin bypass remains in place as a fallback
- Loading states prevent flash of wrong content
- Existing PSW and Client logins continue to work (they use the same pattern)

