
# PSW App — Engineering Audit & Repair Roadmap

**Scope:** Read-only audit of all 25 PSW lifecycle stages against the intended workflow. No code will change until you approve a repair slice.

**Method:** Findings below are grounded in the current codebase (files listed in `src/components/psw/`, `src/pages/PSW*`, `supabase/functions/`, `bookings`/`psw_profiles`/`user_roles`/`payroll_entries` tables, ARCHITECTURE.md, and prior security-hardening migrations). Anything marked *needs deep-dive* means I want to open the specific files with you watching before I commit to a fix.

---

## Part 1 — Per-Stage Audit (25 stages)

Legend for each stage: **Works ✓ / Partial ~ / Broken ✗ / Repair risk / Tables / Edge Fns / RPCs / Components / RLS**

### 1. Authentication (PSW login)
- ✓ Supabase email/password via `PSWLogin.tsx`; `AuthContext` resolves role via `user_roles` → `psw_profiles` → `client_profiles`.
- ~ `handleSupabaseUser` uses `.ilike(email)` on `psw_profiles`; case-insensitive but relies on email uniqueness. No index confirmation.
- ✗ 6-second `loadingFallbackTimer` can flip `isLoading=false` before role resolves on slow networks → brief flash of "not logged in" then reload.
- Repair risk: Touching AuthContext is high — every portal depends on it.
- Tables: `user_roles`, `psw_profiles`, `client_profiles`. RLS: `user_roles` self-select + admin. Components: `AuthContext`, `PSWLogin`.

### 2. Approval / Vetting
- ✓ `checkPSWApproval` in `src/lib/pswApproval.ts` is the single source of truth (vetting_status='approved', not banned/archived).
- ~ Status mapping in `AuthContext` duplicates `pswApproval` logic — two places to keep in sync. **Duplicate functionality.**
- Tables: `psw_profiles` (vetting_status, lifecycle_status, banned_at, archived_at). Components: `PSWPendingStatus`, `RevettingWarningModal`. RLS: restrictive update policy blocking self-escalation on `psw_number`, `is_test`, `vetting_status`.

### 3. Dashboard (`PSWDashboard.tsx`)
- ✓ Tab shell wires Active / Available / Upcoming / Care Sheets / History / Earnings / Profile / Documents.
- ~ *Needs deep-dive*: I want to verify approval gate re-runs on tab focus so a mid-shift ban actually kicks the PSW out.
- Components: `PSWDashboard`, all `PSW*Tab.tsx`.

### 4. Available Jobs
- ✓ `PSWAvailableJobsTab` (real) is the live path; `AvailableShiftsTab` is a **legacy shim** that just re-exports it — dead code.
- ~ Payment-aware visibility (bookings with Stripe PI but not paid are hidden) — logic lives in `getAvailableShiftsAsync` in `shiftStore.ts`, which the ARCHITECTURE.md itself calls "kept for backward compat but are no-ops". Contradiction — needs verification.
- Tables: `bookings`. RPC: `get_nearby_psws`. Components: `PSWAvailableJobsTab`, `ClaimShiftDialog`.

### 5. Job Acceptance (claim)
- ✓ Atomic `.is('psw_assigned', null)` update = first-claim-wins.
- ✓ `claim_booking` RPC now enforces caller matches PSW email (recent security fix).
- ~ Race window between dispatch broadcast and RLS visibility of a paid-but-not-yet-dispatched booking — *needs deep-dive*.
- Tables: `bookings`, `psw_profiles`. RPC: `claim_booking`. Component: `ClaimShiftDialog`.

### 6. Job Unassignment
- ✗ **Unknown code path.** No dedicated `unclaim` RPC visible. Admin can reassign via Admin Portal but PSW self-unassign flow is unclear. This is a likely gap.
- Repair risk: adding this touches dispatch re-broadcast and payroll accrual.

### 7. Assigned Shift (pre-check-in)
- ✓ `PSWUpcomingTab` lists claimed bookings.
- ~ Communication buttons (`CommunicationButtons`) route through `communication_sessions` — needs verification that phone masking is enforced server-side, not just UI.

### 8. GPS Sign-In
- ✓ `check_in_attempts` table records geofence attempts.
- ~ 1000m / 500m transport geofence per memory; soft-fail path uses `awaiting_review` status. Race: multiple rapid taps could insert duplicate attempts — *needs deep-dive on unique constraint*.
- Tables: `check_in_attempts`, `bookings.status → in-progress`.

### 9. Active Shift
- ✓ `PSWActiveTab` / `ActiveShiftTab` (two components — likely duplicate). **Duplicate functionality suspected.**
- Location logs via `location_logs` + `usePSWLocationTracking`.

