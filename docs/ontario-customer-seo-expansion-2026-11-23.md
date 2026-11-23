# Ontario customer SEO expansion — unpublished

## Result

Sitemap: **8,735 → 10,191 canonical URLs** (**+1,456 net**).
1,472 URLs gained eligibility; 16 lost eligibility after strict hometown reconciliation.
Remaining arithmetic gap to 31,000: **20,809 URLs**. This is not an indexing guarantee.

| Manifest route family | Before | After | Net |
| --- | ---: | ---: | ---: |
| Local service/city | 1,509 | 1,644 | +135 |
| Language/task/city | 2,276 | 3,604 | +1,328 |
| Language/city directory | 4,478 | 4,478 | 0 |
| Recruitment/city | 311 | 311 | 0 |
| Language hubs | 21 | 21 | 0 |
| Editorial/core (includes city home-care pages) | 140 | 133 | -7 |
| **Total** | **8,735** | **10,191** | **+1,456** |

The actual starting source roster contained **71** localities, not the previously reported 70. The fresh strict aggregate supports **64**. All 64 home-care city URLs are retained and indexable. Home-care-prefixed sitemap URLs total 70 (64 cities plus six hubs/guides); these counts are not interchangeable.

## Evidence and boundaries

- Read-only aggregate of hometown and distinct language codes only: explicit Ontario province; `psw_coverage_eligible_row`; `eligible_for_jobs=true`. Approved, active, unarchived, unbanned, non-test (including the existing test-domain exclusion), current non-null police check, no police-expiry flag. No identities, profile IDs, counts, addresses or coordinates collected in the evidence artifact.
- Normalize case, spacing and existing reviewed aliases into parent localities. Exclude Clarenville (not Ontario) and the generic value Ontario. No new municipality was discovered outside the existing reviewed locality roster.
- Ontario live/bookings/payments enabled; active service IDs standard, doctor-appointment and hospital-discharge. Alberta remains preparation/bookings/payments disabled.
- Fresh public `get_city_coverage_public` checks: 311 active catalog keys, complete inventory, zero failed lookups. These are radius-based aggregate results, **not** 311 confirmed hometown service areas.
- Additional catalog-city pages require both direct hometown evidence and fresh aggregate coverage (and matching language evidence for task-language pages). Non-catalog reviewed localities use direct hometown evidence and their reviewed regional context; no guessed coordinates.
- Saved hometown evidence is a dated aggregate snapshot, not a continuous roster subscription. Re-run the strict read-only aggregate and refresh it before a later release if the roster changes. Generation still aborts on failed public evidence reads rather than writing a partial snapshot.
- Existing eligible non-family service and directory families retain their prior rules; this request does not blanket-open catalog cities or reclassify all nearby results as verified service areas.

## Added and improved routes

- **144 new standard-service URLs**: 16 existing reviewed non-clinical task topics in nine verified non-catalog localities: Adjala-Tosorontio, Beaverton, Blackstock, Frankford, Kapuskasing, Otterville, Pefferlaw, Seguin and Tiny. Examples: `/post-surgery-care-kapuskasing`, `/memory-care-beaverton`, `/family-caregiver-relief-seguin`.
- **1,308 new language/task URLs**: seven distinct daily-task intents across 184 supported locality/language pairs, plus 20 personal-care/companionship URLs for non-catalog localities. English is included where actually listed. Unsupported language codes remain excluded.
- **20 existing personal-care/companionship URLs newly eligible** in roster localities without a city profile, using their reviewed area plus direct matching hometown-language evidence and fresh coverage. Example: `/hindi-personal-care-ingersoll`.
- Language task planning explicitly covers consent/stop signals for bathing; clothing choice/movement restrictions; bathroom privacy; transfer cues; housekeeping priorities; self-administered medication reminder boundaries; and respite handover/contact arrangements. It makes no fluency, interpreter, specialist, safety or schedule guarantee.
- Existing $40/hour, 2-hour increments, taxes/total-before-submission, 24/7 **customer support**, exact-address/suitability/acceptance confirmation, task-specific FAQs and call/request buttons are retained. Clinical treatment, nursing, wound care and rehabilitation are excluded. Transport pages/prices are untouched.
- City/service discovery reads the same generated eligible entries. Caregiver sections use the existing consent-filtered city RPC; no public cards were returned during inspection, so generic request wording was shown. Photos remain gated by the existing separately consented public source. No profile metadata or new profile routes were created.

## Exclusions reconciled

No current strict hometown evidence for Kenora, Cornwall, Midland, Markham, Port Carling, Nakina or Trent Lakes: their seven home-care city URLs leave the sitemap, retaining known-public noindex handling. Nine associated recovery/memory/post-surgery URLs in Cornwall, Midland and Markham also leave the sitemap. No production roster record was altered.

Private portals, booking/session pages, profiles, verification pages, unknown localities, Alberta routes, language mismatches and aliases remain excluded. Existing personal-care alias redirects retain their canonical target.

## Checks performed (no tests)

- Safe sitemap generation completed: 10,191 URLs; manifest/XML sets exactly equal, no duplicate URLs; no synthetic lastmod values.
- Every addition belongs to a generated content entry. New route registry has zero duplicate slugs. No private control paths appear in the sitemap.
- 32 desktop/mobile route observations (16 paths, 1280px desktop and 390px mobile), followed by six hub/redirect/transport observations. Valid examples had index/follow, one H1, matching self-canonical/OG, call/request buttons, and visible FAQ controls. No horizontal overflow or browser page errors observed on the initial sweep.
- Opened a respite FAQ and confirmed its answer; clicked Request home care and confirmed navigation to `/`. No booking submitted or payment attempted.
- `/home-care-markham`: noindex/follow; unsupported locality/language and Alberta examples: noindex/nofollow; login/profile/verification controls: noindex/nofollow. Unknown client verification showed Profile Not Found with no personal data.
- Automatic preview compilation: build OK. No manual build/typecheck or test suite commands run; no test files changed.
- Existing floating preview/app badges remain unchanged and can overlap small portions of mobile text while scrolling; badge changes are outside this request.

## Remaining blocks

31,000 cannot be justified by the 311 radius keys alone. Further localities require strict active Ontario hometown inventory or separately approved evidence-backed service areas; additional languages need matching eligible local language inventory; clinical/specialist and schedule-specific topics require actual capability/schedule evidence. More synonyms are not additional useful intents. The current finite reviewed topic set was expanded without those unsupported claims.

## Changed files

- `src/lib/verifiedHomeCareInventory.json` (new aggregate-only evidence)
- `src/lib/approvedHomeCareCities.ts`
- `src/pages/seo/verifiedLocalCareRoutes.ts` (new finite route registry)
- `src/lib/homeCarePlanning.ts`
- `src/components/seo/StandardHomeCareLocalPage.tsx`
- `src/lib/seoEligibilityManifest.ts`
- `src/App.tsx`
- `scripts/generate-sitemap.ts`
- `src/generated/seoEligibilityManifest.json`
- `public/sitemap-main.xml` (`public/sitemap.xml` unchanged: same chunk)
- `AGENTS.md`, `roadmap.md`, this report

Preview: https://id-preview--9525e8de-8fed-4e96-9eb8-bd37c04d17ef.lovable.app/post-surgery-care-kapuskasing

**No database/schema/business-setting writes, price changes, booking/dispatch changes, Search Console actions, deployment or publication.**