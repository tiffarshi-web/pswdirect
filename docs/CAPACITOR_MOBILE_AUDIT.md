# PSW Direct Capacitor mobile audit and phased plan

**Audit date:** 2026-08-28  
**Scope:** repository inspection and planning only; no application, Supabase, Stripe, hosting, or production-data changes are included in this phase.

## 1. Executive recommendation

Keep the existing Lovable/Vite website as the canonical application and add two **thin, separately identified Capacitor shells** around role-specific React entry points:

- **PSW Direct Worker** first: its own application ID, native projects, mobile entry point, route allowlist, icons, permissions, deep-link association, and push registration.
- **PSW Direct Client** later: a different application ID and native projects, with a client-only entry point and route allowlist.

Do not fork the business logic, Supabase schema, edge functions, dispatch implementation, geocoder, booking code, Stripe code, admin UI, or SEO routes. Shared React code should remain under `src/`. The website must continue to build from the existing `index.html` and `src/main.tsx`; mobile builds should select a different HTML/entry file and output directory through an explicit build target. This minimizes divergence and prevents a mobile-only change from silently changing the Lovable site.

The Worker shell must not merely start at `/psw`: the native React router must expose only Worker routes and must send unknown/public/client/admin paths to the Worker login or dashboard. This is the reliable way to ensure that cold starts, malformed deep links, and notification links cannot expose the public ordering experience inside the Worker app.

## 2. Repository findings

### Framework and build

- The repository is a single Vite 5, React 18, TypeScript application using React Router 7, TanStack Query, Tailwind/shadcn, Supabase JS, Stripe JS, Leaflet, and Google Maps type/marker packages.
- At audit time there was one web entry (`index.html` -> `src/main.tsx` -> `src/App.tsx`) and one Vite configuration, with no `@capacitor/*` dependencies, Capacitor configuration, native projects, role-specific HTML entry, or mobile scripts. Section 9 records the Phase 1 additions made after that baseline.
- `src/App.tsx` eagerly imports the public website, SEO, admin, client, payment, and Worker page graph. Packaging that entry unchanged would ship all experiences and would make `/` the public home page.
- The router is `BrowserRouter`. It depends on hosting fallback rules for web navigation. The native shell needs explicit app-URL/deep-link handling and a controlled Worker route surface; changing the website globally to `HashRouter` is neither required nor recommended.
- `vite.config.ts` always enables the Lovable MCP Vite plugin, enables the component tagger in development, uses root-relative defaults, and has no mobile build target/base/outDir. These items need to be verified or conditionally isolated for a local packaged build.
- The sitemap generator runs in both `predev` and `prebuild` and reads Supabase configuration. Mobile builds should not generate or package SEO sitemaps, and should not accidentally make a network/database-dependent sitemap step part of native build reproducibility.

### Current routes and Worker surface

`src/App.tsx` currently defines these Worker-relevant routes alongside all website routes:

| Route | Current component | Mobile disposition |
|---|---|---|
| `/psw-login` | `PSWLogin` | Include; native-safe recovery redirect required. |
| `/psw` | `PSWDashboard` | Include; make the authenticated Worker start destination. |
| `/psw/jobs/:bookingCode` | `PSWJobClaimPage` | Include; notification/deep-link destination. |
| `/psw-pending` | `PSWPendingStatus` | Include for vetting states. |
| `/psw-diagnostics` | `PSWDiagnostics` | Exclude from release or gate as an internal diagnostic screen. |
| `/join-team` | `PSWSignup` | Product decision: include only if Worker app enrollment is intended. |
| `/install` | `InstallApp` | Web-only; exclude from native. |
| `/psw/profile/:slug`, `/psw-directory`, recruitment/SEO routes | public pages | Web-only; exclude from the Worker shell. |

The dashboard itself contains Available Jobs, Active, Schedule, Messages, History, Earnings, Care Sheets, Documents, and Profile tabs. It redirects a signed-out/non-PSW user to `/psw-login`, checks Worker approval, and sends non-approved Workers to `/psw-pending`. The job-claim page must receive the same role/approval audit before it is placed on the native allowlist because the top-level website route is not wrapped in a shared route guard.

### Authentication and session storage

