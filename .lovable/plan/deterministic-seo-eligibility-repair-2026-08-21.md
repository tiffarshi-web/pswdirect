# Deterministic SEO Eligibility Repair

## Goal
Eliminate asynchronous robots changes, make sitemap and page metadata use one build-time decision, and keep the repair unpublished until review.

## Implementation

1. **Generate one fail-closed eligibility manifest**
   - Extend the existing predev/prebuild SEO generation step to query the same approved nearby-worker inventory source once.
   - Write a versioned static manifest containing each canonical language-city slug, eligibility state, source/rule version, and generation result.
   - Mark missing, failed, malformed, inactive-area, or unknown records ineligible and log a clear build-time diagnostic.
   - Make generation fail safely: never retain stale or assumed eligibility after an inventory lookup failure.

2. **Use the manifest for both metadata and sitemap output**
   - Import the generated manifest into the app bundle and sitemap generator.
   - Language-city routes derive robots/canonical/schema eligibility synchronously from the route slug before the first render.
   - Eligible routes render `index,follow` plus a self-referencing canonical immediately.
   - Ineligible/unknown routes render `noindex,follow` immediately and never enter a sitemap.
   - Keep the live inventory request only for visible caregiver cards; it cannot alter robots, canonical, or structured data.

3. **Conservative whole-sitemap eligibility audit**
   - Classify every sitemap entry by route family and enforce checks for mounted canonical route, public status, approved service area, meaningful route-specific content, approved internal discovery, stable metadata, and inventory where the page makes worker-availability claims.
   - Remove families/URLs that cannot be proven eligible rather than inferring value from route existence.
   - Add a shared synchronous route-indexability lookup so removed public pages render `noindex,follow` rather than remaining implicitly indexable.
   - Update approved navigation modules so they link only to eligible canonical pages.

4. **Private and unknown-route crawler controls**
   - Change genuine unknown routes to immediate `noindex,nofollow`, no canonical, and a real “Page not found” interface.
   - Verify account, admin, PSW app, login, tracking, payment, and order routes synchronously render `noindex,nofollow`, remain outside sitemaps, and are not exposed from SEO navigation.
   - Preserve robots.txt blocking only for truly sensitive endpoints; ordinary noindexed routes remain crawlable so Google can observe their meta directive.

5. **Regression and browser validation**
   - Add first-render tests for eligible, zero-inventory, unknown, and failed eligibility states.
   - Prove robots never transitions in either direction after delayed/successful/failed live inventory requests.
   - Assert sitemap membership exactly equals the manifest decision.
   - Assert private and unknown routes immediately emit the required directives.
   - Assert robots.txt does not block routes whose removal relies on meta robots.
   - Run the focused SEO suite, full tests, and a headless-browser matrix with delayed and failed backend responses.

6. **Review report only — no publication**
   - Report the architecture, exact retained/removed totals, counts by family, test/browser results, exact robots.txt contents, and known SPA soft-404 limitation.
   - Do not publish. Live post-publication metadata results will be explicitly marked pending until approval and deployment.

## Technical Notes
- The generated manifest is a checked-in/build artifact consumed synchronously by React and by sitemap generation; runtime effects cannot overwrite its decision.
- The worker inventory rule remains the existing approved 50 km nearby-worker lookup unless the authoritative backend rule already exposes a stricter active-service-area predicate.
- Sitemap index `<lastmod>` values derived from build time will also be removed because they are not page-specific authoritative timestamps.
