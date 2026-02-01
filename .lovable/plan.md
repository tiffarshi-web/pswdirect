

# Add Magic Link Login for Admin Portal

## Problem Summary
The admin account exists and has a confirmed email, but the password-based login is failing with "Invalid credentials." This indicates the password may have been changed or corrupted. Adding a magic link login option will provide a password-free way to access the admin portal.

## Solution

Add a "Sign in with Magic Link" button to the Office Login page that sends a one-time login link to the admin's email. This bypasses password authentication entirely.

---

## Implementation

### File: `src/pages/OfficeLogin.tsx`

**Changes:**

1. Add new view type `"magic-link"` to the `LoginView` type
2. Add state for magic link email sent confirmation
3. Create `handleMagicLink` function that calls `supabase.auth.signInWithOtp()`
4. Add a "Sign in with Magic Link" button below the password login form
5. Create a new view for magic link sent confirmation
6. Handle the magic link callback via `onAuthStateChange`

**New UI Flow:**

```text
+-------------------+
|   Login Form      |
|   [Email]         |
|   [Password]      |
|   [Login Button]  |
|                   |
|   ─── or ───      |
|                   |
| [Magic Link Btn]  |  <-- New button
+-------------------+
        |
        v (click magic link)
+-------------------+
| Magic Link Sent   |
| Check your email  |
| [Back to Login]   |
+-------------------+
        |
        v (click email link)
+-------------------+
| Auth callback     |
| Auto-redirect to  |
| /admin            |
+-------------------+
```

**Key Code:**

```typescript
const handleMagicLink = async () => {
  const emailLower = email.toLowerCase().trim();
  
  // Only allow magic link for master admin as emergency access
  if (emailLower !== MASTER_ADMIN_EMAIL.toLowerCase()) {
    setError("Magic link login is only available for authorized admins.");
    return;
  }
  
  const { error } = await supabase.auth.signInWithOtp({
    email: emailLower,
    options: {
      emailRedirectTo: `${window.location.origin}/office-login`,
    },
  });
  
  if (error) {
    setError("Failed to send magic link. Please try again.");
    return;
  }
  
  setMagicLinkSent(true);
};
```

**Auth Callback Handler:**

The existing `onAuthStateChange` listener in `AuthContext.tsx` will automatically pick up the magic link sign-in and populate the user context with the admin role (thanks to the master admin bypass already in place).

---

## Security Considerations

- Magic link login will be restricted to the master admin email (`tiffarshi@gmail.com`) as an emergency recovery mechanism
- Regular admins should continue using password-based authentication
- The magic link expires after a short time (typically 1 hour)
- Each magic link can only be used once

---

## Expected Behavior After Fix

1. Go to `/office-login`
2. Enter email: `tiffarshi@gmail.com`
3. Click "Sign in with Magic Link"
4. Check email for login link
5. Click link in email
6. Automatically redirected to `/admin` and logged in
7. Session persists across refreshes

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/OfficeLogin.tsx` | Add magic link button, handler, and confirmation view |

No database changes required - magic links use existing Supabase Auth infrastructure.