- Supabase is initialized from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`, with persistent sessions and automatic token refresh. The configured storage resolves to `localStorage` outside framed Lovable preview hosts. Capacitor WebView storage may work for ordinary restarts, but secure native storage, migration behavior, OS eviction, logout, and token refresh must be explicitly tested before release.
- `AuthContext` restores and revalidates sessions, resolves application roles from existing data, listens to `onAuthStateChange`, and contains slow-network safeguards. That shared role resolution should be retained rather than duplicated.
- Worker login currently uses email/password. No `signInWithOAuth` call or Google sign-in button was found in the repository. `/.lovable/oauth/consent` is a Lovable-managed consent route, not evidence of end-user Google login.
- Password recovery is initiated through the existing `reset-password` edge function using `${window.location.origin}/psw-login`; recovery is then detected from access tokens in the URL hash. A Capacitor origin is not a suitable email callback, and hash-token assumptions are fragile for Universal Links/App Links. Native recovery needs an allowlisted HTTPS callback that transfers into a custom scheme or associated HTTPS app link, then passes the URL to Supabase without leaking tokens to logs.
- The login page logs whether the public Supabase values exist and a prefix of the publishable key. Although an anon/publishable key is designed for client distribution, logging key material is unnecessary and should be removed for production mobile builds.
- Current Worker redirects accept only relative paths beginning with `/psw`, which is a useful open-redirect defense and should be retained in the native URL normalizer.

### Environment and secrets

The checked local `.env` contains these names (values deliberately omitted here):

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY`
- `VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID`

Only `VITE_*` values are embedded by Vite. The Supabase URL, project reference, and publishable/anon key are public client configuration and are still protected by authentication/RLS, not secrecy. Stripe secret keys, Supabase service-role keys, geocoder secrets, APNs keys, FCM service credentials, and signing credentials must remain in Supabase/native CI secret stores and must never be put in `VITE_*`, Capacitor config, plist resources, Gradle source, or committed files.

The Google Maps browser key appears configured locally but no use of that variable was found in `src/`; the current Worker service-area preview uses React Leaflet/OpenStreetMap, while Worker navigation opens a Google Maps web directions URL. A future native Maps SDK key is **not** the same security profile as a browser key: use separate Android/iOS restricted keys injected by the native build process. Keep server-side geocoding credentials and logic unchanged.

### PWA and service worker

- `index.html` loads Progressier's remote manifest and script. Progressier owns web push registration.
- `public/sw.js` is intentionally a one-release kill-switch that removes legacy caches and unregisters itself; it has no fetch or push handlers.
- The app contains web `Notification` API permission UI and associates a signed-in Worker with Progressier by email/tag.
- A native WebView must not depend on Progressier, the browser `Notification` API, its remote manifest, or web service-worker lifecycle for job alerts. The mobile entry should omit web-PWA bootstrapping, and a platform adapter should use Capacitor Push Notifications/APNs/FCM. Existing in-app `notifications` data and server dispatch can remain, but the server requires a separate native-device token registry and native delivery channel with revocation, user association, delivery logging, and deep-link payload handling.
- The existing website PWA must remain untouched until native push is independently working; native registration should be additive rather than replacing Progressier.

### Dispatch, 75-km eligibility, geocoding, and job visibility

- `ARCHITECTURE.md` identifies `bookings` as the canonical order table, `dispatch_logs` as the dispatch record, `psw_profiles` plus the `get_nearby_psws` RPC as the matching source, and `app_settings.active_service_radius` as the configurable service radius.
- `notify-psws` reads `active_service_radius`, defaults to 75 km, and calls the server-side `get_nearby_psws` RPC. Database migrations also expose server-side Worker job eligibility/count functions with a 75-km default.
- Worker job loading in `shiftStore` preserves payment-aware visibility: unpaid client PaymentIntents are hidden while invoice-pending admin orders remain visible.
- Native GPS and Google Maps are presentation/device inputs only. They must not become authoritative eligibility checks. Do not port matching to the device, change `get_nearby_psws`, remove resilient geocoding, or accept a client-computed distance as authority. The server-side radius and dispatch results remain canonical.

### Current location and navigation behavior

- Active-shift check-in/sign-out uses browser `navigator.geolocation.getCurrentPosition` and sends accuracy/distance evidence through existing server flows.
- `usePSWLocationTracking` uses `watchPosition` during in-progress shifts and logs to `location_logs` no more often than every five minutes. A WebView watch is foreground-oriented and is not a valid background-location implementation on either OS.
- Worker navigation currently opens `https://www.google.com/maps/dir/` in a new browser target. Native should use an explicit Maps adapter: prefer the installed Google Maps URL scheme/app intent, fall back to the HTTPS directions URL, validate/encode the destination, and handle failure. Embedding a Google map should be a separate feature from launching navigation.
- The Worker service-area preview currently uses Leaflet. Replacing this preview is not required to package the app and must not alter server-side geocoding or distance validation.

### Stripe and payments

