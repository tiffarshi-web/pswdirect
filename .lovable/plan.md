

# Plan: Fix Email API Status & Add Infrastructure Dashboard to Gear Box

## Overview
The Admin Panel currently has fragmented infrastructure status displays with incorrect detection logic. This plan consolidates all integrations (Email, Progressier, Stripe) into a unified "Infrastructure Status" section within the Gear Box tab, with accurate backend status detection.

## Problem Summary
1. **Email status shows incorrect info**: `DevSettingsSection.tsx` checks for `VITE_RESEND_API_KEY` (frontend variable), but the actual key `RESEND_API_KEY` is stored as a backend secret (correct & secure)
2. **Progressier not displayed**: PWA configuration exists but isn't shown anywhere in Admin Panel
3. **No unified infrastructure view**: Status is scattered across multiple settings panels

---

## Implementation Steps

### Step 1: Add Infrastructure Status Card to GearBoxSection
Add a new "Infrastructure & Integrations" card at the top of the Gear Box tab showing:
- **Email (Resend)**: Connected (since RESEND_API_KEY secret exists)
- **Payments (Stripe)**: Connected (since STRIPE_SECRET_KEY secret exists)  
- **PWA (Progressier)**: Display the Progressier App ID and link to dashboard
- **Domain**: Show current configured domain from domainConfig

### Step 2: Fix DevSettingsSection Email Status
Update the status check to show "Connected (Backend Secret)" instead of checking for non-existent frontend variables. Since API keys are managed as secure backend secrets, the UI should reflect that they're properly configured.

### Step 3: Remove Misleading API Key Input
The `APISettingsSection.tsx` has an API key input field that doesn't actually save anywhere meaningful (keys are managed via backend secrets). This should be replaced with a status indicator and link to manage secrets.

---

## Technical Details

### Files to Modify

**1. `src/components/admin/GearBoxSection.tsx`**
Add new Infrastructure Status card at the top:
```text
┌─────────────────────────────────────────────────────┐
│  Infrastructure & Integrations                      │
├─────────────────────────────────────────────────────┤
│  ✓ Email (Resend)         Connected (Backend)      │
│  ✓ Payments (Stripe)      Connected (Backend)      │
│  ✓ PWA (Progressier)      Active                   │
│      App ID: xXf0UWVAPdw78va7cNfF                   │
│      [Open Dashboard]                              │
│  ✓ Domain                 psadirect.ca             │
└─────────────────────────────────────────────────────┘
```

**2. `src/components/admin/DevSettingsSection.tsx`**
- Remove the misleading `hasEmailAPI` check using `VITE_` variables
- Show "Connected via Backend Secret" status
- Simplify to only show production mode toggle

**3. `src/components/admin/APISettingsSection.tsx`**
- Remove the non-functional email API key input
- Keep office number (database-backed)
- Add note that email API is managed via backend secrets

### New Constant
Create a constants file or add to existing config:
```typescript
// Progressier configuration
export const PROGRESSIER_CONFIG = {
  appId: "xXf0UWVAPdw78va7cNfF",
  dashboardUrl: "https://progressier.com/dashboard",
  manifestUrl: "https://progressier.app/xXf0UWVAPdw78va7cNfF/progressier.json"
};
```

---

## UI Layout (Gear Box Tab - After Changes)

```text
┌──────────────────────────────────────────────────────────────┐
│  🔧 Gear Box                                     [Refresh]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─ Infrastructure & Integrations ─────────────────────────┐ │
│  │  ✓ Email (Resend)      Backend Secret Configured        │ │
│  │  ✓ Stripe Payments     Backend Secret Configured        │ │
│  │  ✓ Progressier PWA     App ID: xXf0...cNfF  [Dashboard] │ │
│  │  ✓ Domain              psadirect.ca         [Settings]  │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ QR Code Management ────────────────────────────────────┐ │
│  │  [Clients (12)]  [Caregivers (8)]                       │ │
│  │  ┌────────────────────────────────────────────────────┐ │ │
│  │  │  Search...                                         │ │ │
│  │  ├────────────────────────────────────────────────────┤ │ │
│  │  │  Name    │ Email       │ Phone    │ Actions        │ │ │
│  │  │  John D  │ j@mail.com  │ 555-1234 │ [QR] [Copy]    │ │ │
│  │  └────────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────────┘ │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Benefits
1. **Single source of truth**: All infrastructure status in one place
2. **Accurate status**: No more false "Dev Mode" indicators for properly configured secrets
3. **Progressier visibility**: Admin can see PWA is active and access dashboard
4. **Cleaner settings**: Remove confusing/non-functional API key inputs
5. **Professional appearance**: Unified infrastructure dashboard for the CEO (Tif)

