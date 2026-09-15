# Task Roadmap

## In Progress
- [ ] Ping-and-watch live test: CDT-000447 pinged to 52 Hamilton-area caregivers (all push deliveries HTTP 200); awaiting a PSW to claim, arrive, check in, complete care sheet, and sign out

## Done
- Phase 3 shift/attendance/care-sheet hardening: voided attendance blocks completion, weak-GPS sign-out routes to office review, safety/incident + follow-up fields, one-time client report delivery, earnings routed to pending office review (28 new tests)
- Firebase Android config (`google-services.json`) added for ca.pswdirect.worker; copied into the generated Android project via `npm run cap:firebase:worker:android`, verified in CI. Server-side FCM service account still to be connected.
- Caregiver dashboard review — reported (upcoming orders, history + care sheets exist; coverage map component is dead code, improvement not authorized)
- City field added to client booking flow (pickup + destination city in new-client and returning-client flows); typecheck clean
- Fixed broken push deep link (/psw/jobs/undefined) — notify-psws now resolves booking_code from booking_id; deployed
- Islamabad SEO hub + 4 service pages: routes, internal links, sitemap, typecheck, tests (unpublished)

## Phase 6 — Notifications & alerts (complete, awaiting approval)
- [x] Office address-problem alert sender corrected to PSW Direct and deduplicated
- [x] Device registration lifecycle: protected register/deactivate actions, one owner per device, invalid-device cleanup
- [x] Delivery status taxonomy recorded honestly (service_accepted != delivered)
- [x] Server-side rate limits: test alerts (5/hr), device registration (20/hr)
- [x] Admin notification delivery dashboard with masked recipients and channel gaps
- [x] Phase 6 contract tests (22) — full suite 579 passing
- [ ] Real-device Android beta verification (needs a physical handset; no device registered yet)
- [ ] iOS: APNs key + provisioning not yet supplied
