# GSC "Excluded by noindex" validation failure: diagnosis (read-only)

Checked Oct 22 2026 against current HEAD and live https://pswdirect.ca. No changes made.

## What was checked
- Live server response for each example URL
- Live page in a headless browser: final URL, robots tag, canonical tag, main heading
- Live sitemap (`/sitemap.xml` points to `/sitemap-main.xml`, 4,855 URLs). The local eligibility list also has 4,855, so live matches HEAD.
- Current rules: generated eligibility list (`src/generated/seoEligibilityManifest.json`), `RouteIndexabilityMeta.tsx`, `legacyRedirects.ts`

## Results

| URL | HTTP | Live final URL | robots | In sitemap | Classification |
|---|---|---|---|---|---|
| /recovery-care-elliot-lake | 200 | same | noindex,follow | no | Template service-city page. Stays noindex. |
| /psw-ottawa-personal-care | 200 | → /personal-care-assistance-ottawa (in-browser) | noindex,follow | no (target not in sitemap either) | Old duplicate address. Stays noindex. |
| /24-hour-home-care-bracebridge | 200 | same | noindex,follow | no | Template service-city page. Stays noindex (also an unbacked "24-hour" claim). |
| /urdu-overnight-care-lasalle | 200 | same | noindex,follow | no | Language+service+city template. Stays noindex. |
| /tamil-caregiver-owen-sound | 200 | → /tamil-speaking-psw-owen-sound | noindex,follow | no (target not eligible: no matching caregiver nearby) | Old duplicate address. Stays noindex. |
| /personal-care-services-gananoque | 200 | → /personal-care-assistance-gananoque | noindex,follow | no | Old duplicate address. Stays noindex. |
| /hindi-companionship-claremont | 200 | same | noindex,follow | no | Language+service+city template. Stays noindex. |
| /swahili-companionship-fergus | 200 | same | noindex,follow | no | Language+service+city template. Stays noindex. |
| /weekend-home-care-mississauga | 200 | same | noindex,follow | no | Template service-city page. Stays noindex. |
| /light-housekeeping-services-stouffville | 200 | same | noindex,follow | no | Template service-city page. Stays noindex. |

None of the 10 is a public landing page the current rules mean to index. All 10 work as designed: each loads, shows a real heading, has a canonical pointing to itself or to its new address, carries `noindex,follow`, and is left out of the sitemap. None should be a 404. They are real pages or old addresses, just deliberately not indexed.

## Why the validation failed
- "Validate fix" on "Excluded by noindex" asks Google to confirm the noindex tag is gone. On these pages the noindex is intended and still there, so Google marks them "failed". That is the correct result, not a bug.
- 8,601 pending is Google still re-crawling. Most of those URLs are template/duplicate families that also keep noindex, so they will mostly fail too.
- This report is not an error report. A URL listed here only matters if it should rank, and none of these samples should.

## Minimal fix
**Code: none needed for these URLs.** Removing noindex here would undo the deliberate exclusion of thin and duplicate pages (the Aug 21 repair).

**Search Console steps (owner):**
1. Stop treating this report as something to clear. Don't start "Validate fix" on it again. Let the current run finish or ignore it.
2. Keep the sitemap `https://pswdirect.ca/sitemap.xml` submitted. Watch "Indexed" and "Crawled – currently not indexed" for sitemap URLs only (filter by sitemap in Page indexing).
3. If a URL in this report is one you want ranking, check it with URL Inspection. If the result is "noindex", tell me the URL. It would then need an evidence-based eligibility change (distinct local content or real caregiver supply), not a blanket un-noindex.

**Optional cleanup to shrink the report over time (needs your approval, code only):**
- Old addresses (/psw-{city}-personal-care, /personal-care-services-{city}, /{lang}-caregiver-{city}) give HTTP 200 and then switch pages in the browser. Lovable hosting can't send real 301s, so they will keep showing as noindex rather than as redirects. That is a hosting limit and harmless.
- Making sure no internal link points at these excluded addresses would cut how often Google finds them. I would audit that separately first. It is not confirmed as a cause here.

## Evidence not available
- The full list of 115 failed and 8,601 pending URLs (only 10 examples visible). I can't say all of them are intended without the export.
- What Google saw at its last crawl (URL Inspection needs Search Console access).
