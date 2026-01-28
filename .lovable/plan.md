
# Client App Install Prompt After Booking

## Overview
Add a post-booking prompt that encourages clients to install the PSA Direct app (PWA) so they can receive real-time updates about their booking status, including notifications when:
- A PSW accepts their job
- The PSW arrives at their location
- The job is completed

## Current State Analysis
The project already has:
- **PWA infrastructure** via Progressier (integrated in `index.html`)
- **InstallAppBanner component** (`src/components/InstallAppBanner.tsx`) - shows on mobile devices
- **InstallApp page** (`src/pages/InstallApp.tsx`) - full installation instructions at `/install`
- **QR code utilities** for generating install links (`src/lib/qrCodeUtils.ts`)
- **Booking confirmation screen** in `GuestBookingFlow.tsx` (lines 632-739)

Currently, `ClientBookingFlow.tsx` immediately calls `onBack()` after booking success (line 387), with no confirmation screen shown.

---

## Implementation Plan

### 1. Create Install App Prompt Dialog Component
**New File:** `src/components/client/InstallAppPrompt.tsx`

A reusable dialog/modal that appears after booking completion with:
- Friendly messaging about receiving real-time updates
- Platform-specific install instructions (iOS Share button, Android menu)
- Benefits list: "Get notified when your caregiver accepts", "Know when they arrive", "See when care is complete"
- Two buttons: "Install App" (primary) and "Skip for Now" (secondary)
- Option to navigate to the full `/install` page for detailed instructions

### 2. Update GuestBookingFlow Confirmation Screen
**File:** `src/components/client/GuestBookingFlow.tsx`

Modify the booking complete screen (lines 632-739) to include:
- The new `InstallAppPrompt` component
- Show the prompt automatically after the booking confirmation details
- Only show on mobile devices (using same detection logic as `InstallAppBanner`)
- Respect the "already installed" check (standalone mode detection)

### 3. Update ClientBookingFlow to Show Confirmation
**File:** `src/components/client/ClientBookingFlow.tsx`

Currently this flow just calls `onBack()` after success. Changes needed:
- Add `bookingComplete` and `completedBooking` state (similar to GuestBookingFlow)
- Create a confirmation screen with install prompt instead of immediately going back
- Include the same install app prompt for returning clients

### 4. Update InstallApp Page for Client Context
**File:** `src/pages/InstallApp.tsx`

Minor updates:
- Handle `?type=client` query parameter
- Show client-specific messaging ("Get updates on your care booking")
- Change redirect from `/psw-login` to `/client` when type=client

---

## Technical Details

### Platform Detection Logic
Reuse existing pattern from `InstallAppBanner.tsx`:
```text
- iOS detection: /iphone|ipad|ipod/.test(userAgent)
- Android detection: /android/.test(userAgent)
- Standalone check: window.matchMedia('(display-mode: standalone)').matches
```

### Install Prompt Features
The prompt will highlight these notification benefits:
- PSW Accepted: "Know immediately when a caregiver takes your booking"
- PSW Arrived: "Get a ping when your caregiver checks in"  
- Job Completed: "Receive notification when care is complete"

### User Flow
```text
Client Completes Booking
        ↓
Booking Confirmation Screen
        ↓
[If mobile + not installed]
    ↓
Install App Prompt Dialog
    ↓
├── "Install App" → Shows platform instructions
└── "Skip" → Closes prompt, shows dashboard button
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/client/InstallAppPrompt.tsx` | Create | New dialog component for install prompt |
| `src/components/client/GuestBookingFlow.tsx` | Modify | Add install prompt to confirmation screen |
| `src/components/client/ClientBookingFlow.tsx` | Modify | Add confirmation screen with install prompt |
| `src/pages/InstallApp.tsx` | Modify | Handle client-specific context |

---

## UI Preview

The install prompt will appear as a card within the confirmation screen:

```text
┌─────────────────────────────────────┐
│  📱 Stay Connected                  │
│                                     │
│  Install our app to receive         │
│  real-time updates on your care:    │
│                                     │
│  ✓ Ping when caregiver accepts      │
│  ✓ Ping when they arrive            │
│  ✓ Ping when care is complete       │
│                                     │
│  [iOS: Tap Share → Add to Home]     │
│                                     │
│  ┌─────────────────────────────┐    │
│  │      Install App            │    │
│  └─────────────────────────────┘    │
│                                     │
│        Maybe Later                  │
└─────────────────────────────────────┘
```