### 10. GPS Sign-Out
- ✓ `sign_out_attempts` mirrors check-in flow. Effective Time uses adjusted times.
- ~ Signout triggers payroll — coupling means a failed signout retry can create duplicate payroll rows if `ON CONFLICT (shift_id)` isn't enforced everywhere. ARCHITECTURE.md says it is; needs test.

### 11. Care Sheet
- ✓ `PSWCareSheet` + `PSWCareSheetsTab`; `care_sheet_audit_log` present.
- ~ `CareSheetDocUpload` — verify RLS on storage bucket path scoping.

### 12. Required Documents
- ✓ `PSWDocumentsTab` + `upload-psw-document` edge function (now hardened: rejects anon uploads when profile exists).
- ~ Duplicate INSERT policy on `psw_documents` was dropped in recent migration — verify remaining policy covers admin + self.

### 13. Shift Completion
- ✓ Trigger `trg_sync_booking_to_payroll` fires on `status='completed'`.
- ~ Completion emails (`send-completion-email`, `send-visit-summary`, `send-care-sheet-email`) — each now has `authorizeBookingCaller`. Need to confirm the client-side call site sends a Bearer JWT, not anon.

### 14. Payroll
- ✓ `payroll_entries` upsert via `upsert_payroll_entry_for_booking`. Admin backfill via `sync_completed_bookings_to_payroll`.
- ~ `shift_admin_adjustments` + `shift_time_adjustments` — two adjustment tables. **Possible duplicate.**
- Tables: `payroll_entries`, `overtime_charges`, `shift_*_adjustments`.

### 15. Payment History (PSW earnings)
- ✓ `PSWEarningsTab`, `useUpcomingEarnings`, `PayoutStatusCard`, `payout_requests`, `payouts`, `payout_entry_links`.
- ~ Manual payout ledger (memory: FIFO auto-allocation with Override) — verify no client-side amount tampering; server RPC only.

### 16. Notifications
- ✓ `notifications` + `notification_queue` + `in_app_messages`; `useNotifications`, `NotificationsBell`, push via Progressier.
- ~ Push subscription lifecycle (`PushNotificationBanner`/`Modal`) — stale subscriptions never garbage-collected. Medium risk.

### 17. Profile Editing
- ✓ `PSWProfileTab` + `psw_pending_updates` (staged updates awaiting admin review).
- ✓ Restrictive RLS blocks self-escalation on `psw_number`, `is_test`, `vetting_status`.
- ~ Client-side mirrors DB rules — if RLS ever loosens, UI would silently allow escalation. Add defense-in-depth check.

### 18. Availability
- ~ `recurring_schedules` table exists but only 1 policy — *needs deep-dive*. Unclear if PSW-editable or admin-only. Likely partial.

### 19. Radius (service radius per PSW)
- ✓ `app_settings.active_service_radius` is global admin-controlled (per ARCHITECTURE.md).
- ✗ Per-PSW radius override — memory says `ServiceAreaMapPreview` shows per-PSW circles, implying per-PSW radius column exists on `psw_profiles`. Verify column & UI wiring.

### 20. Languages
- ~ Soft filter in dispatch. `psw_profiles.languages` array; matched by `get_nearby_psws`. Verify array-contains works with case/whitespace.

### 21. Vehicle Requirements
- ✓ `VehicleDisclaimerModal` blocks transport claims without vehicle.
- ~ Enforcement — client-side gate only? Server should also reject claim if PSW lacks vehicle for a transport booking. **Likely security gap.**

### 22. Coverage Map integration
- ✓ `UnifiedAdminMap` + `UnifiedCoverageSection` + `PSWCoverageDiagnostics`. Leaflet/OSM per memory (no Google Maps).
- ~ PSWs without coords fall out silently — Diagnostics surfaces this.

### 23. Orders Pipeline integration
- ✓ Bookings are single source of truth. Pipeline reads live from `bookings` + `dispatch_logs`.
- ~ `unserved_orders` recovery path (Path C) — verify `fulfill-unserved-order` Stripe verification (recent hardening).

### 24. Dispatch integration
- ✓ `notify-psws` → geocode → `get_nearby_psws` → push/email/SMS/in-app.
- ✓ `dispatch-escalation` 3-tier engine (cron-secret protected).
- ~ Idempotency check reads `dispatch_logs.booking_code` — if code is null (rare early-insert race), duplicate dispatch possible.

### 25. Admin override functionality
- ✓ `admin_override_requests` table + `admin_audit_log` (immutable trigger-populated).
- ~ Multiple override RPCs — surface area is broad. Needs enumeration.

---

## Part 2 — Cross-Cutting Issues

**Duplicate / Legacy / Dead code**
- `AvailableShiftsTab` shim; `shiftStore.ts` localStorage functions (self-declared no-ops); possibly `ActiveShiftTab` vs `PSWActiveTab`; two shift-adjustment tables.
- `AuthContext` role resolution duplicates `pswApproval.ts` logic.

