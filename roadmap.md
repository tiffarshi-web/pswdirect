# Task Roadmap

## In Progress
- [ ] Ping-and-watch live test: CDT-000447 pinged to 52 Hamilton-area caregivers (all push deliveries HTTP 200); awaiting a PSW to claim, arrive, check in, complete care sheet, and sign out

## Done
- Firebase Android config (`google-services.json`) added for ca.pswdirect.worker; copied into the generated Android project via `npm run cap:firebase:worker:android`, verified in CI. Server-side FCM service account still to be connected.
- Caregiver dashboard review — reported (upcoming orders, history + care sheets exist; coverage map component is dead code, improvement not authorized)
- City field added to client booking flow (pickup + destination city in new-client and returning-client flows); typecheck clean
- Fixed broken push deep link (/psw/jobs/undefined) — notify-psws now resolves booking_code from booking_id; deployed
- Islamabad SEO hub + 4 service pages: routes, internal links, sitemap, typecheck, tests (unpublished)
