# PSW Direct — National Expansion Readiness Report
Status: **AUDIT ONLY — no production behaviour changed.** Ontario remains the only active, publicly bookable province.
Date: 2026-09-09

---

## 1. Executive summary

PSW Direct is a **single-province product**, not a multi-province product defaulted to Ontario. Province is not a first-class concept anywhere: there is no `province` column on `bookings`, no province dimension in pricing, tax, dispatch, geofencing, SEO or compliance. Ontario is encoded as literals (`'ON'`, `America/Toronto`, `0.13`, Ontario FSA tables, Ontario city lists, Ontario governing law) in roughly 60+ distinct places across the frontend, edge functions and SQL functions.

One material inconsistency exists today: the client booking form already offers **ON / QC / BC / AB** in the province selector (`src/components/booking/StepLocation.tsx:188-198`), while geocoding, tax, dispatch and legal text behind it are Ontario-only. A non-Ontario address entered today is silently geocoded as Ontario, taxed at Ontario HST rules, and dispatched against Ontario coverage math. **Recommended immediate (post-review) hardening: restrict that selector to ON until province config ships.**

---

## 2. Ontario-specific assumptions found

### 2.1 Database (live schema)

| Object | Assumption |
|---|---|
| `bookings` | **No province or timezone column at all.** Geography inferred only from lat/lng + postal code. `hst_amount`, `is_taxable` present but rate is not stored |
| `care_recipients.province` | `DEFAULT 'ON'` — the only column-level Ontario default in the schema |
| `psw_profiles.home_province` | plain text, no default, populated on only 2 of 350 rows |
| `invoices.client_province` | text, `ON` on 314 rows, blank on 89 |
| `pricing_configs.toronto_surge_rate` | An Ontario city named as a **column** |
| `pricing_settings`, `pricing_configs`, `app_settings` | Single global rate set; no per-province dimension exists |
| `psw_eligible_booking_ids()` | Hard-coded bounding box `lat 41.5–57.0`, `lng -95.5 – -74.0` (Ontario/eastern Canada) and `AT TIME ZONE 'America/Toronto'` for claim-window math |
| `active_service_radius_km()` | Falls back to hard-coded 75 km |
| `get_nearby_psws()` / `count_nearby_psws()` | Haversine only, default 50/75 km, **no province filter** |
| `admin_set_billable_hours()` | `v_tax_rate := 0.13` |
| `admin_finalize_paid_booking_from_stripe()` | `v_hst_amount := subtotal * taxable_fraction * 0.13` |
| `mask_service_address()` | Strips literal `^(ON|Ontario|Canada)$` |
| Constraints | **No CHECK constraint restricts province values anywhere** |
| RLS | `app_settings`, `pricing_configs`, `pricing_settings` are admin-write-only via `has_role(auth.uid(),'admin')` — good baseline for province config |

### 2.2 Geography, geocoding, dispatch

| Location | Assumption |
|---|---|
| `src/lib/postalCodeUtils.ts` | `ontarioFSACoordinates` table (Ontario FSAs only); `ONTARIO_CITIES`; `PROVINCES` map with only `ON` populated; `OFFICE_POSTAL_CODE = "K8N 1A1"` |
| `src/lib/autoGeocodeUtils.ts:54` | Literal `"Ontario"` injected into every geocode query regardless of entered province |
| `supabase/functions/_shared/resilientGeocode.ts` | `province` defaults to `"ON"`; `KNOWN_ONTARIO_CITIES` centroid table used for sanity radius |
| `supabase/functions/_shared/geoSanity.ts` | Same Ontario centroid dependency |
| `src/lib/serviceRadiusStore.ts`, `src/lib/nearbyPSWs.ts` | Distance math with no province dimension — FSA collisions across provinces possible |
| `src/components/admin/UnifiedAdminMap.tsx` | Ontario city presets; default viewport centred on central Ontario |

### 2.3 Pricing, tax, finance

