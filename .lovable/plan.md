
# Fix Progressier Push Notifications - Implementation Plan

## Problem Summary
The `send-push-notification` edge function returns `{"status": "success"}` but no push notifications are being received. This indicates the Progressier API accepted the request, but it didn't match any Connected Device with a push subscription.

## Root Causes Identified

### 1. Missing User Data Sync
The app does NOT call Progressier's SDK to associate user emails/IDs with their devices. This is **critical** for targeted notifications to work.

**From Progressier docs:** "Connect your user data (e.g. a user ID or user email), then call our Push API in your server-side code to send a push notification to a specific user."

### 2. Uncertain Recipients Format for Broadcast
The documented recipient fields are: `email`, `country`, `os`, `browser`, `language`, `push_subscribed`, `app_installed`, `domain_name`, `install_path`, `push_path`. 

The format `{ users: "all" }` was recommended by Progressier support but is not in their public API documentation. Alternative approaches to try:
- **Omit `recipients` entirely** - May default to all subscribers
- Use `{ push_subscribed: true }` - Target users who have subscribed
- Use empty object `{}` - May mean "all"

### 3. Possible Empty Subscriber List
If no users have allowed push notifications in the app, there are no devices to receive the notification.

---

## Technical Implementation

### Phase 1: Connect User Data to Progressier

Create a utility function to sync user data with Progressier when users log in. Progressier provides a JavaScript SDK that automatically handles device identification.

```text
+-------------------+       Login        +--------------------+
|   User Logs In    |  --------------->  |  Call progressier  |
|   (Client/PSW)    |                    |  .add() method     |
+-------------------+                    +--------------------+
                                                   |
                                                   v
                                         +--------------------+
                                         | Progressier links  |
                                         | email to device ID |
                                         +--------------------+
```

**Files to create/modify:**
1. `src/lib/progressierSync.ts` - New utility for syncing user data
2. `src/contexts/AuthContext.tsx` - Call sync on successful login
3. `src/pages/PSWLogin.tsx` - Ensure sync happens after PSW login
4. `src/pages/ClientLogin.tsx` - Ensure sync happens after Client login

**Implementation in `progressierSync.ts`:**
```typescript
// Connect user data to Progressier for push notification targeting
// Must be called after user authenticates
export const syncUserToProgressier = (email: string, userId?: string) => {
  if (typeof window !== 'undefined' && (window as any).progressier) {
    (window as any).progressier.add({
      email: email,
      id: userId || email,  // Use user ID or email as fallback
    });
    console.log('Progressier: User data synced', { email, userId });
  } else {
    console.warn('Progressier SDK not loaded');
  }
};
```

### Phase 2: Try Alternative Recipients Formats

Update the edge function to test different formats for broadcasting:

**Option A: Omit recipients entirely for broadcast**
```typescript
if (recipient_email && recipient_email !== "all") {
  payload.recipients = { email: recipient_email };
}
// If "all" or no recipient specified, don't include recipients field
// This may default to broadcasting to all subscribers
```

**Option B: Use empty recipients object**
```typescript
if (recipient_email && recipient_email !== "all") {
  payload.recipients = { email: recipient_email };
} else {
  payload.recipients = {};  // Empty object for broadcast
}
```

**Option C: Keep current format but verify via dashboard**
Check the Progressier dashboard Push Notifications section to see if notifications appear with yellow check (no match) or grey check (matched).

### Phase 3: Verify Push Subscription Status

**Manual Verification Steps for User:**
1. Open Progressier Dashboard → Analytics → Connected Devices
2. Check if any devices show "Active" Push Status
3. If empty, no users have allowed notifications yet
4. Use Progressier's built-in testing tool to verify device can receive pushes

### Phase 4: Add Push Notification Prompt

Ensure users are prompted to allow notifications at appropriate moments:
- After PSW approval
- After client booking confirmation  
- In the InstallApp page

Progressier handles the prompt UI automatically when the script is loaded.

---

## Implementation Summary

| Task | File | Changes |
|------|------|---------|
| Create sync utility | `src/lib/progressierSync.ts` | New file - sync user email to Progressier |
| Call sync on auth | `src/contexts/AuthContext.tsx` | Import and call `syncUserToProgressier` after login |
| Try omitting recipients | `supabase/functions/send-push-notification/index.ts` | Remove `recipients` field for broadcast |
| Add console logging | Edge function | Log full API response for debugging |

---

## Verification Steps After Implementation

1. **Deploy edge function changes**
2. **Test user data sync:**
   - Log in as a user
   - Check browser console for "Progressier: User data synced"
   - Verify in Progressier Dashboard → Connected Devices that email appears
3. **Test push notification:**
   - Send broadcast via edge function
   - Check Progressier Dashboard → Push Notifications for status
   - Yellow check = no matching devices
   - Grey check = matched but device didn't show it
   - Green check = delivered
4. **If still not working:**
   - Use Progressier's testing tool at progressier.com/pwa-capabilities/push-notifications
   - Check device notification settings
   - Ensure domains `pswdirect.ca` and `pswdirect.lovable.app` are in Progressier Authorized Domains

---

## Key Insight
The `{"status": "success"}` response only means Progressier received your request - NOT that notifications were delivered. You need to check the Progressier dashboard to see the actual delivery status (yellow/grey/green check icons).
