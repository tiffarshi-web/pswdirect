

## Progressier Push Notification Integration

### Overview
Add the `PROGRESSIER_API_KEY` as a backend secret and create a push notification edge function. Upon completion, a test notification will be sent to the admin (tiffarshi@gmail.com) to verify functionality.

---

### Phase 1: Add Backend Secret

Store the Progressier API key you provided as a backend secret:
- **Secret Name**: `PROGRESSIER_API_KEY`  
- **Value**: `g0jgimg41wm71sq20h96z6jlj6ooaahyxdf6m2eskl8oexkt`

---

### Phase 2: Create Edge Function

**File**: `supabase/functions/send-push-notification/index.ts`

Creates a new edge function that:
1. Accepts POST requests with notification payload
2. Calls Progressier Push API at `https://api.progressier.com/v1/sendnotification`
3. Supports targeting by email or "all" for broadcast
4. Returns success/failure response

**Request Format**:
```json
{
  "recipient_email": "user@example.com",
  "title": "Notification Title",
  "body": "Notification message content",
  "url": "/optional-deep-link-path"
}
```

---

### Phase 3: Update Configuration

**File**: `supabase/config.toml`

Add the new function configuration:
```toml
[functions.send-push-notification]
verify_jwt = false
```

---

### Phase 4: Update Infrastructure Status

**File**: `src/lib/progressierConfig.ts`

Add push notifications to the infrastructure status:
```typescript
pushNotifications: {
  provider: "Progressier",
  status: "connected",
  description: "PROGRESSIER_API_KEY configured",
},
```

---

### Phase 5: Update Admin Gear Box Display

**File**: `src/components/admin/InfrastructureStatusCard.tsx`

Add a new row showing "Push Notifications (Progressier) - Connected" status with a Bell icon.

---

### Phase 6: Test Notification

After deployment, call the edge function to send a test push to admin:
- **Recipient**: tiffarshi@gmail.com
- **Title**: "PSA Direct Push Notifications Active"
- **Body**: "Push notification system is now operational. PSW readiness pings are enabled."
- **URL**: `/admin`

---

### Files Summary

| File | Action |
|------|--------|
| Backend Secret `PROGRESSIER_API_KEY` | Add |
| `supabase/functions/send-push-notification/index.ts` | Create |
| `supabase/config.toml` | Modify (add function config) |
| `src/lib/progressierConfig.ts` | Modify (add push notifications status) |
| `src/components/admin/InfrastructureStatusCard.tsx` | Modify (add push notifications row) |

---

### Prerequisites for Test Notification

For the test notification to be received, ensure:
1. PWA is installed on your device (via psadirect.ca or pswdirect.lovable.app)
2. Notification permissions are granted when prompted
3. The email tiffarshi@gmail.com is registered with Progressier