The Worker UI does not collect client payment, but shared `shiftStore` data includes Stripe/payment state and completion can retain saved payment references for rebooking workflows. Because the current application entry eagerly includes client/payment pages and Stripe JS, a Worker-specific entry should avoid exposing those routes and should allow bundling to exclude client payment code. No Stripe secret is present in the inspected browser configuration; secret operations are in Supabase edge functions. Do not modify webhook, PaymentIntent, invoice, or booking behavior for the Worker packaging phase.

## 3. Capacitor blockers and compatibility work

### Release blockers

1. **Capacitor is not installed or configured.** There are no native projects, app IDs, native build settings, or mobile scripts.
2. **There is no Worker-only entry/router.** The existing build starts at the public website and includes client/admin/SEO routes.
3. **Auth recovery callbacks are web-origin based.** Password reset cannot safely rely on a Capacitor WebView origin/hash.
4. **Push is web-only.** Browser Notification/Progressier cannot be the production native notification channel.
5. **Deep links are not bridged.** There is no Capacitor App listener, URL normalization, cold-start handling, Android intent filter, iOS associated-domain configuration, or notification-tap routing.
6. **Native permissions are absent.** There are no Android manifest or iOS plist location/notification purpose declarations.
7. **Background location is not implemented.** Browser geolocation will not satisfy reliable background execution; product/privacy decisions are required before requesting `Always`/background access.
8. **Build separation is absent.** The web build, sitemap generation, remote PWA bootstrap, Lovable Vite plugins, and native output currently share one undifferentiated pipeline.

### Items requiring device verification

- Supabase REST/realtime/auth connectivity and CORS behavior from the actual Capacitor origins.
- Session persistence, refresh, offline cold start, OS storage eviction, and account switching.
- File upload/document capture behavior in `PSWDocumentsTab` and any camera/photo picker expectations.
- `tel:` links, external browser links, PDF/download/share flows, keyboard/safe-area behavior, and accessibility at native viewport sizes.
- Realtime subscriptions and timers across app suspend/resume.
- Google Maps launch/fallback on devices without Google Maps installed (especially iOS).
- Check-in/sign-out accuracy, denied/reduced/approximate location, stale positions, and mock-location handling without weakening server validation.

## 4. Safest target structure

Use one repository and shared domain/UI code, but distinct entry points and native shells:

```text
/
├── index.html                         # unchanged Lovable website entry
├── src/
│   ├── main.tsx                       # unchanged website bootstrap
│   ├── App.tsx                        # unchanged full website router
│   ├── mobile/
│   │   ├── worker-main.tsx            # Worker bootstrap
│   │   ├── WorkerApp.tsx              # Worker-only providers/router/allowlist
│   │   ├── client-main.tsx            # later
│   │   ├── ClientApp.tsx              # later
│   │   └── platform/                  # typed auth URL, push, links, maps, GPS adapters
│   └── ...                            # existing shared pages/components/lib
├── mobile/
│   ├── worker/
│   │   ├── index.html                 # no website SEO/GA/Progressier bootstrap
│   │   ├── capacitor.config.ts
│   │   ├── android/                   # generated Worker native project
│   │   ├── ios/                       # generated Worker native project
│   │   └── assets/                    # Worker icons/splash source assets
│   └── client/                        # later, separate config/native projects/assets
├── vite.config.ts                     # target-aware, preserves default web behavior
└── package.json                       # explicit web/worker/client scripts
```

Recommended identifiers should be confirmed against the organization's owned reverse-DNS namespace before `cap add`; examples only are `ca.pswdirect.worker` and `ca.pswdirect.client`. Each app needs a unique App Store Connect record, bundle ID/application ID, signing setup, push entitlement, Universal/App Link association, icons, and privacy declarations. Do not use one native project with a runtime role toggle: that risks route leakage, notification/token crossover, signing mistakes, and accidental replacement of one store listing by the other.

The default `npm run build` must continue to mean **website build**. Add explicit commands such as `build:worker`, `cap:sync:worker`, `cap:open:worker:android`, and `cap:open:worker:ios`; never make Lovable's existing build depend on Xcode, Android Studio, or Capacitor.

## 5. Phased implementation plan

### Phase 0 — decisions and test baseline (no production changes)

1. Confirm legal app names, bundle/application IDs, Apple/Google developer-team ownership, supported OS floors, privacy/contact URLs, and whether signup/diagnostics belong in the Worker release.
2. Record current website build, route, auth, booking/dispatch, SEO, and PWA smoke-test results.
3. Define Worker route and deep-link allowlists, for example HTTPS `/psw`, `/psw-login`, `/psw-pending`, and `/psw/jobs/:bookingCode`; reject everything else inside the shell.
4. Decide foreground-only versus background shift tracking based on a documented operational need. Default to foreground/When-In-Use because it is less invasive and easier to justify to stores.

