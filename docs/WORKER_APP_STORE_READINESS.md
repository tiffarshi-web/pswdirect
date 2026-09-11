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
| Session storage | `secureStore.ts` (`@aparajita/capacitor-secure-storage` — iOS Keychain / Android Keystore) + `nativeSession.ts`; legacy Preferences copy migrated then deleted, no plaintext fallback |
| Push notifications | `pushNotifications.ts` + `worker_push_tokens` table (per-user RLS); Android Firebase config of record at `mobile/worker/firebase/google-services.json`, copied into the generated project by `npm run cap:firebase:worker:android` |
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

### Account deletion workflow

1. **Initiation** — in the app (Account → Delete my account) or publicly at
   `/account-deletion` without signing in.
2. **Requester verification** — in-app requests are resolved from the verified
   JWT only; public requests must confirm a single-use link emailed to the
   address given (hashed token, valid 24 hours, no account enumeration in the
   response).
3. **Effect while open** — every device session is revoked, push registrations
   are deleted, and a database trigger blocks any further assignment or claim
   for that caregiver.
4. **Tracking and deduplication** — one row in `account_deletion_requests`; a
   partial unique index prevents a second open request for the same email.
5. **Notifications** — the office and the requester are emailed; both include
   round-the-clock support contact.
6. **Administrator workflow** — `admin_resolve_account_deletion(request_id,
   action, reason)` supports `complete`, `reject`, `request_identity` and
   `cancel`; a reason is mandatory for reject/cancel; admin-only, and every
   action is written to `admin_audit_log`.
7. **Deletion vs deactivation** — deletion is permanent; workers who only want
   to stop receiving shifts are directed to call the office.
8. **Deleted** — sign-in account, caregiver profile, credential documents, push
   registrations, and all on-device data including unsent drafts.
   **Retained** — completed care reports, invoices, payout records and the
   deletion audit record, for the period required by Ontario tax, insurance and
   health-record obligations. No fixed turnaround or retention period is
   published anywhere, because none has been legally confirmed.


## Data and permission inventory (for the store listings)

"Shared" below follows the store definitions: transfer to a third party acting
on our behalf under contract is disclosed as "Processor", and disclosure to
another user of the service is disclosed as such. Nothing is sold or used for
advertising or cross-app tracking.

| Data | Purpose | Collected | Shared |
| --- | --- | --- | --- |
| Name, email, phone | Account and identification | Yes, linked to identity | Processor (cloud database, email delivery); client sees the caregiver's first name for an accepted visit |
| Credential documents | Approval to work | Yes, linked to identity | Processor (file storage) |
| Precise location (in use only, at check-in/out) | Confirm attendance at the visit | Yes, linked to identity | Processor (cloud database, mapping/geocoding provider) |
| Photos/files (optional) | Credential and doctor's-note upload | Yes, linked to identity | Processor (file storage, email delivery when attached to a care report) |
| App activity (shifts accepted/completed) | Scheduling and pay | Yes, linked to identity | Processor (cloud database) |
| Care report content | Care record for the client | Yes, linked to identity | Client and their substitute decision maker; processors |
| Payout details | Paying the caregiver | Yes, linked to identity | Processor (payment/payout handling) |
| Device ID / push token | Shift alerts | Yes, linked to identity | Processor (push notification provider) |
| Diagnostics | Fix crashes | Yes, not linked to identity | Processor |

No advertising, no tracking across other apps or websites, no data sale, and no
sharing with any other application operated by the owners.

### Apple privacy "nutrition label" worksheet
- Data used to track you: **None**.
- Data linked to you: Contact info, User content (care reports, photos/files),
  Identifiers (device token), Location (precise, in-app use only), Usage data
  (shift activity), Financial info (payout details).
- Data not linked to you: Diagnostics.
- Purposes: App functionality only. Not analytics-for-advertising, not
  personalisation, not third-party advertising.

### Google Play Data safety worksheet
- Collected and shared: as in the table above; "shared" entries are service
  providers processing on our behalf, plus care information shown to the client
  receiving the visit.
- Data is encrypted in transit; sessions and credentials are stored in
  hardware-backed secure storage on the device.
- Users can request account deletion in the app (Account → Delete my account)
  and from the web at https://pswdirect.ca/account-deletion without signing in.
- Data deletion URL for the listing: `https://pswdirect.ca/account-deletion`.


## Remaining blockers before submission

1. **Push credentials** — the Android client configuration (`google-services.json`,
   Firebase project `psw-direct-worker`, package `ca.pswdirect.worker`) is in place.
   Still required: a Firebase service account so the backend can *send* messages
   (linked through the Firebase Cloud Messaging connector), and an APNs key
   uploaded to the same Firebase project for iOS.
2. **Signing** — Google Play upload key and Apple distribution certificate /
   provisioning profile. Not created (explicitly out of scope).
3. **Developer accounts** — Google Play Console and Apple Developer Program
   enrolment under PSW Direct Inc.
4. **Store assets** — icon (1024×1024), feature graphic, screenshots per device
   class, and the listing text.
5. **Reviewer access** — Apple and Google require a working demo account. Use an
   approved, isolated QA caregiver account with at least one visible test shift,
   and supply its credentials in the review notes (never in the repository).
6. **Secure storage — resolved.** Sessions now live in the iOS Keychain /
   Android Keystore-backed store via `@aparajita/capacitor-secure-storage` v8
   (`src/mobile/native/secureStore.ts`). The old Capacitor Preferences copy is
   migrated once and deleted; if secure storage is unavailable nothing is stored
   and the worker signs in again. Tokens are never logged.

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