| Location | Assumption |
|---|---|
| `supabase/functions/_shared/pricingTax.ts:19` | `HST_RATE_BPS = 1300` — authoritative engine, single rate |
| `src/lib/taxRules.ts:12` | Same constant mirrored client-side |
| `src/lib/taskConfig.ts` | Per-task `applyHST` boolean, Ontario semantics |
| `supabase/functions/_shared/groupInvoiceHtml.ts:126,136` | Invoice prints "HST" and "exempt from HST in Ontario" |
| `src/components/admin/AccountingDashboardSection.tsx` | Ontario HST logic mirrored in reporting |
| Stripe functions | `currency: "cad"` hard-coded (correct Canada-wide; flagged only for completeness) |
| Payouts | Flat national rates; no per-province minimum-wage or pay-floor logic |

### 2.4 Time zones

`America/Toronto` hard-coded in: `src/hooks/usePayoutRequests.ts:50`, `src/hooks/useUpcomingEarnings.ts:26`, `src/components/psw/EarningsForecast.tsx:12`, `EarningsSnapshotWidget.tsx:17`, `src/components/admin/JobNotificationHealth.tsx:93`, `src/components/psw/NotificationsBell.tsx:47`, `supabase/functions/expire-unclaimed-bookings/index.ts:78-84`, and SQL `psw_eligible_booking_ids`.

### 2.5 Professional applications and credentials

| Location | Assumption |
|---|---|
| `src/pages/PSWSignup.tsx:92,920-931` | Province defaults `"ON"` and the province input is **disabled** |
| `src/pages/PSWSignup.tsx:1060` | `ontario_photo_card` ID type |
| `src/pages/PSWSignup.tsx:43` | Vehicle disclaimer cites **Ontario law** |
| PSW admin components | "VSC" (Vulnerable Sector Check) label + 1-year expiry hard-coded throughout |
| Title | "PSW" is the Ontario term; BC uses HCA (Health Care Assistant, registry-governed), QC uses PAB |

### 2.6 Legal, terms, consent

`src/components/client/TermsOfServiceDialog.tsx` — "Ontario, Canada", "ONTARIO-SPECIFIC REGULATORY DISCLOSURES", "operates exclusively in Ontario", governing law = Province of Ontario. Cancellation/refund policy (4-hour rule, `CANCELLATION_THRESHOLD_HOURS` in `src/lib/businessConfig.ts:35`) is a single global rule.

### 2.7 SEO, analytics, tests

- `src/lib/seoCityData.ts` — Ontario cities only; drives sitemap, routes, admin map presets and the eligibility manifest.
- `scripts/generate-sitemap.ts` + `src/App.tsx` — 40–60 Ontario-suffixed routes/slugs (`/home-care-ontario`, `/psw-work-areas-ontario`, `ONTARIO_HUBS`, …).
- `src/lib/seoEligibilityManifest.ts` — good precedent: publication is already gated by a generated eligibility manifest. Extend this gate with province status rather than inventing a new one.
- Tests/fixtures assume Ontario coordinates, 13% HST and Toronto time.

---

## 3. Proposed province configuration model (design only — not implemented)

One controlled source: a `provinces` table plus child tables, admin-write-only, with an audit trail. No component may hard-code province behaviour; all read through a single `getProvinceConfig(code)` accessor (client) / `province_config(code)` (SQL).

```text
provinces
  code (PK, 'ON'|'AB'|'BC'|...)   legal_name
  status ('active'|'recruitment_only'|'waitlist'|'unavailable')
  timezone (IANA)                 currency ('CAD')
  booking_enabled bool            recruitment_enabled bool
  seo_status ('published'|'draft'|'hidden')
  emergency_info jsonb            support_info jsonb
  min_booking_hours numeric       cancellation_policy_id
  effective_from / effective_to

province_service_areas
  province_code, city, region, centroid_lat/lng, radius_km,
  status ('active'|'pilot'|'paused'), booking_enabled, recruitment_enabled, seo_published

province_service_pricing
  province_code, service_code, client_rate_first_hour, client_rate_per_30min,
  psw_payout_rate, min_duration_hours, travel_fee_rules jsonb,
  max_travel_distance_km, effective_from/to

province_tax_rules            -- service-level, dated, never inferred
  province_code, service_code, tax_treatment ('exempt'|'zero_rated'|'taxable'),
  gst_bps, hst_bps, pst_bps, qst_bps, display_label,
  effective_from/to, source_note, reviewed_by_accountant bool

province_compliance
  province_code, required_credentials jsonb, protected_titles jsonb,
  document_rules jsonb, screening_rules jsonb, insurance_rules jsonb,
  worker_classification_note, privacy_regime, language_requirements,
  legal_review_status ('unverified'|'counsel_reviewed'), reviewed_at

province_terms
  province_code, governing_law, terms_md, disclosures_md, version, effective_from

province_config_audit
  actor, province_code, table_name, before jsonb, after jsonb, reason, created_at
```

