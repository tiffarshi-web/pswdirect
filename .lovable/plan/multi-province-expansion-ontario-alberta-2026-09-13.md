# Multi-Province Expansion (Ontario + Alberta)

Goal: turn PSW Direct into a province-aware platform without touching how Ontario works today. Alberta is recruited and verified behind the scenes; Alberta client bookings stay off until an admin flips a dedicated switch.

Work is delivered in 5 phases so Ontario stays safe at every step.

## Phase 1 — Province foundation (database + config)

New province settings, stored in the database and editable by admins later:
- Province record: code, name, live for bookings (Ontario on, Alberta off), worker word ("Personal Support Worker"/"PSW" vs "Health Care Aide"/"HCA"), active cities, policy version.
- A single "Enable Alberta Live Bookings" switch, off by default.

Caregiver profiles gain: province, provider type, registration number, registration status, expiry, verified at/by, job eligibility flag.
Orders gain: service province, service city, pricing region, required provider type, policy version.
New provincial pricing table: province, city/zone, service, client hourly price, provider hourly payout, minimum hours, weekend/holiday premiums, travel charge, active.

All existing caregivers and orders are backfilled to Ontario. No record is ever set to Alberta. No existing price, payout or booking is altered; Ontario keeps using today's pricing path until a province explicitly has its own rows.

## Phase 2 — Access rules

Row-level rules updated so caregivers see only their own profile and only orders in their own province that they are eligible for; clients see only their own bookings; only admins can verify registrations, change eligibility, edit prices or activate a province.

## Phase 3 — Booking flow

The service address decides the province. Ontario addresses behave exactly as today. Alberta addresses (and any other province) show a Coming Soon panel with a waiting-list form and cannot reach payment — enforced on the server too, so payment stays blocked for Alberta until the live switch is on.

## Phase 4 — Alberta caregiver onboarding + matching

Alberta applicants provide practice-permit number, status, expiry, supporting document, education, CPR/first aid, ID, references, screening documents and an Alberta-specific agreement. They stay ineligible until an admin verifies. Eligibility auto-suspends on expiry, restriction or rejection, with renewal warnings to caregiver and admin beforehand.

Job matching adds province match, provider-type match, active registration and eligibility to the existing distance/availability/suspension checks. Ontario caregivers can never see Alberta jobs.

## Phase 5 — Admin tools

A province selector (All / Ontario / Alberta) across workers, applications, orders, coverage maps, pricing, payouts, documents, incidents and reports. A new Provincial Settings page to pause/activate a province, manage cities, terminology, prices, payouts, booking minimums, travel zones, required documents, policy version, and the Alberta live-bookings switch.

## Testing

New tests: Ontario bookings unaffected; Ontario caregivers rejected from Alberta orders; unverified/expired Alberta workers blocked; correct provincial price charged; correct provincial agreement recorded; unsupported province cannot pay; admin province filters work. Existing geofencing, care sheet, photo, notification and payout tests must keep passing.

## Notes

- Nothing is published; the platform stays as-is for clients until you approve.
- Alberta pricing, city list and required documents need real values from you before Alberta can go live — placeholders will be marked clearly.
