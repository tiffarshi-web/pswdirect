import { languageRoutes } from "./languageRoutes";
import { seoRoutes } from "./seoRoutes";

export interface LanguageCityRoute {
  slug: string;
  languageCode: string;
  languageLabel: string;
  languageSlug: string;
  city: string;
  citySlug: string;
}

// Map language label to URL-friendly slug
const langSlugMap: Record<string, string> = {};
languageRoutes.forEach((r) => {
  // e.g. "psw-language-punjabi" -> "punjabi"
  const s = r.slug.replace("psw-language-", "");
  langSlugMap[r.code] = s;
});

// Map city to URL-friendly slug
const citySlugMap: Record<string, string> = {};
seoRoutes.forEach((r) => {
  // Use the first psw-{city} slug for each city
  if (r.slug.startsWith("psw-") && !citySlugMap[r.city]) {
    citySlugMap[r.city] = r.slug.replace("psw-", "");
  }
});
// Handle special case for Toronto which has "home-care-toronto" first
if (!citySlugMap["Toronto"]) citySlugMap["Toronto"] = "toronto";

/**
 * Generate all language × city combinations.
 * Pages render dynamically and show "no PSWs" if none match.
 */
export const languageCityRoutes: LanguageCityRoute[] = languageRoutes.flatMap((lang) => {
  const langSlug = langSlugMap[lang.code] || lang.label.toLowerCase().replace(/\s+/g, "-");
  return seoRoutes
    .filter((r) => r.slug.startsWith("psw-")) // skip "home-care-toronto"
    .map((r) => {
      const cSlug = r.slug.replace("psw-", "");
      return {
        slug: `${langSlug}-psw-${cSlug}`,
        languageCode: lang.code,
        languageLabel: lang.label,
        languageSlug: `psw-language-${langSlug}`,
        city: r.city,
        citySlug: r.slug,
      };
    });
});