Rules:
- All writes go through `SECURITY DEFINER` RPCs (`admin_set_province_status`, `admin_set_province_pricing`, `admin_set_province_tax_rule`, …) gated by `has_role(auth.uid(),'admin')`, each writing `province_config_audit`. Direct table writes revoked.
- Tax rows are **dated and never defaulted**: absence of a row = booking blocked in that province, never "assume exempt".
- Ontario is seeded from current live values so behaviour is byte-identical at cutover.

---

## 4. Tax safety

Current state assumes: home care exempt; doctor escort and hospital discharge taxable at 13%. That single rule is repeated in four places (client mirror, server engine, two SQL functions) and in invoice copy.

Flag for accountant review (do not treat any of these as settled):
1. Is home care GST/HST exempt in every target province, or is Ontario's treatment being over-generalized?
2. Are medical-transport/escort services taxable nationally, or does treatment vary?
3. BC/SK/MB PST applicability to care and transport services.
4. QC QST registration and dual GST+QST invoice presentation.
5. Whether the platform is agent or principal per province (affects who charges tax on the PSW's fee).
6. GST/HST registration thresholds and place-of-supply rules for cross-province bookings.
7. Receipt/accounting record requirements per province (tax number display, itemization).

Design: tax must be resolved as `resolveTax(province, service_code, service_date)` returning `{treatment, components[], label}`; no rate literal may remain in code. Effective dates make historic invoices reproducible.

---

## 5. Professional compliance — items requiring legal confirmation

For **each** province/territory, unverified until counsel confirms:
business or homecare-agency licensing; protected titles (e.g. BC's HCA registry, QC's PAB); registration/registry requirements; scope of practice (medication, transfers, wound care); criminal-record and vulnerable-sector screening rules and validity periods; liability and auto-insurance requirements; worker classification (contractor vs employee) and provincial ESA equivalents; privacy/health-information regimes (PHIPA ON, HIA AB, PIPA BC, Quebec Law 25); language requirements (QC French obligations); consumer-protection and cancellation-notice rules.

No legal conclusions are asserted in this report.

---

## 6. Geography and dispatch design

- Bookings validated against `province_service_areas` where `booking_enabled` — outside an active area the flow offers a waitlist, never a booking.
- PSWs carry approved province + service areas; `psw_eligible_booking_ids` gains a province/service-area join so a PSW can never see or claim out-of-province work.
- The hard-coded lat/lng bounding box is replaced by per-service-area centroid + radius.
- Claim-window and expiry math uses `provinces.timezone`, not `America/Toronto`.
- Geocoding takes province as a required input; FSA/centroid tables become per-province (or fully delegated to Google with province-validated sanity checks).
- Cities can be activated independently; recruitment can open before bookings; a province can be paused with zero effect on Ontario (Ontario rows untouched).
- Coverage map keeps the current colour contract: green = unassigned/open, blue = assigned/active, worker palette distinct (orange/violet/grey); adds a province/service-area filter.

---

## 7. SEO architecture

Target hierarchy `/locations`, `/locations/<province>`, `/locations/<province>/<city>`; existing Ontario URLs preserved and 301-mapped only when a canonical move is deliberately approved.

Publication gate (extend `seoEligibilityManifest`): a page is emitted only when the service area is `active`, `booking_enabled`, provider coverage exists, original local content is present and pricing/service claims are accurate. Otherwise the route is `noindex` and absent from the sitemap. No city-swap doorway pages.

---

## 8. Administrator expansion dashboard (design)

Per province and city: launch status; approved professionals; available capacity vs. demand; waitlist size; unserved-order count; booking volume; acceptance rate; no-show rate; coverage percentage; revenue and payouts; compliance readiness checklist; outstanding launch blockers with owner. Actions (activate city, open recruitment, pause province, edit rates/tax) all route through the audited RPCs.

---

## 9. Security and privacy risks

- Today any admin-role user can change global pricing/radius; province config needs the same admin gate **plus** audit history and ideally a separate `expansion_admin` capability.
- Cross-province data exposure: `psw_safe_booking_view` masking rules must be re-verified per province privacy regime (Quebec Law 25 in particular).
- FSA collisions across provinces could leak or misroute addresses if the Ontario FSA table is reused nationally.
- Tax misstatement on receipts is a compliance risk, not just a bug — hence the "no row = blocked" rule.

---

## 10. Recommended automated tests

Province resolution and fallbacks; tax matrix per province × service × date (including "no rule = blocked"); dispatch isolation (AB PSW never sees ON job and vice versa); timezone correctness for claim/expiry across DST; geocode sanity rejecting out-of-province matches; SEO manifest excludes non-active provinces from sitemap and marks them `noindex`; Ontario golden-file regression proving byte-identical pricing/tax before and after config extraction.

---

## 11. Migration and rollback plan

1. Create config tables and RPCs; seed Ontario from live values. No reads switched. (Reversible: drop new objects.)
2. Add `province` to `bookings`/`psw_profiles` (nullable), backfill `'ON'`, keep writes dual. (Reversible: ignore column.)
3. Switch tax engine to config-driven behind a feature flag; golden-file test must prove identical Ontario output. (Rollback: flip flag.)
4. Switch dispatch/geofence/timezone to config. (Rollback: flip flag.)
5. Only then activate Alberta in `recruitment_only`.

Each step is independently revertible; Ontario rows are never rewritten.

---

## 12. Phase 1 — Alberta implementation plan

1. Legal review: Alberta licensing, HCA/title rules, screening, insurance, worker classification, HIA privacy.
2. Accountant sign-off on Alberta GST (5%) treatment per service; load `province_tax_rules` with effective dates.
3. Seed `provinces` row `AB` = `recruitment_only`, timezone `America/Edmonton`; service areas Calgary and Edmonton with centroid + radius.
4. Load Alberta pricing and payout rates (must be set explicitly — no inheritance from Ontario).
5. Enable PSW recruitment: province selector unlocked, Alberta ID types, Alberta credential/document rules, Alberta disclaimers.
6. Recruit and approve caregivers to a capacity threshold per city.
7. Publish Alberta terms and disclosures; add support/emergency info.
8. Flip `booking_enabled` for Calgary first, then Edmonton; publish SEO pages only after coverage and original content exist.
9. Monitor the expansion dashboard; pause switch available at city granularity.

**Reusable from Ontario:** booking flow UI, dispatch engine, Stripe/CAD payments, notifications, care sheets, payouts mechanics, maps, admin tooling, PWA.
**Must be province-specific:** tax rules, prices and payout rates, minimum duration, travel fees, timezone, credentials/titles/screening/insurance, terms and disclosures, cancellation policy, support contacts, service areas, SEO content.

---

## 13. Estimated sequence

Config foundation and Ontario parity (steps 1–4 above) → Alberta recruitment → Alberta bookings (Calgary, then Edmonton) → BC → MB/SK → Atlantic → Quebec (bilingual + Law 25 + QST, treat as a separate programme) → Territories after feasibility review.

---

## 14. Confirmation

No production behaviour was changed by this audit. No migrations were created, no rows modified, no functions deployed, no pages published, no prices, taxes or Stripe settings touched. Ontario remains the only active, bookable province. The only artefact produced is this document.
