# Alberta Launch Audit (read-only, Oct 16 2026)

Nothing was changed. Every fact below comes from a live database read or a file read made today.

## 1. Current Alberta state

| Area | Current value | Source |
|---|---|---|
| Launch status | `preparation` | `provinces` (AB), last updated Sep 25 |
| Recruitment | OFF (it was ON Sep 16–25, then turned off) | `provinces`, `province_audit_log` |
| Client booking | OFF | `provinces.bookings_enabled` |
| Payment | OFF | `provinces.payments_enabled` |
| Worker wording | "Health Care Aide" / "HCA"; types HCA, LPN, RN; registration number required | `src/lib/provinceConfig.ts` lines 86-116, `src/hooks/useProviderTerm.ts` |
| Caregiver pay rates | HCA, LPN, RN all **blank** (Ontario PSW = 2100 cents is the only rate set) | `provider_earning_rates` |
| Client prices | 3 active rows: standard $40/h (2h min, payout $21), doctor escort $40→$50/h, hospital discharge $50/h (payout $27). These match Ontario numbers; no record shows anyone approved them for Alberta | `provincial_pricing` (created Sep 14) |
| Taxes | Code default: "GST", 0% home care, 5% escort/discharge. Not confirmed by an accountant | `provinceConfig.ts` lines 96-101; server fallback is Ontario HST (`supabase/functions/_shared/pricingTax.ts` line 166-208) |
| Cities | Calgary only | `provinces.cities` |
| Required documents | Empty list | `provinceConfig.ts` `requiredDocuments: []` |
| Terms / policies | 4 Alberta documents (provider agreement, client terms, privacy, service policy) are all **placeholder drafts, inactive** (`*-draft-v0`). Public Terms say Ontario law governs | `province_policy_documents`, `TermsOfServiceDialog.tsx` 13.1-13.2 |
| Alberta caregivers / orders / waitlist | 0 / 0 / 0 | `psw_profiles`, `bookings`, `province_waitlist` |
| Payment gate | Server refuses any order unless the province is active **and** booking **and** payment are on | `supabase/functions/create-booking/index.ts` ~line 400 |
| Alberta notifications | Not checked in this audit — unverified | — |

## 2. Done vs. unfinished

Built and in place: province table and admin switches (`ProvinceActivationCard.tsx`, audited, reason required); readiness checklist screen (`ProvinceReadinessChecklist.tsx`); Alberta rate screen (`ProviderRateConfigSection.tsx`, audited RPC, refuses to guess a rate); province-aware worker/order filters; server booking/payment block; HCA wording; tests (`phase10AlbertaRates`, `multiProvince`, `workerProvinceScope`, `serviceAreaOntarioOnly`).

Unfinished: real Alberta legal documents, approved pay rates, approved client prices, tax confirmation, Alberta required-documents list, city list beyond Calgary, Alberta notification wording check, any verified Alberta caregiver, Alberta test bookings.

## 3. Launch blockers

App / configuration work (after the owner supplies values):
- Load approved HCA/LPN/RN pay rates through the rate screen.
- Replace or confirm the 3 Alberta price rows.
- Set Alberta tax rules in the province record (server falls back to Ontario HST otherwise).
- Fill the required-documents list and cities.
- Upload real Alberta documents, mark them active and non-placeholder; Terms must not say "Ontario law only" for Alberta clients.
- Review email/push wording for "PSW" text in Alberta messages.
- Re-check every item on the readiness checklist (see section 5).

Needed from people:
- Owner: Alberta client prices, caregiver pay rates, cities, go-live decision.
- Accountant: GST treatment per service (home care vs escort/discharge).
- Lawyer: Alberta client terms, provider agreement, privacy notice, governing-law wording, whether HCA registration is required and how it is checked.
- Operations: support process, at least one verified Alberta caregiver, test booking sign-off.

## 4. Minimal launch order

1. Get legal, tax and pricing answers.
2. Load documents, rates, prices, taxes, cities, required documents.
3. Re-open recruitment; verify at least one HCA.
4. Run Alberta test bookings with Stripe test mode only.
5. Final checks: Ontario price/tax/pay unchanged; Ontario workers cannot see Alberta jobs; unverified HCA blocked; Alberta order charges the approved price and GST; no blank-rate earnings; active Alberta documents recorded on the order.
6. Turn on booking, then payment, through the audited switch with a reason.

## 5. Stale items vs. what you expected

- "14 checklist items incomplete": **stale.** All 14 are ticked complete, on Sep 16, by "office-owner-approval", with the note "Owner approved Alberta readiness checklist; recruitment opened." That doesn't match reality: rates are blank and the documents are still drafts. The checklist should be un-ticked or re-checked before anyone trusts it.
- "Recruitment off": correct now, but it was on from Sep 16 to Sep 25.
- "Rates not configured": correct for caregiver pay. But client price rows **do** exist.
- Booking/payment off, Ontario live: confirmed.
