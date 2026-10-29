# Task Roadmap

## In Progress
- [ ] Ontario customer SEO: improve all 69 city pages, four family hubs and existing eligible standard/task-language pages; regenerate and validate; publication reserved for owner.
- [x] Unpublished Ontario family cluster: strengthened home-care entry and two existing service hubs; recovery/memory city eligibility roster-restricted; 69 localities unchanged; preview/metadata/sitemap checked (8,650 URLs), no tests/deployment. Details: docs/ontario-family-care-cluster.md.
- [x] Customer home-care SEO: improved main entry and homepage claims/links; consolidated two duplicate entries; excluded unverified Beaverton; 8,588 sitemap URLs, 183 tests passed, mobile/desktop phone and booking-entry checks passed; no publication. Area expansion stopped: Ontario has no approved city/zone list, and nearby home listings do not establish served areas.
- [x] Further SEO source audit: 656 task-bounded local care pages and 2,260 language-specific task pages added; 8,591 sitemap URLs; 178 SEO tests passed and mobile metadata/discovery checked; no export or publication.
- [x] Bulk PSW Direct SEO eligibility: 820 evidence-backed local care pages added; launch/service gates, sitemap/metadata/discovery synchronized; focused tests and browser checks passed; unpublished.
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

- [blocked] Fix www.pswdirect.ca HTTPS TLS failure — needs DNS edit at Bluehost (delete conflicting CNAME for www, keep A 185.158.133.1); same fix for www.psadirect.ca. Blocker: external registrar access

## Alberta launch readiness (Oct 16) — Alberta stays OFF
- [x] Checklist reopened (14 stale ticks), evidence-gated ticks, go-live guard
- [x] Alberta tax fail-closed (client, server, create-booking); Ontario unchanged
- [x] Alberta HCA/LPN/RN verification requires recorded registration evidence
- [ ] Admin form to record registration evidence (RPC exists; no screen yet)
- [ ] create-booking edge function change not deployed (user said no deploy)
- [blocked] Owner/accountant/lawyer/ops values — see report
