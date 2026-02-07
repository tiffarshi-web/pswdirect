
# Domain Configuration Fix - Admin, PSW, and Client Flows

## Problem Summary

There are inconsistent domain references across the codebase. The CNAME file shows `psadirect.ca`, but other parts reference `pswdirect.ca`. This causes invitation emails to use incorrect URLs and CORS issues with email sending.

## Current State Analysis

| File | Current Domain | Issue |
|------|----------------|-------|
| CNAME | `psadirect.ca` | May be intentional - the actual custom domain |
| domainConfig.ts | `psadirect.ca` | Default domain for all frontend URLs |
| invite-admin edge function | `psadirect.ca` | Hardcoded setup URL |
| send-email edge function | `psadirect.ca` | CORS allowlist and default "from" address |
| notificationService.ts | `admin@psadirect.ca` | Admin notification recipient |
| messageTemplates.ts | `admin@psadirect.ca` | Default alert recipient |
| DevMenu.tsx | `psadirect.ca` | Production domain check (only checks one domain) |
| devConfig.ts | `pswdirect.ca`, `psadirect.ca` | Already includes both |

## Clarification Needed

Before proceeding, I need to confirm which domain is the primary production domain:

- **Option A**: `psadirect.ca` (matches CNAME)
- **Option B**: `pswdirect.ca` (matches lovable.app subdomain)
- **Option C**: Both should work (multi-domain support)

## Proposed Changes

### 1. Edge Functions - Add Both Domains to CORS + Update From Address

**`supabase/functions/send-email/index.ts`**
- Add `pswdirect.ca` to ALLOWED_ORIGINS
- Keep default from address as the verified Resend domain

**`supabase/functions/invite-admin/index.ts`**
- Change hardcoded URL to use correct production domain

### 2. Frontend Domain Config

**`src/lib/domainConfig.ts`**
- Update DEFAULT_DOMAIN to match the primary production domain
- Keep localStorage override capability for admin customization

### 3. DevMenu Production Check

**`src/components/dev/DevMenu.tsx`**
- Update production checks to include all production domains (matching devConfig.ts)

### 4. Notification Recipients

**`src/lib/messageTemplates.ts`**
- Update default alert recipient to correct domain

**`src/lib/notificationService.ts`**
- Update hardcoded admin email in `sendJobCompletedAdminNotification`

---

## Technical Implementation

### Files to Modify

1. **`supabase/functions/send-email/index.ts`** (lines 7-11, 179)
   - Add `pswdirect.ca` to ALLOWED_ORIGINS array
   - Ensure from address uses verified Resend domain

2. **`supabase/functions/invite-admin/index.ts`** (line 148, 163)
   - Update setup URL domain
   - Update from address if needed

3. **`src/lib/domainConfig.ts`** (lines 13-16)
   - Update DEFAULT_DOMAIN baseUrl and displayName

4. **`src/components/dev/DevMenu.tsx`** (lines 62, 79)
   - Update isProduction check to match devConfig.ts pattern

5. **`src/lib/messageTemplates.ts`** (line 496)
   - Update default alertRecipients email

6. **`src/lib/notificationService.ts`** (line 300)
   - Update hardcoded admin email in job completion notification

### Domain Strategy

I recommend making `psadirect.ca` the canonical domain (since it matches the CNAME and verified Resend email domain), but ensuring all systems accept requests from both domains.

```text
Primary Domain: psadirect.ca (CNAME, email verification)
Secondary Domain: pswdirect.lovable.app (Lovable preview)
```

### CORS Configuration Update

```typescript
const ALLOWED_ORIGINS = [
  "https://psadirect.ca",
  "https://www.psadirect.ca",
  "https://pswdirect.ca",
  "https://www.pswdirect.ca",
  "https://pswdirect.lovable.app",
  "https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app",
];
```

### Production Domain Detection Update

```typescript
// Match the pattern from devConfig.ts
const PRODUCTION_DOMAINS = ["psadirect.ca", "pswdirect.lovable.app", "pswdirect.ca"];
const isProduction = PRODUCTION_DOMAINS.some(domain => 
  hostname === domain || hostname === `www.${domain}`
);
```

---

## Impact on User Flows

### Admin Invitations
- Emails will contain correct setup URLs pointing to the verified domain
- Recipients clicking links will land on the correct admin setup page

### PSW Approval Emails
- Uses `getDomainConfig()` - will get correct URLs after DEFAULT_DOMAIN is fixed
- QR codes and login links will point to correct domain

### Client Booking Emails
- Uses `getDomainConfig()` - will get correct URLs after DEFAULT_DOMAIN is fixed
- Portal links and install URLs will work correctly

### All Email Sending
- CORS will allow requests from all production domains
- Emails will come from the verified Resend domain (`admin@psadirect.ca`)

---

## Testing Checklist

After implementation:
1. Send admin invitation - verify email link works
2. Approve a PSW - verify approval email links work
3. Create a client booking - verify confirmation email links work
4. Test from both `psadirect.ca` and the Lovable preview URL
