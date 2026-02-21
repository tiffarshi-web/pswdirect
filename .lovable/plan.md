

# Fix: PSW Signup Not Saving to Database (401 Error on Live Site)

## Root Cause

The PSW "Join Team" signup flow has a critical bug: **all PSW data is saved to the browser's localStorage instead of the database**. This means:

- PSW profiles never reach the `psw_profiles` table
- PSW banking info never reaches the `psw_banking` table
- No `user_roles` entry is created for the PSW role
- The admin panel can never see pending applications
- PSWs cannot log in on any other device

On the live site, this manifests as failures because localStorage data from the signup session is isolated and subsequent operations that expect database records fail.

## The Fix

Rewrite the PSW signup submission (`PSWSignup.tsx`) to persist data to the database instead of localStorage. The flow will be:

1. **Create auth account** (already works)
2. **Upload files to storage** (profile photo, police check, vehicle photo) via the `psw-documents` storage bucket
3. **Insert PSW profile into `psw_profiles` table** using `createPSWProfileInDB`
4. **Insert banking info into `psw_banking` table** via direct Supabase insert
5. **Insert `user_roles` entry** with role `psw` for the new user
6. **Send welcome email** (already works)

## Technical Details

### Files to Modify

**1. `src/pages/PSWSignup.tsx`** (main changes)
- Replace `savePSWProfile()` (localStorage) with database operations
- Replace `savePSWBanking()` (localStorage) with database insert to `psw_banking`
- Add file uploads to the `psw-documents` storage bucket before profile insert
- Add `user_roles` insert for the PSW role
- Use the authenticated session from `signUp` for all database operations

**2. `supabase/config.toml`** (no changes needed - existing config is fine)

### Database Operations During Signup

After `supabase.auth.signUp()` returns a session:

```text
1. Upload profile photo -> psw-documents bucket -> get public URL
2. Upload police check  -> psw-documents bucket -> get public URL  
3. Upload vehicle photo -> psw-documents bucket -> get public URL (if applicable)
4. INSERT into psw_profiles (using public URLs from uploads)
5. INSERT into psw_banking (account, transit, institution numbers)
6. INSERT into user_roles (user_id, role: 'psw')
```

### RLS Compatibility

The existing RLS policies already support this flow:
- `psw_profiles`: "Allow PSW profile application signup" policy allows insert when `email` matches the JWT email
- `psw_banking`: "PSWs can insert their own banking info" policy allows insert when `psw_id` matches their profile
- `user_roles`: "Users can insert own psw role" policy allows insert when `user_id = auth.uid()` and `role = 'psw'`
- `psw-documents` storage bucket: already public

### Edge Case: Email Confirmation

If email confirmation is enabled, `signUp` may not return a session. In that case, we need to handle the file uploads and profile creation differently -- potentially using an edge function with `verify_jwt = false` and the service role key, similar to the pattern already used for other functions.

### Estimated Scope

- ~100 lines changed in `PSWSignup.tsx`
- Possibly 1 new edge function if email confirmation blocks the flow
- No database schema changes needed (all tables already exist)