### Phase 1 — isolated Worker shell

1. Add Capacitor core/CLI plus Android/iOS packages at pinned compatible versions.
2. Add the Worker HTML/bootstrap/router and target-aware Vite output (for example `dist-worker`), excluding GA, Progressier, public SEO, client payment, and admin routes.
3. Create the Worker Capacitor config and native projects with a confirmed unique ID. Set `webDir` only to the Worker output; do not configure a production remote `server.url` because the submitted app should package reviewed assets.
4. Add platform detection/adapters so shared components can retain web behavior while native uses Capacitor capabilities.
5. Add automated assertions that `/` resolves to Worker login/dashboard and that public/client/admin/payment paths cannot render in the Worker build.
6. Re-run the unchanged website build and route/SEO/PWA smoke tests.

### Phase 2 — authentication and links

1. Keep email/password and existing role/profile/approval checks. Add a native-safe storage abstraction; evaluate encrypted/keychain-backed token storage against Supabase's storage interface.
2. Establish owned HTTPS Universal Links/App Links plus an application URL scheme fallback. Configure Android intent filters, iOS associated domains/URL types, and hosted association files without changing production until staging validation passes.
3. Change password recovery generation to an allowlisted HTTPS callback and implement foreground, background, and cold-start URL handling. Redact tokens from logs and clear callback URLs after session exchange.
4. Preserve the relative Worker redirect validation and add tests for hostile schemes, protocol-relative URLs, encoded traversal, unknown booking codes, wrong roles, pending users, and expired sessions.
5. If Google sign-in is later requested, treat it as a separate feature: configure native OAuth clients/redirect URIs and Supabase provider allowlists, use the system browser, and comply with Apple's Sign in with Apple equivalence rule where applicable. Do not infer it from the current Lovable consent route.

### Phase 3 — foreground GPS and Google Maps

1. Add minimum When-In-Use/foreground location declarations and plain-language purpose strings.
2. Put geolocation behind a platform adapter: Capacitor Geolocation on native, current web API on website. Preserve current accuracy capture and all server RPC/check-in/sign-out validation.
3. Add the Google Maps navigation adapter with installed-app and HTTPS fallbacks. If an embedded map is needed, add native SDK configuration with separate restricted Android/iOS keys injected outside source control.
4. Test denial, approximate location, disabled services, timeout, stale coordinates, app suspend/resume, and retry paths. The app must explain operational consequences without coercing permission.
5. Do not request background access in this phase.

### Phase 4 — native push and dispatch integration

1. Add Capacitor Push Notifications and configure APNs/FCM credentials in provider/CI consoles, never the repository.
2. Add an additive device-token table/RLS/RPC or edge-function interface keyed to authenticated user, platform, app identity, token, enabled state, and last-seen timestamp. Plan logout/token rotation cleanup.
3. Extend `notify-psws` additively so its existing radius/geocoder/filtering logic selects recipients exactly once, then sends both existing web channels and the native channel. Preserve dispatch logs/idempotency and record per-channel outcomes.
4. Route notification taps only through the Worker deep-link allowlist, including killed-app launch. Do not put patient address, care notes, or other sensitive health/personal information in lock-screen payloads; fetch authorized details after launch.
5. Keep Progressier operational for the website while native delivery is staged and monitored.

### Phase 5 — Worker device QA and store readiness

1. Test supported physical Android/iOS devices for login/recovery, role isolation, pending/flagged accounts, available-job eligibility, claim races, realtime updates, active shift, GPS check-in/sign-out, navigation, care sheets, documents, messages, earnings, logout, links, and push.
2. Regression-test the website: Lovable entry, public ordering, client, admin, SEO, PWA install/push, Stripe payment/webhooks, invoice flows, dispatch, geocoding, and 75-km eligibility.
3. Prepare store privacy labels/Data Safety answers, privacy policy and account-deletion path, location/push purpose text, review credentials/instructions, export/encryption declarations, screenshots, support URL, and accessibility checks.
4. Use internal TestFlight/Play tracks only. Do not publish, deploy server changes, or touch production data without a separately approved release plan and rollback criteria.

### Phase 6 — Client app (after Worker stabilization)

Repeat the isolated-shell pattern with its own app identity, native projects, routes, links, tokens, and store records. Reuse platform abstractions but do not reuse the Worker router, notification audience, or signing configuration. Stripe/payment behavior requires a separate native checkout assessment before the Client app is implemented.

## 6. Exact anticipated file changes

