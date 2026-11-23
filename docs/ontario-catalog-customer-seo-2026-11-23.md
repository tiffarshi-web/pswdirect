# PSW Direct Ontario customer SEO expansion

## Result — preview only

The sitemap increased from **10,191 to 14,042 canonical URLs**, adding **3,851** and removing **none**. The remaining gap to 31,000 is **16,958**. No publication, deployment, Search Console action, database/schema/business-setting write, price change, booking/dispatch change, mobile change, or test-suite/test-file change was made.

## Exact page-family counts

| Family | Before | After | Change |
| --- | ---: | ---: | ---: |
| Local service + city | 1,644 | 5,250 | +3,606 |
| Language task/service + city | 3,604 | 3,604 | 0 |
| Language + city directory | 4,478 | 4,478 | 0 |
| Recruitment + city | 311 | 311 | 0 |
| Language hubs | 21 | 21 | 0 |
| Home-care city pages | 64 | 309 | +245 |
| Other editorial/core pages | 69 | 69 | 0 |
| **Total** | **10,191** | **14,042** | **+3,851** |

The manifest combines the last two content families under `editorial-core`: 133 → 378. Of the 5,250 local service pages, 5,072 cover the sixteen reviewed standard-home-care topics, and 178 are unchanged transport pages. Home-care-prefixed URLs total 315 (309 city pages plus six existing hubs/guides/other entries); this is not an additional page family.

## Full catalog, with existing duplicate exclusions

The source catalog actually contains **313 unique keys**, rather than the 311 in the request. The expansion considered the entire catalog, not the current hometown roster. There are **300 non-alias catalog planning locations**, plus **nine preserved non-catalog locations**, giving 309 home-care city pages.

Thirteen existing neighbourhood consolidations remain excluded from new home-care entries and new task permutations: Ancaster, Dundas, East York, Etobicoke, Kleinburg, Maple, North York, Orleans, Scarborough, Stittsville, Stoney Creek, Woodbridge and York. Existing indexable task pages in eight profiled neighbourhoods retain their prior eligibility, not a blanket new alias expansion. No existing sitemap URL was removed, and previously excluded home-care neighbourhood entries remain noindex.

The nine preserved non-catalog locations are Beaverton, Otterville, Adjala-Tosorontio, Frankford, Seguin, Blackstock, Tiny, Pefferlaw and Kapuskasing. Their existing roster-backed inclusion was not expanded to unsupported additional non-catalog names.

## Reviewed intents and useful ceiling

Sixteen existing reviewed non-clinical task/service intents are now available across the non-alias planning catalog: companionship, personal care, bathing, dressing, toileting, mobility assistance, light care-related housekeeping, medication reminders, family caregiver relief/respite, aging-in-place support, memory-related routines, general recovery daily help, post-surgical daily help, daily help after hip replacement, daily help after knee replacement, and daily help after stroke. Home care remains the city-level parent rather than another synonymous service permutation.

The surgical, hip/knee and stroke pages describe ordinary daily tasks under existing care-team instructions, not treatment, nursing, rehabilitation or promised recovery. Each task uses its distinct reviewed summary, task list, preparation guidance and two task-specific FAQs, plus shared price/confirmation/scope FAQs and internal family planning links. Local context uses existing city profiles or existing reviewed locality context only; missing municipal facts are omitted rather than invented.

**14,042 is the useful total supported by this expansion's current reviewed intents and unchanged language/transport gates**, not a claim that no other useful content can ever be written. Reaching 31,000 now would require additional genuinely distinct reviewed topics or unsupported language/schedule/alias permutations. None were invented to inflate the total. Shared template copy still repeats across cities; city pages do not guarantee Google indexing or ranking.

## Eligibility, copy and privacy

