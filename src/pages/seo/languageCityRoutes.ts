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

/** Canonical language+city URL slug: /{lang}-speaking-psw-{city}. */
export const languageCitySlug = (langSlug: string, cityKey: string) =>
  `${langSlug}-speaking-psw-${cityKey}`;

/** Legacy short alias slug: /{lang}-psw-{city} (redirects to the canonical). */
export const languageCityAliasSlug = (langSlug: string, cityKey: string) =>
  `${langSlug}-psw-${cityKey}`;

/**
 * Generate all language × city combinations.
 *
 * Canonical route: /{lang}-speaking-psw-{city} (e.g. /arabic-speaking-psw-guelph)
 *                  This is the format Google has already selected as canonical
 *                  for the indexed corpus, so it is the single permanent URL.
 * Legacy alias:    /{lang}-psw-{city} — kept only as a redirecting compatibility
 *                  shim so existing inbound links keep working. Aliases are
 *                  marked isAlias=true and are excluded from sitemaps and
 *                  internal navigation. The alias route performs an immediate
 *                  replace navigation to the canonical URL before any SEO page
 *                  renders, and the hosting layer redirect rules in
 *                  public/.htaccess and public/_redirects emit a real 301 where
 *                  that layer honors them.
 */
export const languageCityRoutes: LanguageCityRoute[] = languageRoutes.flatMap((lang) => {
  const langSlug = langSlugMap[lang.code] || lang.label.toLowerCase().replace(/\s+/g, "-");
  return SEO_CITIES.flatMap((city) => {
    const canonicalSlug = languageCitySlug(langSlug, city.key);
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
      { ...base, slug: languageCityAliasSlug(langSlug, city.key), isAlias: true },
    ];
  });
});