No files below are changed by this audit. This is the proposed implementation inventory; final plugin selection and app identifiers must be confirmed first.

### Existing files to modify for the Worker phase

| File | Intended change |
|---|---|
| `package.json` | Add pinned Capacitor dependencies and explicit Worker build/sync/open/test scripts while preserving existing web scripts. |
| `package-lock.json` and/or `bun.lock`/`bun.lockb` | Update only the lockfile(s) for the package manager the team designates; the repository currently has multiple lockfiles, which is a reproducibility risk. |
| `vite.config.ts` | Add an explicit Worker target, input, base, and output directory; keep default website behavior and isolate Lovable-only plugins/sitemap behavior. |
| `.gitignore` | Ignore generated mobile secrets, signing files, local native build output, and target-specific env files without ignoring committed native project sources. |
| `src/pages/PSWLogin.tsx` | Use the platform auth-callback adapter, remove key-prefix logging, and preserve Worker-only validated redirects. |
| `src/pages/PSWDashboard.tsx` | Replace direct Progressier/native assumptions with the push adapter; hide web install UI in native. |
| `src/pages/PSWJobClaimPage.tsx` | Enforce shared Worker role/approval guard and normalize native notification/deep-link entry. |
| `src/pages/PSWPendingStatus.tsx` | Route telephone/external actions through the native-safe external navigation adapter as needed. |
| `src/components/psw/ActiveShiftTab.tsx` | Use GPS and Google Maps navigation adapters while keeping server check-in/sign-out evidence. |
| `src/components/psw/PSWUpcomingTab.tsx` | Use the native Google Maps/tel adapter. |
| `src/components/psw/PSWAvailableJobsTab.tsx` | Replace direct browser Notification checks with the shared push capability API. |
| `src/components/psw/JobAlertStatusCard.tsx` | Consume platform-neutral push state. |
| `src/components/psw/PushNotificationModal.tsx` | Present native permission state/purpose text through the adapter. |
| `src/components/psw/PushNotificationBanner.tsx` | Present native settings/retry behavior through the adapter. |
| `src/components/psw/PSWInstallAppCard.tsx` | Do not render the web-install call to action in the native shell. |
| `src/hooks/usePushNotificationStatus.ts` | Delegate to web Progressier/browser notification or native APNs/FCM adapter. |
| `src/hooks/usePSWLocationTracking.ts` | Delegate foreground tracking to a platform geolocation adapter and handle lifecycle/permission states. |
| `src/integrations/supabase/client.ts` | Inject a reviewed cross-platform auth storage implementation without changing URL/project/schema. |
| `src/integrations/supabase/previewAuthStorage.ts` | Preserve Lovable preview brokering while allowing a native storage selection outside preview. |
| `supabase/functions/reset-password/index.ts` | Validate/allow the owned mobile callback path while retaining web callbacks. |
| `supabase/functions/notify-psws/index.ts` | Add native delivery after recipient selection without changing radius, geocoding, filters, or existing delivery. |
| `supabase/functions/_shared/progressierPush.ts` | Keep web push; optionally conform it to a shared server delivery result interface rather than replacing it. |

`src/App.tsx`, `src/main.tsx`, and `index.html` should ideally require **no behavioral change**. If provider extraction is needed to eliminate duplication, changes must be mechanical and covered by website regression tests. `public/sw.js` must remain web-only and should not be copied into the Worker output.

### New files/directories anticipated for the Worker phase

```text
mobile/worker/index.html
mobile/worker/capacitor.config.ts
mobile/worker/android/**
mobile/worker/ios/**
mobile/worker/assets/**
src/mobile/worker-main.tsx
src/mobile/WorkerApp.tsx
src/mobile/WorkerRouteGuard.tsx
src/mobile/platform/runtime.ts
src/mobile/platform/authLinks.ts
src/mobile/platform/deepLinks.ts
src/mobile/platform/externalNavigation.ts
src/mobile/platform/geolocation.ts
src/mobile/platform/pushNotifications.ts
src/mobile/platform/secureAuthStorage.ts
src/mobile/platform/__tests__/**
```

Server-side native push will also require a reviewed Supabase migration under `supabase/migrations/<timestamp>_native_push_devices.sql` and probably a shared sender such as `supabase/functions/_shared/nativePush.ts`. Exact schema and provider file names should be finalized only after the push provider/token lifecycle design is approved.

### Later Client files/directories

```text
mobile/client/index.html
mobile/client/capacitor.config.ts
mobile/client/android/**
mobile/client/ios/**
mobile/client/assets/**
src/mobile/client-main.tsx
src/mobile/ClientApp.tsx
src/mobile/ClientRouteGuard.tsx
```

