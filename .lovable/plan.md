

# Re-Input API Keys and Fix Password Reset

## What's Happening

The "Forgot Password" flow uses the built-in authentication system's `resetPasswordForEmail()` method. This sends emails through the **default auth email system**, which may not be properly configured to deliver to your inbox. Your custom Resend API key is only used by the `send-email` edge function -- not by the auth system's password reset.

## Plan

### Step 1: Re-input your Resend API key
You'll be prompted to enter your current Resend API key so we can verify it's correct.

### Step 2: Re-input your Progressier API key
You'll be prompted to enter your current Progressier API key.

### Step 3: Fix Password Reset to Use Resend
Instead of relying on the built-in auth email (which may not be delivering), we'll update the password reset flow to:
- Create a **`reset-password`** edge function that generates a secure reset link using the admin API and sends it via your Resend integration
- Update `OfficeLogin.tsx`, `PSWLogin.tsx`, and `ClientLogin.tsx` to call this new edge function instead of `supabase.auth.resetPasswordForEmail()`
- This ensures all password reset emails go through your verified `psadirect.ca` domain on Resend

### Step 4: Quick password reset for your account
As an immediate fix, we'll update the existing `update-user-password` edge function so you can set a new password directly without needing the reset email.

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/reset-password/index.ts` | New edge function: generates reset link via admin API, sends email via Resend |
| `supabase/config.toml` | Add `[functions.reset-password]` with `verify_jwt = false` |
| `src/pages/OfficeLogin.tsx` | Update `handleForgotPassword` to call the new edge function |
| `src/pages/PSWLogin.tsx` | Same update for PSW forgot password flow |
| `src/pages/ClientLogin.tsx` | Same update for client forgot password flow |
| `supabase/functions/update-user-password/index.ts` | Ensure it supports admin-initiated password reset by email |

## How the New Reset Flow Works

```text
User clicks "Forgot Password"
        |
        v
Frontend calls reset-password edge function
        |
        v
Edge function uses Admin API to generate reset link
        |
        v
Edge function sends email via Resend (your verified domain)
        |
        v
User receives email at psadirect.ca branded sender
        |
        v
User clicks link -> redirected to login page with recovery token
```

## Stripe
We'll handle Stripe key re-input last, as you requested.