- New non-language standard-care planning pages no longer require a directly headquartered caregiver, nearby inventory, or a city-profile county/region. They require a recognized planning location, canonical route, reviewed substantive task content/FAQs, and the existing live Ontario standard-service gate.
- Availability, exact address, requested tasks/date/hours, suitability and caregiver acceptance must be confirmed for the particular request. Visible copy explicitly says the page is not evidence of a locally based caregiver or available visit.
- Home care remains $40/hour in two-hour increments, with applicable taxes and total shown before submission. Customer support remains available 24 hours a day, seven days a week; this is not continuous care.
- Language task routes, language directory eligibility and transport eligibility retain their previous gates. Language page records and eligible language-city slugs were unchanged after regeneration; no new language-match claim was introduced.
- Caregiver sections still use the existing consent-filtered public source, including its separate photo-consent safeguard. No public identity gate, profile rule, private field or per-caregiver distance output was changed. No caregiver identities or counts are included in this report.
- Private, invalid and unsupported routes remain excluded, including private profiles, auth, administration, payment and verification routes. Existing redirect paths remain excluded from the sitemap.
- Read-only generation confirmed Alberta remained in preparation with recruitment, bookings and payments OFF. Ontario booking and dispatch controls were not modified.

## Validation performed

- Ran safe sitemap generation successfully, with zero failed evidence lookups; generated XML and manifest agreed exactly on all 14,042 unique canonical paths.
- Confirmed every previously included sitemap path remains included and language eligibility records remain unchanged.
- The platform's automatic compilation reported `build OK`; no manual production build/typecheck or automated test suite was run.
- Rendered 19 public examples across all sixteen task intents plus home-care parents and existing Toronto/Kapuskasing examples. Each showed HTTP 200, one H1, `index,follow`, a pswdirect.ca self-canonical, $40/hour/two-hour wording, confirmation caveats and telephone links. Dryden examples contained approximately 605–667 visible main-content words (excluding closed FAQ answers).
- Inspected 390 × 844 mobile examples for home care, post-surgical support, memory support and caregiver relief; no horizontal overflow. Inspected desktop screenshots and an opened bathing FAQ. Existing floating preview widgets remain unchanged and can overlap a small portion of lower-right mobile copy; this request did not alter their settings or behavior.
- Exercised the discovery flow from Ontario home care → Dryden home care → bathing assistance, opened a FAQ, and clicked the request CTA back to the existing homepage booking entry. No booking/payment was submitted or changed; call links were checked without placing calls.
- Checked private/auth/payment/verification routes, an invalid Geralton task route and unsupported Calgary home-care route for noindex. Confirmed personal-care alias navigation reaches the canonical personal-care-assistance route.
- Rendered previously excluded Scarborough/Woodbridge/Orleans home-care entries and an unexpanded Woodbridge bathing entry: all remained noindex.
- No page-level runtime errors were observed in the public-page browser checks. Search Console and production Google indexing were not checked or changed.

## Files changed

1. `src/lib/ontarioCustomerCities.ts` — new SEO-only planning registry, existing alias exclusions, preserved non-catalog localities.
2. `src/pages/seo/verifiedLocalCareRoutes.ts` — generate missing reviewed non-language routes across planning cities; preserve strict language-task generation.
3. `scripts/generate-sitemap.ts` — reviewed planning eligibility, city parent inclusion, policy metadata; keep language/transport/public launch and fail-before-write safeguards.
4. `src/lib/seoEligibilityManifest.ts` — planning policy/city fields in the manifest interface.
5. `src/generated/seoEligibilityManifest.json` — regenerated eligibility and discovery data.
6. `public/sitemap-main.xml` — regenerated canonical URL list; the sitemap index content was unchanged.
7. `src/App.tsx` — mount catalog home-care parents with existing route ownership preserved.
8. `src/pages/seo/ApprovedHomeCareCityPage.tsx` — planning registry, conditional availability, no stationed-caregiver statement, useful address preparation.
9. `src/components/seo/StandardHomeCareLocalPage.tsx` — catalog parent links and explicit request/availability qualification.
10. `src/pages/seo/HomeCareOntarioLandingPage.tsx` — discover all eligible planning city parents, without a coverage promise.
11. `src/pages/seo/CitiesHubPage.tsx` — planning-oriented copy and catalog discovery, with manifest-filtered links.
12. `AGENTS.md` — updated SEO registry/gating architecture rules.
13. `roadmap.md` — this task marked complete; unrelated pre-existing tasks unchanged.
14. `docs/ontario-catalog-customer-seo-2026-11-23.md` — this report.

Project memories were also corrected to record the owner's replacement of the hometown-only SEO restriction; they are not application files.

## Preview examples

- https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app/home-care-dryden
- https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app/post-surgery-care-dryden
- https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app/memory-care-dryden
- https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app/family-caregiver-relief-dryden
- https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app/bathing-assistance-dryden

All changes remain in preview. Nothing was published.