## 7. Risk register and controls

| Area | Repository-specific risk | Required control before release |
|---|---|---|
| Authentication redirects | Recovery currently uses `window.location.origin` and hash tokens. Native origins/email clients will not reliably return to the app. | Owned HTTPS callback, Supabase allowlist, associated domains/app links, cold-start URL exchange, token-redacted logs, hostile-link tests. |
| Google sign-in | No current product implementation exists; adding a web OAuth popup in a WebView would be unsafe/unreliable. | Do not add in packaging phase. If required later, use system browser/native clients, exact redirects, provider-console setup, and Apple equivalence review. |
| Session storage | Supabase tokens currently persist in localStorage outside Lovable previews. WebView data can be cleared or extracted more readily than keychain/keystore data. | Threat-model and test an encrypted native storage adapter, migration, refresh, logout, reinstall, and device-lock behavior. |
| Push notifications | Progressier and browser Notification APIs are web-only; email-tag association is not a native token lifecycle. | APNs/FCM adapter, authenticated token registration/rotation/revocation, non-sensitive payloads, per-app audience, delivery logs, deep-link allowlist. |
| Deep links | No native listener or association files; job URLs can arrive while signed out or app-killed. | Unique scheme + verified HTTPS links, queued redirect after auth, route/role validation, cold/warm tests, web fallback. |
| Stripe | Worker shell could accidentally expose shared client/payment routes; native Client checkout will have separate policy/redirect requirements. | Worker allowlist and separate bundle entry; retain edge-function secrets/webhooks; defer Client payment assessment. |
| GPS permission | Browser calls have no native purpose strings and do not fully model approximate/denied/lifecycle states. | Minimum foreground permission, clear purpose, just-in-time prompt, settings path, degraded UX, server remains authoritative. |
| Background location | Current `watchPosition` is foreground WebView code and can stop on suspend. Background access triggers major privacy/battery/store scrutiny. | Default off. Add only after documented necessity, legal/privacy review, conspicuous disclosure, OS-specific service/mode, user control, retention review, and store approval plan. |
| Google Maps | Current Worker launches an HTTPS directions URL; browser key is not suitable as an unrestricted native SDK key. | Native intent/scheme adapter, HTTPS fallback, separately restricted Android/iOS keys injected by CI; do not alter geocoding. |
| 75-km eligibility | Reimplementing distance on-device could diverge from settings/RPC/dispatch or become tamperable. | Continue using `active_service_radius`, server RPCs, dispatch selection, and server validation as canonical; mobile distance is display-only. |
| Sensitive data | Push lock screens, logs, screenshots, cached WebView content, and app switcher previews can expose patient/care information. | Minimal push payload, authenticated fetch, production log redaction, screen/privacy review, cache policy, app-switcher mitigation where justified. |
| App stores | Location, health/care data, account login, push, background claims, and third-party SDK collection affect disclosures/review. | Accurate Apple privacy manifest/labels and Google Data Safety, privacy policy, account deletion, review account/instructions, permission justification, SDK declarations. |
| Website regression | Shared code/build changes could break Lovable SEO, ordering, admin, Stripe, dispatch, or Progressier. | Default web entry/scripts unchanged, target isolation, website CI suite and route/PWA/payment/dispatch smoke tests on every mobile change. |

## 8. Audit conclusion

The shared React code and existing Worker experience are suitable for a thin Capacitor shell, but the repository is **not currently ready to submit as a native app**. The safest first increment is build and route isolation—not maps or background location. Once the Worker-only shell demonstrably cannot enter website/client/admin/payment routes, implement native auth links, minimum foreground GPS, external Google Maps navigation, and additive native push in that order. Throughout, the existing Supabase project, booking/payment/admin systems, resilient geocoding, and server-side 75-km eligibility remain the sources of truth.

## 9. Phase 1 implementation record

**Implemented on:** 2026-08-28

Phase 1 now provides the isolated, Worker-only web bundle that Capacitor will package:

