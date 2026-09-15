# PSW Direct Caregiver — Android beta (Phase 7)

## Identity

| Item | Value |
| --- | --- |
| App name | PSW Direct Caregiver |
| Application ID | `ca.pswdirect.worker` (permanent — Firebase depends on it) |
| Version name | see `WORKER_APP_VERSION` in `src/mobile/version.ts` |
| Version code | see `WORKER_BUILD_NUMBER` in `src/mobile/version.ts` |
| Firebase project | `psw-direct-worker`, package verified on every sync |
| Deep-link scheme | `ca.pswdirect.worker://` plus `https://pswdirect.ca` links |
| Backend | PSW Direct Canada only, enforced at startup by `backendGuard.ts` |
| Minimum Android | 6.0 (API 23) — the Capacitor 7 floor |
| Web assets | bundled in the APK; there is no `server.url` |

## Startup contract

The previous beta could sit on a spinner forever. The shell now:

1. Dismisses the splash screen first, independently of network and session.
2. Verifies the build points at the PSW Direct Canada backend.
3. Restores the saved sign-in under an 8-second timeout.
4. Wires lifecycle, deep links and notifications **after** the first screen —
   these can never delay or block startup.
5. Enforces a 12-second hard ceiling; past that the app shows a retry screen
   with a short code (`OFFLINE`, `STARTUP_TIMEOUT`, `SESSION_RESTORE_FAILED`,
   `BACKEND_CONFIG`) and a "Continue to sign in" escape.

## Build types

| Build | WebView debugging | Logging | Assets |
| --- | --- | --- | --- |
| Debug / beta (`WORKER_BUILD_TYPE=beta`) | enabled | debug | bundled production endpoints |
| Release (default) | disabled | none | bundled production endpoints |

## Producing the beta APK

The `Worker Android verification` GitHub Actions workflow runs tests, type
checking, the web build, Capacitor sync and the Android build, then publishes
`PSW-Direct-Caregiver-beta.apk` together with its SHA-256 checksum. The workflow
never publishes to Google Play and never prints a secret.

Install on a test phone:

1. Download the `psw-direct-caregiver-beta` artifact from the workflow run.
2. Unzip and copy `PSW-Direct-Caregiver-beta.apk` to the phone.
3. Allow installation from the file manager, then open PSW Direct Caregiver.

## Signing

No release keystore exists in this repository and none may be committed. CI
reuses a single cached **debug** identity so an already-installed beta can be
updated in place. A Play Store release additionally needs an upload key held
outside the repository.

## Google Play listing draft (not submitted)

- **Title:** PSW Direct Caregiver
- **Short description:** Accept nearby home-care shifts, check in and complete
  your visit notes.
- **Full description:** For approved PSW Direct caregivers in Ontario. See
  nearby shifts, accept work, get directions, check in and out with location
  confirmation, complete the care report with photos, and track earnings.
  Caregivers are approved by the PSW Direct office before they can work.
- **Privacy policy:** https://pswdirect.ca/privacy-policy
- **Support:** (249) 288-4787, barrie@pswdirect.ca
- **Permissions to explain:** notifications (shift alerts), precise location
  (confirming you are at the visit), camera and photos (care-report photos).
- **Data safety draft:** collects account details, precise location during a
  visit, and photos attached to a care report; data is encrypted in transit; no
  data is sold; caregivers may request deletion at
  https://pswdirect.ca/account-deletion.
- **Assets still required:** 512×512 icon, 1024×500 feature graphic, at least
  two phone screenshots (sign-in, dashboard, job detail, care report).
- **Internal testing notes:** first controlled beta — startup reliability,
  notification registration and the full shift workflow.

## Known limitations

- Real-device notification delivery is unverified until a beta phone registers.
- iOS needs APNs credentials and provisioning before any iOS build.
