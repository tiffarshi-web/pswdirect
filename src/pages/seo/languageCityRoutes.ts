import { languageRoutes } from "./languageRoutes";
import { SEO_CITIES } from "@/lib/seoCityData";

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
  const s = r.slug.replace("psw-language-", "");
  langSlugMap[r.code] = s;
});

/**
 * Generate all language × city combinations.
 * Pages render dynamically and show "no PSWs" if none match.
 */
export const languageCityRoutes: LanguageCityRoute[] = languageRoutes.flatMap((lang) => {
  const langSlug = langSlugMap[lang.code] || lang.label.toLowerCase().replace(/\s+/g, "-");
  return SEO_CITIES.flatMap((city) => {
    const base = {
      languageCode: lang.code,
      languageLabel: lang.label,
      languageSlug: `psw-language-${langSlug}`,
      city: city.label,
      citySlug: `psw-${city.key}`,
    };
    return [
      { ...base, slug: `${langSlug}-psw-${city.key}` },
      // "speaking" alias: /english-speaking-psw-toronto
      { ...base, slug: `${langSlug}-speaking-psw-${city.key}` },
    ];
  });
});
