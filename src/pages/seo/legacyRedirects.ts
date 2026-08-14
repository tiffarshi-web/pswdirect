import { SEO_CITIES } from "@/lib/seoCityData";
import { languageRoutes } from "./languageRoutes";

/**
 * SEO URL consolidation map.
 *
 * Purpose: eliminate Google Search Console "Soft 404" and
 * "Duplicate, Google chose different canonical than user" exclusions by
 * collapsing every obsolete / duplicate slug onto exactly one canonical URL.
 *
 * Canonical patterns selected (do not reverse):
 *   Home Care        -> /home-care-{city}
 *   Personal Care    -> /personal-care-assistance-{city}   (the internally linked form)
 *   Overnight Care   -> /overnight-care-{city}             (service-first form)
 *   Language + City  -> /{language}-speaking-psw-{city}
 *
 * Every key in SEO_REDIRECTS is removed from the route registries used by
 * src/App.tsx and scripts/generate-sitemap.ts, and is served by <SeoRedirect>
 * (noindex,follow + canonical to the target + immediate replace navigation).
 */

const cityKeys = SEO_CITIES.map((c) => c.key);

/** Language URL slugs, e.g. "tamil", "french", "spanish". */
export const LANGUAGE_SLUGS = languageRoutes.map((r) => r.slug.replace("psw-language-", ""));

const redirects = new Map<string, string>();
const addRedirect = (from: string, to: string) => {
  if (from === to) return;
  redirects.set(from, to);
};

for (const city of cityKeys) {
  // --- A. Meal preparation is no longer a separate PSW Direct service ---
  addRedirect(`meal-preparation-${city}`, `home-care-${city}`);
  addRedirect(`meal-preparation-services-${city}`, `home-care-${city}`);

  // --- C. Personal care duplicates -> /personal-care-assistance-{city} ---
  addRedirect(`psw-${city}-personal-care`, `personal-care-assistance-${city}`);
  addRedirect(`personal-care-${city}`, `personal-care-assistance-${city}`);
  addRedirect(`personal-care-services-${city}`, `personal-care-assistance-${city}`);

  // --- C. Overnight care duplicates -> /overnight-care-{city} ---
  addRedirect(`psw-${city}-overnight-care`, `overnight-care-${city}`);
  addRedirect(`overnight-psw-${city}`, `overnight-care-${city}`);
}

/** Slug -> canonical slug (both without a leading slash). */
export const SEO_REDIRECTS: ReadonlyMap<string, string> = redirects;

/** Fast membership test used to strip sources from routes and sitemaps. */
export const isRedirectedSlug = (slug: string): boolean => redirects.has(slug);

const citySet = new Set(cityKeys);
const languageSet = new Set(LANGUAGE_SLUGS);

/**
 * Resolves obsolete slugs that never had a route (they previously rendered the
 * 404 page and were reported by Google as Soft 404s) to their canonical URL.
 * Handles the /{language}-caregiver-{city} family without materialising
 * 29 x 314 React Router routes.
 *
 * Returns a canonical path ("/...") or null when the slug is genuinely unknown.
 */
export function resolveLegacySeoPath(pathname: string): string | null {
  const slug = pathname.replace(/^\/+/, "").replace(/\/+$/, "").toLowerCase();
  if (!slug) return null;

  const mapped = redirects.get(slug);
  if (mapped) return `/${mapped}`;

  // /{language}-caregiver-{city} -> /{language}-speaking-psw-{city}
  const caregiverMatch = slug.match(/^([a-z-]+?)-caregiver-([a-z0-9-]+)$/);
  if (caregiverMatch) {
    const [, language, city] = caregiverMatch;
    if (languageSet.has(language) && citySet.has(city)) {
      return `/${language}-speaking-psw-${city}`;
    }
  }

  // /{language}-psw-{city} short alias -> long canonical (defence in depth;
  // these also have explicit alias routes).
  const shortAlias = slug.match(/^([a-z-]+?)-psw-([a-z0-9-]+)$/);
  if (shortAlias) {
    const [, language, city] = shortAlias;
    if (languageSet.has(language) && citySet.has(city)) {
      return `/${language}-speaking-psw-${city}`;
    }
  }

  return null;
}
