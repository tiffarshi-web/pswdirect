

## PSW Signup Stall - Root Cause and Fix

### Root Cause

The signup stalls because **profile photos and police check files are being inserted as base64 data URLs directly into the `psw_profiles` database row**. A 5MB profile photo becomes ~6.7MB of base64 text, and a 10MB police check becomes ~13MB. The resulting INSERT request body can exceed 20MB, causing the HTTP request to **time out or hang indefinitely** against the PostgREST API gateway.

Evidence:
- Line 404: `profilePhotoUrl: profilePhoto.url` -- this is a full base64 data URL
- Line 407: `policeCheckUrl: policeCheck?.url` -- same issue
- Line 423: `vehiclePhotoUrl: vehiclePhoto?.url` -- same issue
- Network logs show NO INSERT request to `psw_profiles` was ever completed
- The database confirms no `psw_profiles` row was created for the test user

A secondary issue is that `onAuthStateChange` fires immediately after `signUp`, causing `AuthContext` to look up profiles before they exist (logging "No role found"), though this is a cosmetic issue rather than the stall cause.

### Fix

**Use Supabase Storage for file uploads instead of embedding base64 in the database.**

#### 1. Create a Storage Bucket (SQL Migration)

Create a `psw-documents` storage bucket with RLS policies allowing:
- Authenticated users to upload to their own folder (`{userId}/...`)
- Admins to read all files
- PSWs to read their own files
- Public read for profile photos of approved PSWs

#### 2. Update PSWSignup.tsx - Upload Files to Storage First

Before inserting the `psw_profiles` row:
1. Upload profile photo to `psw-documents/{userId}/profile-photo.{ext}`
2. Upload police check to `psw-documents/{userId}/police-check.{ext}`
3. Upload vehicle photo (if any) to `psw-documents/{userId}/vehicle-photo.{ext}`
4. Get back the public/signed URLs from Storage
5. Insert into `psw_profiles` with the **storage URLs** (small strings), not base64

This makes the INSERT payload tiny (a few KB) instead of potentially 20MB+.

#### 3. Fix AuthContext Race Condition

Wrap the `onAuthStateChange` handler so it skips profile lookups during the brief window after `signUp` but before profile insertion. Use `setTimeout(..., 0)` to defer the handler, allowing the signup flow to complete its inserts first.

### Technical Details

#### Files to Change

1. **SQL Migration** - Create storage bucket and policies
2. **`src/pages/PSWSignup.tsx`** - Upload files to Storage before DB insert; store storage URLs instead of base64
3. **`src/lib/pswDatabaseStore.ts`** - No changes needed (it already handles URL strings)
4. **`src/contexts/AuthContext.tsx`** - Defer `handleSupabaseUser` with `setTimeout` in `onAuthStateChange` to avoid race condition

#### Storage Bucket Structure
```text
psw-documents/
  {userId}/
    profile-photo.png
    police-check.pdf
    vehicle-photo.jpg
```

#### Storage RLS Policies
- INSERT: Authenticated users can upload to their own folder (`(bucket_id = 'psw-documents') AND (auth.uid()::text = (storage.foldername(name))[1])`)
- SELECT: Admins can read all; PSWs can read their own folder
- Public access for approved PSW profile photos (handled via signed URLs or a public subfolder)

#### Signup Flow After Fix
1. `supabase.auth.signUp()` -- create auth account
2. `setSession()` -- establish session
3. Upload profile photo to Storage -- get URL
4. Upload police check to Storage -- get URL
5. Upload vehicle photo to Storage (if applicable) -- get URL
6. `INSERT psw_profiles` with storage URLs (small payload, completes quickly)
7. `INSERT user_roles`
8. Save banking info
9. Show success

