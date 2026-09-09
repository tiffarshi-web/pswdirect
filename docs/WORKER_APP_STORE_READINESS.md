# PSW Direct Worker — mobile build and store readiness

Scope: the Canadian PSW Direct project (pswdirect.ca) only. PNS Direct, PSA Direct
and Canadian expansion are out of scope. Ontario remains the only bookable province.

## App identity (do not change)

| Item | Value |
| --- | --- |
| App name | PSW Direct Worker |
| Application ID / bundle ID | `ca.pswdirect.worker` |
| Version | `1.0.0` (`src/mobile/version.ts`) |
| Build number | `1` |
| Web output | `dist-worker` (`vite.worker.config.ts`) |
| Capacitor config | `mobile/worker/capacitor.config.ts` |

## Audience and scope of the app

The app is for approved PSW Direct care professionals. It contains only the worker
route graph (`src/mobile/workerRoutes.ts`): sign-in, join, pending approval,
dashboard, job claim and account. No customer booking, no payment screens, no
administrator screens are compiled into the bundle; `src/mobile/__tests__/workerRoutes.test.ts`
and `workerNative.test.ts` fail the build if that changes.

## Native layer

| Concern | Implementation |
| --- | --- |
| Platform detection | `src/mobile/native/platform.ts` |
| Backend allowlist | `backendGuard.ts` — only the approved Canadian project, HTTPS only, no service-role/Stripe secrets |
| Session storage | `nativeSession.ts` (Capacitor Preferences) |
| Push notifications | `pushNotifications.ts` + `worker_push_tokens` table (per-user RLS) |
| Geolocation | `geolocationService.ts` — single reading at check-in/out, no background tracking |
| Care-sheet drafts | `careSheetDraftStore.ts` — sanitized, device-private, cleared on sign-out/deletion |
| Directions | `directions.ts` — hand-off to the installed map app |
| Network status | `networkStatus.ts` + `ConnectionBanner.tsx` |
| Lifecycle, status bar, keyboard, splash, back button, deep links | `bootstrap.ts` |
| Deep links | `deepLinks.ts` — `pswdirect.ca` universal links and `ca.pswdirect.worker://` |
| Navigation | `WorkerTabBar.tsx` (native only) |
| Logging | `logging.ts` — redacts tokens, addresses, health and financial data |

## Building

```bash
npm ci
npm run typecheck && npm test
npm run build:worker          # produces dist-worker
npx cap sync                  # from mobile/worker
```

Android: `npx cap add android && npx cap run android` (needs Android Studio and
`ANDROID_HOME`). iOS: `npx cap add ios && npx cap run ios` (needs macOS + Xcode).
Generated `mobile/worker/android` and `mobile/worker/ios` folders are not committed.

CI (`.github/workflows/worker-android.yml`) installs with a locked lockfile, runs
lint, typecheck and tests, builds the worker bundle, generates the Android project,
asserts app name/ID/version, compiles a debug APK and uploads it as an artifact.

## Store-required URLs (now live in the app)

| Purpose | Route |
| --- | --- |
| Privacy policy | `/privacy` |
| Terms of service | `/terms` |
| Support | `/support` |
| Account deletion | `/account-deletion` |

In-app deletion: Account → Delete my account, backed by the
`worker-account-deletion` edge function, which resolves the account from the
verified session only, removes push registrations, notifies the office and the
worker, and writes an audit entry.

## Data and permission inventory (for the store listings)

| Data | Purpose | Shared |
| --- | --- | --- |
| Name, email, phone | Account and identification | No |
| Credential documents | Approval to work | No |
| Precise location (in use only, at check-in/out) | Confirm attendance at the visit | No |
| Photos/files (optional) | Credential and doctor's-note upload | No |
| App activity (shifts accepted/completed) | Scheduling and pay | No |
| Device ID / push token | Shift alerts | Processor only |
| Diagnostics | Fix crashes | Processor only |

No advertising, no tracking across other apps, no data sale.

## Remaining blockers before submission

1. **Push credentials** — an FCM service account (Android) and an APNs key (iOS)
   must be configured for `ca.pswdirect.worker`. Not created; requires the owner's
   Google Play / Apple developer accounts.
2. **Signing** — Google Play upload key and Apple distribution certificate /
   provisioning profile. Not created (explicitly out of scope).
3. **Developer accounts** — Google Play Console and Apple Developer Program
   enrolment under PSW Direct Inc.
4. **Store assets** — icon (1024×1024), feature graphic, screenshots per device
   class, and the listing text.
5. **Reviewer access** — Apple and Google require a working demo account. Use an
   approved, isolated QA caregiver account with at least one visible test shift,
   and supply its credentials in the review notes (never in the repository).
6. **Secure storage review** — sessions currently use Capacitor Preferences. If a
   hardware-backed Keychain/Keystore is required by review or by policy, swap in a
   secure-storage plugin before submission.
7. **Native project generation and a signed release build** cannot be produced in
   this environment (no Android SDK, no macOS).

## Real-device beta checklist

- Sign in, wrong password, password recovery, sign out.
- Pending-approval account sees the pending screen only.
- Available shifts load; open a shift and confirm no client name or entry details
  appear before acceptance.
- Accept a shift; confirm address, time, pay and directions appear afterwards.
- Directions open the installed map app.
- Check in at the address; check in away from the address is refused with a clear
  message.
- Complete the care sheet, attach a doctor's-note photo, sign out of the shift.
- Kill the app mid-care-sheet and reopen: the draft is restored.
- Airplane mode: the offline banner appears and saved work is not lost.
- Push: receive a new-shift alert in foreground, background and with the app
  closed; tapping opens the right shift; no client details on the lock screen.
- Deny location and notifications: the app still works with clear guidance.
- Account tab: privacy, terms and support links open; version is shown.
- Delete-account request sends and signs the user out.
- Rotate the device, test large system font, and check the notch/home-indicator
  safe areas.
