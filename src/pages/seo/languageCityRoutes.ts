import { languageRoutes } from "./languageRoutes";
import { SEO_CITIES } from "@/lib/seoCityData";

export interface LanguageCityRoute {
  slug: string;
  languageCode: string;
  languageLabel: string;
  languageSlug: string;
  city: string;
  citySlug: string;
  /** Canonical route slug (the /{lang}-psw-{city} form). */
  canonicalSlug: string;
  /** True when this route is a legacy alias that must redirect to canonicalSlug. */
  isAlias: boolean;
}

// Map language label to URL-friendly slug
const langSlugMap: Record<string, string> = {};
languageRoutes.forEach((r) => {
  const s = r.slug.replace("psw-language-", "");
  langSlugMap[r.code] = s;
});

/**
 * Generate all language × city combinations.
 *
 * Canonical route: /{lang}-psw-{city} (e.g. /telugu-psw-clarington)
 * Legacy alias:    /{lang}-speaking-psw-{city} — kept only as a 301-redirecting
 *                  compatibility shim so existing inbound links keep working.
 *                  Aliases are marked isAlias=true and are excluded from
 *                  sitemaps and internal navigation. The alias page renders
 *                  a canonical + noindex,follow and performs a client-side
 *                  replace navigation to the canonical URL. A real 301 is
 *                  emitted at the hosting layer via public/.htaccess and
 *                  public/_redirects when that layer honors them.
 */
export const languageCityRoutes: LanguageCityRoute[] = languageRoutes.flatMap((lang) => {
  const langSlug = langSlugMap[lang.code] || lang.label.toLowerCase().replace(/\s+/g, "-");
  return SEO_CITIES.flatMap((city) => {
    const canonicalSlug = `${langSlug}-psw-${city.key}`;
    const base = {
      languageCode: lang.code,
      languageLabel: lang.label,
      languageSlug: `psw-language-${langSlug}`,
      city: city.label,
      citySlug: `psw-${city.key}`,
      canonicalSlug,
    };
    return [
      { ...base, slug: canonicalSlug, isAlias: false },
      { ...base, slug: `${langSlug}-speaking-psw-${city.key}`, isAlias: true },
    ];
  });
});

