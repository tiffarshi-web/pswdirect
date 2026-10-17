# Read-only audit: pswdirect.ca Ontario SEO and lead conversion (Oct 17 2026)

Nothing was changed. Evidence: live fetches of pswdirect.ca, a phone-sized headless browser on the live site, and source/sitemap reads at HEAD `70f141dd`.

## 1. Aug 21 deterministic SEO repair: is it live?

- **Implemented and live.** The live site serves the same bundle on every route. The live `sitemap-main.xml` has 4,855 URLs, the same count as the local file. `robots.txt` allows crawling.
- Representative URLs, rendered live:

| URL | Live robots | Canonical | In sitemap | Correct? |
|---|---|---|---|---|
| /psw-jobs-acton | index,follow | self | yes | yes |
| /psw-jobs-dryden | index,follow | self | yes | yes |
| /psw-jobs-geralton | noindex,nofollow, "404" page | none | no | yes, but the server still returns HTTP 200 (soft 404) |
| /turkish-speaking-psw-norwood | noindex,follow | self | no | yes, intentionally excluded (no caregiver nearby) |

- **Still to do in Search Console (owner only):**
  1. Resubmit `https://pswdirect.ca/sitemap.xml`.
  2. Run URL Inspection, then Request indexing, for /psw-jobs-acton and /psw-jobs-dryden.
  3. Click "Validate fix" on the noindex and crawled-not-indexed reports.
- **Expected to stay in the reports:** most of the 8,341 noindex pages (intentional exclusions), the 211 redirects (old aliases), and the soft 404s. Our hosting returns HTTP 200 for missing pages, so the soft 404s cannot be fixed in code.
- **Missing evidence:** current Search Console numbers after Aug 21, and when the bundle was deployed. I have not checked Search Console, and I cannot say Google has reprocessed anything.

## 2. Inconsistent prices and claims (no prices changed)

- **Doctor escort priced wrong.** /doctor-escort-barrie shows "$40/hr", but the approved price is $50. The same template serves every expanded city and service page: `src/pages/seo/ExpandedCityServicePage.tsx` lines 37 and 157. Today these pages are noindex, so the risk is to visitors, not search results. Hospital discharge pages almost certainly have the same problem; this was not checked one by one.
- **Worker pay contradicts the approved $21/hour.** All 311 indexable PSW job pages say "$22–$28/hr" and "weekly payouts", but payouts are manual. Source: `src/pages/seo/PSWJobCityPage.tsx` lines 16, 58, 67 and 135. This is the largest live, indexed inconsistency.
- **$35 mentions:** in `PSWPayCalculatorPage.tsx:91` (pay calculator) and `guides/PSWvsNurseDifference.tsx:64` ("$35–$50/hr", a market range). Neither one quotes our client price. The home page shows $40, $50, and $55 as an agency comparison, which is consistent.
- **"24/7":** shown on the home page header ("Call … 24/7 Support"), the city pages and the companion pages, and found in 13 source files. There is no evidence the phone is answered around the clock.
- **Language and coverage claims:** `HomeCareLanguagePage.tsx` says "{Language}-speaking PSWs available across Ontario" with no check against real caregivers. These pages are separate from the language-city pages, which do check. "Same-day across Ontario" appears in `HomeCareOntarioLandingPage.tsx` and in `CaregiverNearMePage.tsx`, along with "filled within hours". No evidence was found to back these claims.

## 3. Mobile path from home page to lead

- **Home page (390px wide):** the phone number is at the top and works (`tel:2492884787`, the correct number). The booking form starts above the fold. A floating badge overlaps the service card in the bottom right corner (see screenshot).
- **Landing pages:** Acton, Dryden, Barrie and companion pages have a call link. **/turkish-speaking-psw-norwood and the other language-city pages have no phone link.**
- **Conversion tracking:** the GA4 tag (G-J7TJJ4QTMP) loads, but the source has no `gtag(` event calls. **Phone taps and completed bookings are not tracked as conversions.**
- **Not verified:** a full booking through payment (it would create a real order and touch payments), and the contact form.

## 4. Top three revenue-impacting fixes

1. **Add call and booking conversion tracking** (code). Fire GA4 events on every phone link tap and on `/order-confirmed`. Then the owner marks them as key events in GA4. Missing evidence: GA4 or Ads access, to confirm nothing is configured there already.
2. **Fix wrong prices and unsupported claims on indexed pages** (code, wording only). Files: `PSWJobCityPage.tsx` (pay wording), `ExpandedCityServicePage.tsx` (escort and discharge prices), and the "24/7", same-day and language wording. This needs the owner to confirm the approved wording: is 24/7 phone support real, and what pay text should replace "$22–$28"?
3. **Owner Search Console steps** (no code): resubmit the sitemap, request indexing for the representative job pages, and validate the fixes. Then add a phone link to the language-city pages (code). Missing evidence: Search Console data after Aug 21.
