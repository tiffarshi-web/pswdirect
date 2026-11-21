# SEO noindex generation repair — November 21, 2026

## Diagnosis and correction

The saved revision (`6df7d989`) contained the November 16 failed snapshot: 0 provinces, 0 offered services, incomplete inventory, 313 failed cities, 0 active city keys, 9 sitemap paths and 100,359 known public paths. The route-level robots owner correctly excluded known public paths missing from that snapshot.

The defect was in the generator, not `RouteIndexabilityMeta.tsx`: configuration was read through a hand-written single-file parser, evidence exceptions were caught, and `main()` wrote the failed snapshot and sitemap without validating completeness. The missing-configuration and failed-radius branches also discarded province/service evidence. Their return shapes match the saved snapshot. Historical diagnostic logs are unavailable, so the specific November 16 upstream error (configuration versus radius/network failure) cannot be conclusively distinguished. Today's existing configuration successfully reads all required evidence; this is not evidence that Ontario was closed.

The generator now loads the already configured public settings with Vite's environment parser, including mode-specific files and legacy public variable names. Runtime Vite-prefixed settings remain preferred. No settings, keys, database rows, permissions or business flags were changed or logged. Configuration, launch/service, radius, malformed response or any city lookup failure throws before artifact writes and exits unsuccessfully. A second completeness guard protects the write boundary. Actual closed provinces/services and successful empty inventory results still exclude their dependent pages; failures are not interpreted as empty inventory.

## Regenerated evidence and exact counts

- Province records: **2**; Ontario active/live with booking, payment and recruitment enabled. Alberta preparation with booking/payment/recruitment disabled.
- Active Ontario service identifiers: **3** — standard, doctor-appointment, hospital-discharge.
- Inventory complete: **true**; failed city lookups: **0**.
- Active catalog city keys: **311**. This is a build-evidence diagnostic, not a public caregiver count or expansion of the approved home-care roster.
- Local service pages: **1,383**.
- Task-language care pages: **2,294**.
- Eligible language-city pages: **4,502**.
- Recruitment-city paths: **311**; language hub paths: **21**; editorial/core paths: **139**.
- Sitemap paths: **8,650**, all unique; known public paths: **100,359**.
- Sitemap XML and manifest path sets match exactly, with one main sitemap referenced by the sitemap index.

No route registries, approved locality list, eligibility rules, private exclusions, redirects, canonical ownership or rendered marketing content changed. The counts reflect current successful evidence, not a forced restoration of an older URL total.

## Preview validation

Rendered checks used the local preview, not Search Console or production:

- `index,follow` for both robots and googlebot, single self-canonical and one H1: `/home-care-ontario`, `/home-care-barrie`, `/home-care-pickering`, `/home-care-thornhill`, `/post-surgery-care-ontario`, `/dementia-care-ontario`, `/respite-care-ontario`, `/light-housekeeping-services-stouffville`, `/english-personal-care-barrie`.
- Still `noindex,follow` and absent from sitemap: `/recovery-care-elliot-lake` (roster-bounded recovery eligibility), `/personal-care-assistance-gananoque` (existing local eligibility), `/swahili-companionship-fergus` (matching language eligibility), `/24-hour-home-care-bracebridge`, `/urdu-overnight-care-lasalle` (unsupported topics). Known public paths are not automatically indexable.
- Still `noindex,nofollow` and absent from sitemap: `/client-login`, `/psw-login`, `/admin` (redirects to office login), `/psw/profile/test`, `/psw-jobs-geralton`, `/home-care-calgary`, and an unknown-route control.
- `/home-care` remains excluded and redirects to `/home-care-ontario`; no alias behavior changed.
- Desktop and 390-pixel mobile screenshots inspected for Barrie, a language-task page and Thornhill; no horizontal overflow. Existing floating badges were not changed.
- Existing SPA fallback still returns HTTP 200 for invalid routes; this unrelated hosting behavior was not changed.

The current message included no new screenshot files; representative paths were selected from the previously cited examples and valid existing home-care paths.

## Tests and files

- **16** generator configuration/failure-safety tests passed using `bun run test --config scripts/vitest.seo-generation.config.ts`.
- **131** existing targeted eligibility/indexing tests passed using `bun run test src/pages/seo/__tests__/seoBulkEligibility.test.ts src/pages/seo/__tests__/seoIndexingRegression.test.ts`.
- An actual misconfigured generator invocation exited **1** and preserved all three saved artifacts byte-for-byte.
- Automatic compilation: latest observed result **build OK**. No separate manual build/typecheck was run, per environment instructions.

Changed source: `scripts/generate-sitemap.ts`, new `scripts/seoGenerationConfig.ts`, new `scripts/__tests__/seoGenerationSafety.test.ts`, new `scripts/vitest.seo-generation.config.ts`.

Regenerated artifacts: `src/generated/seoEligibilityManifest.json`, `public/sitemap-main.xml` (`public/sitemap.xml` already references the same single main file).

Documentation: `AGENTS.md`, `roadmap.md`, this report.

Nothing deployed or published. No external systems or Search Console settings were changed. Google indexing is not verified or guaranteed.