**Race conditions**
- Auth loading 6s fallback vs. slow role resolution.
- Rapid GPS check-in taps.
- Dispatch idempotency dependent on `booking_code` being present at webhook time.

**Security concerns still worth reviewing**
- Vehicle requirement enforcement server-side (Stage 21).
- Client-triggered completion emails — confirm JWT is forwarded from browser, not anon key.
- `recurring_schedules` single policy (Stage 18).
- Push subscription cleanup / stale device tokens.

**State sync / cache**
- PWA service worker cache vs. approval status flips (memory already addresses via `checkPSWApproval` "unknown = keep last state").
- Realtime subscription leaks on tab unmount — *needs deep-dive*.

**Mobile / PWA**
- File input `capture="environment"` ban already enforced per memory — spot-check `CareSheetDocUpload` and document uploads.
- `min-h-dvh` usage — spot-check PSW tabs.

---

## Part 3 — Repair Roadmap (categorized, no code yet)

### Critical
1. **Vehicle requirement server enforcement** — add check in `claim_booking` RPC. Files: migration + `ClaimShiftDialog`. Regression risk: medium (could block legitimate transport claims if `has_vehicle` data is stale).
2. **PSW self-unassign path** — decide policy (allow with penalty? admin-only?) then implement. Files: new RPC + `PSWUpcomingTab`. Regression risk: high (touches dispatch re-broadcast).

### High
3. **Auth loading race** — extend fallback to wait for role resolution or block route rather than release UI. Files: `AuthContext.tsx`. Risk: high — every portal.
4. **Duplicate role/approval logic** — collapse `AuthContext.handleSupabaseUser` status mapping into `checkPSWApproval`. Risk: medium.
5. **Duplicate active-shift components** (`PSWActiveTab` vs `ActiveShiftTab`) — pick one, delete other. Risk: low if usages are traced first.
6. **Dispatch idempotency hardening** — index on `dispatch_logs(booking_id)` and use booking_id, not booking_code, for idempotency key. Risk: medium.

### Medium
7. **`recurring_schedules` RLS review** — ensure PSW can only see own; admin full. Risk: low.
8. **Push subscription GC** — cron sweep of expired/invalid subscriptions. Risk: low.
9. **Payroll adjustment table consolidation** — merge `shift_admin_adjustments` + `shift_time_adjustments` or document why they're separate. Risk: high (financial data).
10. **Realtime subscription audit** — verify `useRealtimeBookings` unsubscribes cleanly.

### Low
11. Delete `AvailableShiftsTab.tsx` shim and legacy no-op functions in `shiftStore.ts`. Risk: minimal.
12. Confirm `min-h-dvh` and no `capture="environment"` across PSW file inputs.
13. Documentation: reconcile ARCHITECTURE.md "no-op" claim with any live use of `getAvailableShiftsAsync`.

---

## Part 4 — Production Features That MUST NOT Break

Any repair PR will be gated on smoke tests for:

- **Stripe:** `create-payment-intent`, `stripe-webhook` happy path, `fulfill-unserved-order` verify path, `charge-saved-card-rebook`, `charge-overtime`, refunds.
- **Booking creation:** client Path A (Stripe), admin Path B (invoice-pending), unserved Path C.
- **Dispatch:** `notify-psws` broadcast + `dispatch-escalation` tiers + `expire-unclaimed-bookings`.
- **Orders Pipeline:** admin list, filters, status transitions.
- **Coverage Map:** `UnifiedAdminMap`, per-city supply/demand, radius circles.
- **Payroll:** completion → `trg_sync_booking_to_payroll` → `payroll_entries` upsert; manual payout ledger FIFO allocation.
- **Admin Portal:** all tabs (Orders, Coverage, PSWs, Payroll, Recovery Queue, Security, Audit).
- **SEO:** invisible SEO layer, sitemap generation, `200!` SPA fallback.
- **Notifications:** in-app bell, push (Progressier), transactional email (`send-*-email` functions with `authorizeBookingCaller`).
- **GPS:** check-in geofence (1000m / 500m transport), soft-fail `awaiting_review`, sign-out.
- **Care Sheets:** audit log, doc upload storage RLS.
- **Client Portal:** booking flow, rebook, saved payment method, communication buttons, tracking page.

---

## Ask before I proceed

1. Which slice do you want first — **Critical only (items 1–2)**, or a wider **Critical + High (1–6)** first pass?
2. For **Stage 6 (self-unassign)**: preferred policy — admin-only, PSW-with-penalty, or PSW-free before X hours?
3. May I open the specific files marked *needs deep-dive* (auth, unassign, adjustments, realtime) as read-only next, and return with a tightened plan before any migration or edge-function edit?

I will not touch code until you answer.
