# Ontario customer home-care SEO validation — 29 October 2026

## Scope and revision

Started at `ce5f6facda6cf605e560c3afbf3a6a3bcd7dd663`. Publication is reserved for the owner after inspection; no deployment tool was called. The current final revision is available from `git rev-parse HEAD` after the managed save completes.

## Exact affected canonical pages

- 69 existing approved home-care city/locality pages, with the whitelist file unchanged.
- Four existing Ontario routes: `/home-care-ontario`, `/post-surgery-care-ontario`, `/dementia-care-ontario`, `/respite-care-ontario`.
- 1,216 existing eligible standard-service local pages: companion care 82; family caregiver relief 82; memory care 50; stroke-related daily support 82; personal care 82; bathing 82; dressing 82; toileting 82; aging in place 82; recovery care 50; hip-related daily support 82; knee-related daily support 82; medication reminders 82; light housekeeping 82; mobility 82; post-surgical daily support 50.
- 2,296 existing eligible task-language pages: personal care 1,148 and companionship 1,148. These actually render through `SupportedLocalCarePage`, not the excluded generic language-service fallback.
- **3,585 improved existing canonical pages total.** No new routes or city/topic combinations created. One existing route newly admitted to the sitemap/indexable set: `/respite-care-ontario`.
- 164 eligible doctor escort/hospital-discharge local routes retain their separate template and $50 display pricing; not counted as substantive home-care improvements. The central SEO telephone link also uses the same international number throughout.

## Content and discovery

City titles all start with `Home Care in {city}`; descriptions remain city/profile-specific rather than exclusively post-hospital intent. All 69 pages have visible planning FAQs, family handover guidance, links to the four hubs and only manifest-eligible same-city standard task pages where present. Sparse localities do not get fabricated task links or hospital facts.

The standard-service template provides reviewed service-specific preparation/FAQs, costs from the existing display-rate helper, 2-hour increments, 24/7 support contact distinction, call/request links, scope boundaries and manifest-only same-city related pages. Language task pages additionally explain communication, consent and the limits of self-listed language evidence; same-language same-city related task links are filtered to eligible pages.

Respite was already an Ontario hub route, with no redirect conflict, and is already a standard Home Care task (`DEFAULT_TASKS` id `respite`). Its former unsupported statistics, emergency dispatch, overnight and safety claims were replaced with useful task planning, family handover, request/acceptance, costs and FAQs. The existing hub registry mounts it without an App route change. Sitemap inclusion uses the existing live Ontario + offered standard-service gate.

Breadcrumb JSON-LD accompanies visible breadcrumbs. Visible FAQs are not assigned FAQPage structured data; no review/rating schema added. Existing telephone analytics and booking completion tracking were not changed.

## Generation and checks

- Ran existing `scripts/generate-sitemap.ts` flow: **8,651** unique main sitemap URLs, complete evidence snapshot, zero failed inventory cities.
- Compared baseline: exactly one addition (`/respite-care-ontario`), zero removals. Manifest and sitemap membership match exactly; all 69 roster pages retained; no private entries.
- Province snapshot: Ontario live; Alberta preparation with recruitment/bookings/payments false. No settings/database changes.
- Existing targeted `seoBulkEligibility` and `seoIndexingRegression` suites: **131 checks passed**. Updated the registry check to recognize the existing approved-city and hub registries, and added one behavioral check that respite fails closed without live Ontario/standard service evidence. No broad unrelated suite or implementation-mirroring content tests.
- Browser inspection: **24 desktop/mobile page combinations**, desktop 1280×1800 and phone 390×844. Checked Barrie, Nakina, Thornhill, all four hubs, family relief, bathing, English personal care and the two separate transport services. Single H1, self canonical, matching OG URL, index/follow, phone link, home-care rate/increments, visible FAQs/breadcrumbs and no horizontal overflow; no page errors.
- Additional rendered metadata sweep of **all 69 city pages**: 69 distinct descriptions, broad home-care-leading titles, single H1, self canonical, index/follow, visible FAQs.
- Respite booking CTA opened the existing homepage booking entry. No booking/payment was submitted or modified.
- Client/PSW login, invalid Geralton, unsupported Urdu overnight and Calgary home-care routes remained noindex in preview.
- Automatic compilation log reported `build OK` after source edits. Manual production build/typecheck was not run because environment instructions prohibit it; no separate standalone typecheck pass is claimed.

## Changed source and support files

Source:
- `src/lib/homeCarePlanning.ts` (new reviewed planning module)
- `src/lib/serviceOntarioHubs.ts`
- `src/components/seo/HomeCarePlanningFAQs.tsx` (new visible FAQ renderer)
- `src/components/seo/StandardHomeCareLocalPage.tsx` (new standard-service renderer)
- `src/components/seo/SupportedLocalCarePage.tsx`
- `src/components/seo/SeoCallCta.tsx`
- `src/pages/seo/ApprovedHomeCareCityPage.tsx`
- `src/pages/seo/HomeCareOntarioLandingPage.tsx`
- `src/pages/seo/FamilySupportServicePage.tsx`
- `src/pages/seo/ServiceOntarioHubPage.tsx`
- `scripts/generate-sitemap.ts`

Checks/generated/documentation:
- `src/pages/seo/__tests__/seoBulkEligibility.test.ts`
- `src/pages/seo/__tests__/seoIndexingRegression.test.ts`
- `src/generated/seoEligibilityManifest.json`
- `public/sitemap-main.xml` (`public/sitemap.xml` content unchanged)
- `AGENTS.md`, `roadmap.md`, this report.

## Not changed / unverified

No booking/payment/dispatch, taxes/rates, cancellation rules, roster/province switches, recruitment, admin, mobile, badges or backend changes. Protected floating badges were untouched; mobile screenshots still show their pre-existing corner overlap with lower text. No live post-publication check, Search Console submission, Google indexing confirmation, per-route server rendering or social-crawler preview validation. Client-rendered metadata is verified in preview; static social crawlers continue to receive the sitewide head until server rendering is adopted.