- `vite.worker.config.ts` is a separate build configuration with `mobile/worker` as its root, `dist-worker` as its output, a relative asset base, no public-directory copy, and no Lovable MCP/component-tagger plugins. The existing `vite.config.ts`, `index.html`, `src/main.tsx`, and website route graph were not changed.
- `mobile/worker/index.html` is a minimal, non-indexable native entry. It deliberately omits website SEO metadata, Google Analytics, the Progressier manifest/script, and the website failover/service-worker bootstrap.
- `src/mobile/worker-main.tsx` and `src/mobile/WorkerApp.tsx` provide a separate React entry and provider tree. The compiled route graph contains only Worker login, Worker signup, pending status, dashboard, and job-claim routes. Authenticated Worker routes have an explicit role guard.
- Unknown, public, client, payment, admin, and SEO paths are not registered. The catch-all sends an authenticated PSW to `/psw` and everyone else to `/psw-login`.
- `src/mobile/workerRoutes.ts` makes the route policy independently testable, and `src/mobile/__tests__/workerRoutes.test.ts` asserts both the allowlist and authenticated/signed-out fallbacks.
- `mobile/worker/capacitor.config.ts` establishes the permanent identity `ca.pswdirect.worker`, app name `PSW Direct Worker`, and Worker-only `webDir`. The application ID was confirmed on 2026-08-28 and must not be changed for subsequent Worker releases.
- `package.json` now has explicit `build:worker`, `cap:sync:worker`, Android/iOS open, type-check, and test commands, plus the minimum Capacitor core/CLI/platform package declarations. `.gitignore` excludes Worker output, native build products, and common signing credentials.

No Client shell, Google Maps SDK, native push, background-location plugin, Supabase migration/function change, Stripe change, or business-logic change was made. In particular, dispatch, geocoding, payment-aware visibility, and server-side 75-km eligibility remain untouched.

### Native projects intentionally not generated yet

The permanent identifier is now confirmed. However, this environment's package registry rejected Capacitor downloads, so running an unverified/transient CLI to generate and commit Android/iOS scaffolding was not reproducible. Consequently `mobile/worker/android` and `mobile/worker/ios` are **not** generated. Once registry access is restored, reconcile and install from the committed dependency manifest, run the successful web and Worker build baselines, then run:

```sh
(cd mobile/worker && npx cap add android)
(cd mobile/worker && npx cap add ios)
npm run cap:sync:worker
```

The generated native projects should be reviewed for their IDs, deployment targets, network policy, signing placeholders, and absence of credentials before being committed.

### Remaining blockers and next recommended phase

1. Restore npm registry access and reconcile the existing `package.json`, `package-lock.json`, `bun.lock`, and `bun.lockb` using one designated package manager.
2. Install the declared Capacitor packages, generate/review both native projects, and execute physical/simulator cold-start plus route-isolation smoke tests.
3. Keep Phase 1 free of native push, Google Maps, and background location as required.
4. Proceed to **Phase 2 — authentication and deep links** only after every Phase 1 command below passes. Do not start mapping, push, background location, or the Client app before that gate.

## 10. Phase 1 completion verification attempt

**Attempted on:** 2026-08-28
**Result:** blocked honestly; Phase 1 is not marked complete and Phase 2 must not begin.

### Why `package-lock.json` was already inconsistent

Git history shows that `package-lock.json` was introduced in commit `9510b73` as a snapshot whose root dependency declarations included older versions such as Supabase 2.90.1, React Router 6.30.1, Recharts 2.15.4, Vitest 3.2.4, and Zod 3.25.76. Later commits changed `package.json` without regenerating the npm lockfile; for example commit `956f320` added `@testing-library/react` only to `package.json`. Before the Worker Capacitor declarations were added, the manifest also contained packages/versions absent from or incompatible with the lock, including the Google Maps marker clusterer and Lovable MCP packages. The Worker change added four more missing Capacitor entries, but did not cause the original drift.

No existing application dependency was removed or downgraded. A lock-only reconciliation was attempted with the manifest as committed, so npm could choose mutually compatible stable versions and write their authoritative integrity/resolution data. It was blocked before npm could modify `package-lock.json`.

### Exact verification results

| Command | Result |
|---|---|
| `npm install --package-lock-only --ignore-scripts` | **Blocked:** `E403 403 Forbidden - GET https://registry.npmjs.org/@capacitor%2fandroid`. |
| `npm install --package-lock-only --ignore-scripts --offline` | **Blocked:** `ENOTCACHED`; no cached response for `@capacitor/android`. |
| `npm ci` | **Blocked:** `E403 403 Forbidden - GET https://registry.npmjs.org/@capacitor%2fandroid`; installation did not begin. |
| `npm run typecheck` | Blocked by missing installed dependencies/types, including `google.maps`, Node, Vitest, Vite, and Capacitor CLI types. |
| `npm test` | Blocked because the `vitest` executable is not installed. |
| `npm run build` | Blocked in `prebuild` because the `tsx` executable is not installed. |
| `npm run build:worker` | Blocked because the `vite` executable is not installed. |
| `../../node_modules/.bin/cap add android` and `../../node_modules/.bin/cap add ios` (from `mobile/worker`) | **Blocked:** the Capacitor binary does not exist because dependency installation was blocked; no native files were generated. |
| `npm run cap:sync:worker` | **Blocked:** its prerequisite Worker build could not start because `vite` is not installed, so sync did not run and no platform files were changed. |

