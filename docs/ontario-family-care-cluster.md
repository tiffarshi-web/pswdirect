# Unpublished Ontario family-care cluster

## Routes and content

- `/home-care-ontario`: strengthened main family entry for regular home care, non-clinical post-surgical support and dementia-related daily support/respite; descriptive links to the two existing service hubs.
- `/post-surgery-care-ontario`: corrected existing hub with discharge preparation, everyday tasks, clinical exclusions, booking steps and factual FAQs. Hospital pickup remains a separate service.
- `/dementia-care-ontario`: corrected existing hub with respectful routines, consent, communication, handover and respite guidance; no specialist-training, clinical supervision, safety or 24-hour care claims.
- Existing `/home-care-{locality}` pages for all 69 whitelist localities: useful links to the two central hubs, no new city routes or coordinate-based nearby links.
- Existing `/post-surgery-care-{city}`, `/recovery-care-{city}` and `/memory-care-{city}`: improved non-clinical scope, booking guidance, pricing/support wording and parent links. Eligibility additionally requires membership in the unchanged roster whitelist. Fifty existing canonical city routes per family pass the existing local-content, province, offered-service and inventory gates; no city/service combinations were added. The remaining roster locations use their existing home-care pages and the central service guidance.
- Generic `/dementia-care-{city}` routes were not newly indexed. No specialist service or overnight-language combinations were introduced.

## Source evidence and safeguards

`src/components/booking/types.ts` defines Home Care (`standard`) separately from Doctor Escort and Hospital Discharge. `src/lib/taskConfig.ts` supplies personal care, companionship, meal preparation, light housekeeping and respite options. The existing eligibility snapshot confirms standard service offered, Ontario live with bookings/payments enabled, and Alberta preparation with recruitment/bookings/payments disabled. The preview booking entry successfully navigated through Home Care and family recipient selection to scheduling; no booking was submitted. Task selection was not shown in that entry path, so live task-level availability was not independently verified beyond the inspected configuration. Every request remains subject to its confirmed scope and suitable caregiver acceptance.

No booking/payment logic, prices, province switches, database records, worker recruitment rules or private-route protections were modified. No caregiver identities, roster counts, addresses or schedules were added to public pages. $40/hour and 2-hour increments preserved; 24/7 means customer-support contact availability only.

## Metadata and sitemap verification

Unpublished preview checked at 390px and 1280px. All three central pages returned HTTP 200, exactly one H1, distinct title/description, one self-canonical on `https://pswdirect.ca`, and `index,follow`; all three are in the regenerated draft sitemap. Representative `/home-care-barrie`, `/home-care-nakina`, `/post-surgery-care-barrie` and `/memory-care-toronto` had the same indexability/canonical results. No horizontal overflow or page errors observed. Call links target the approved number; hub-to-service and booking-entry links were exercised.

`/post-surgery-care-north-york` remained `noindex,follow` and absent from sitemap; `/client-login` remained `noindex,nofollow` and absent. Two existing central hubs entered the sitemap; 96 proximity-only recovery/memory-family entries were removed by the roster restriction. Total draft sitemap: 8,650 URLs. Home-care locality pages: unchanged at 69.

Metadata is React-rendered in the current SPA, not server-rendered per-route metadata. These are preview DOM results, not a Google crawl, Search Console validation or proof of indexing. Nothing was published or deployed. Existing floating overlay badges remain unchanged and can overlap lower-right mobile copy; changing protected badge integrations was outside scope.

## Exact changed files

- `src/lib/serviceOntarioHubs.ts`
- `src/pages/seo/FamilySupportServicePage.tsx` (new)
- `src/pages/seo/ServiceOntarioHubPage.tsx`
- `src/pages/seo/HomeCareOntarioLandingPage.tsx`
- `src/pages/seo/ApprovedHomeCareCityPage.tsx`
- `src/components/seo/SupportedLocalCarePage.tsx`
- `scripts/generate-sitemap.ts`
- `src/generated/seoEligibilityManifest.json`
- `public/sitemap-main.xml`
- `public/sitemap.xml` (regenerated index; same chunk destination)
- `AGENTS.md`
- `roadmap.md`
- `docs/ontario-family-care-cluster.md`

No tests were run, as requested. Latest automatic preview compilation reported `build OK`; no manual build/typecheck was run.