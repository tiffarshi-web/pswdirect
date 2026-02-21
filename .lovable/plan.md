

# Email Edge Function Debugging - Analysis & Fix Plan

## Investigation Summary

### Current Status: **Email Sending is Working**

I tested the `send-email` edge function directly and confirmed it's operational:
- Test email to `test@example.com` - Sent successfully
- Test email to `admin@pswdirect.ca` - Sent successfully  
- Resend API key is configured correctly

### Root Causes of Past Failures

From the `email_logs` table, I found several historical failures:

| Issue | Cause |
|-------|-------|
| Empty recipient emails | Some booking confirmations were called with blank email addresses |
| "Failed to send request to Edge Function" | Network/deployment issues at the time |
| "Edge Function returned non-2xx status code" | Validation failures (likely empty emails) |

---

## Improvements to Implement

### 1. Update CORS Headers (send-email function)

**Problem:** Missing some Supabase-specific headers that can cause issues with certain client configurations.

**Solution:** Update the CORS headers to match the recommended pattern:
```typescript
"Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version"
```

### 2. Add Early Validation Guard

**Problem:** Empty emails are being passed to the edge function, causing failures.

**Solution:** Add explicit empty-string check before the regex validation:
```typescript
if (!to || to.trim() === '' || !subject || !body) {
  return new Response(
    JSON.stringify({ error: "Missing required fields: to, subject, body" }),
    { status: 400, ... }
  );
}
```

### 3. Improve Error Logging

**Problem:** When Resend returns an error, we don't log the full response for debugging.

**Solution:** Add more detailed error logging:
```typescript
if (!res.ok) {
  console.error("Resend API error:", {
    status: res.status,
    response: emailResponse,
    to,
    subject,
    fromAddress
  });
}
```

### 4. Add Frontend Validation (bookingStore)

**Problem:** The booking flow can call email functions with empty/undefined emails.

**Solution:** Add validation before sending confirmation emails:
```typescript
if (!booking.orderingClient.email || !booking.orderingClient.email.includes('@')) {
  console.warn("Cannot send booking confirmation - no valid email provided");
  return bookingCode; // Skip email, don't fail the booking
}
```

---

## Technical Details

### Files to Modify

1. **`supabase/functions/send-email/index.ts`**
   - Update CORS headers
   - Add empty string validation
   - Improve error logging

2. **`src/lib/bookingStore.ts`**
   - Add email validation before calling `sendBookingConfirmationEmail`

### Testing Plan

After implementation:
1. Redeploy the edge function
2. Send test emails through the function directly
3. Create a test booking with a valid email to verify end-to-end flow
4. Check Resend dashboard to confirm delivery

---

## Email Function Architecture

```text
+----------------+     +------------------+     +-------------+
|   Frontend     | --> | send-email       | --> | Resend API  |
| (React App)    |     | (Edge Function)  |     |             |
+----------------+     +------------------+     +-------------+
        |                      |                      |
        v                      v                      v
  supabase.functions    Validates request      Sends via SMTP
     .invoke()          Calls Resend API       Returns email ID
                        Logs to email_logs
```

---

## Expected Outcome

After these fixes:
- Empty email addresses will be caught early with clear error messages
- CORS issues will be eliminated
- Better debugging info in logs for any future issues
- Frontend won't crash if email is missing - it will gracefully skip