The ordinary website entry files and build configuration (`index.html`, `src/main.tsx`, `src/App.tsx`, `vite.config.ts`, and `public/sw.js`) remain byte-for-byte unchanged from the pre-mobile baseline. Static route-policy verification still confirms that the Worker route graph contains its required allowlist and catch-all without client, payment, admin, public-home, or SEO routes. These static checks do not substitute for the required npm builds/tests.

Because authoritative npm package metadata and tarballs are unavailable, manually inventing lockfile integrity hashes, hand-writing generated Android/iOS projects, or claiming successful builds would leave a misleading and non-reproducible repository. The safe stopping point is therefore the committed Worker source/configuration plus this explicit blocker record. When registry access is restored, the first work must be lockfile reconciliation followed by `npm ci`, type checking, tests, both builds, `cap add` for both platforms, and `npm run cap:sync:worker`; only then can Phase 1 be marked complete.

## 11. Phase 1 operational verification follow-up

**Attempted on:** 2026-09-01<br>
**Environment:** Linux x86_64, Node 24.15.0, npm 11.4.2, Capacitor 7.4.3

Registry access was restored. npm remains the designated package manager because the
repository's build, test, and Capacitor commands use npm and `package-lock.json` is the
authoritative reproducible lockfile. `npm install --package-lock-only --ignore-scripts`
confirmed that the committed manifest and lockfile were already reconciled; it made no
lockfile changes. `npm ci` then installed all 838 packages successfully from the lockfile.
The install reported 10 audit findings (3 moderate and 7 high); they were not changed
automatically because an unreviewed `npm audit fix` could alter production dependencies
outside the Worker Phase 1 scope.

The source and web-bundle portion of the Phase 1 gate now passes:

| Command | Verified result |
|---|---|
| `npm ping` | Passed against `https://registry.npmjs.org/`. |
| `npm view @capacitor/core@7.4.3 version dist.integrity` | Passed and returned the published 7.4.3 package metadata. |
| `npm install --package-lock-only --ignore-scripts` | Passed; the committed npm lockfile was already current. |
| `npm ci` | Passed; 838 packages installed and 839 packages audited. |
| `npm run typecheck` | Passed. |
| `npm test` | Passed: 18 files and 316 tests, including the Worker route allowlist and fallback assertions. |
| `npm run build` | Passed. The environment could not reach the live service-radius lookup, so the existing fail-closed sitemap generator emitted only its non-inventory URLs during the check. The generated SEO files were restored rather than committing environment-derived output. |
| `npm run build:worker` | Passed and produced the isolated `dist-worker` bundle. |
| `npm run cap:add:worker:android` | Passed; generated the ignored Android project and copied the Worker bundle. |
| `npm run cap:add:worker:ios` | Passed; generated the ignored iOS project and copied the Worker bundle. CocoaPods and Xcode steps were explicitly skipped by Capacitor because this is not a macOS/Xcode environment. |
| `npm run cap:sync:worker` | Passed for both generated projects. |
| Android `./gradlew tasks --no-daemon` with JDK 21 | Passed, validating that the generated Gradle project configures and exposes its build and verification tasks. |
| Android `./gradlew assembleDebug --no-daemon` with JDK 21 | Blocked honestly because no Android SDK or `ANDROID_HOME` is installed. |

Generated identity checks confirmed `ca.pswdirect.worker` in the copied Capacitor
configuration, Android Java package/resources, and iOS Xcode bundle identifiers, and
confirmed `PSW Direct Worker` in both platform resources. The native directories remain
ignored disposable output as designed; no generated signing material, native build
products, or environment-specific paths are committed.

### Outstanding native-machine gate

Phase 1 is source-, dependency-, test-, web-build-, generation-, and sync-verified, but
native binary/device verification remains outstanding. On an Android build machine,
install a compatible Android SDK, set `ANDROID_HOME`, regenerate/sync, run the Gradle
build/check tasks, and perform emulator and physical-device cold-start and route-isolation
smoke tests. On macOS, install Xcode and CocoaPods, regenerate/sync, build the Xcode
workspace, and perform the same simulator and physical-device checks. Review deployment
targets, network policy, signing placeholders, and credential absence on both platforms.

Do not begin Phase 2, native push, Google Maps, background location, or a Client shell
until those native-machine checks pass. This follow-up changes no website entry point,
Stripe or Supabase behavior, admin/SEO route, server function, migration, or production
configuration.
