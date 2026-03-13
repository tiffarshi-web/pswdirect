import { languageRoutes } from "./languageRoutes";
import { SEO_CITIES } from "@/lib/seoCityData";

export interface LanguageServiceCityRoute {
  slug: string;
  languageCode: string;
  languageLabel: string;
  languageSlug: string;
  city: string;
  citySlug: string;
  service: string;
  serviceLabel: string;
}

/** Core services used for language+service+city SEO pages */
export const SEO_SERVICES = [
  { key: "caregiver", label: "Caregiver" },
  { key: "home-care", label: "Home Care" },
  { key: "personal-care", label: "Personal Care" },
  { key: "dementia-care", label: "Dementia Care" },
  { key: "companionship", label: "Companionship" },
  { key: "overnight-care", label: "Overnight Care" },
] as const;

// Map language code → URL slug
const langSlugMap: Record<string, string> = {};
languageRoutes.forEach((r) => {
  langSlugMap[r.code] = r.slug.replace("psw-language-", "");
});

/**
 * Generate all language × service × city combos.
 * Slug format: /{langSlug}-{service}-{cityKey}
 * e.g. /punjabi-caregiver-toronto, /hindi-home-care-brampton
 */
export const languageServiceCityRoutes: LanguageServiceCityRoute[] =
  languageRoutes.flatMap((lang) => {
    const langSlug = langSlugMap[lang.code] || lang.label.toLowerCase().replace(/\s+/g, "-");
    return SEO_CITIES.flatMap((city) =>
      SEO_SERVICES.map((service) => ({
        slug: `${langSlug}-${service.key}-${city.key}`,
        languageCode: lang.code,
        languageLabel: lang.label,
        languageSlug: `psw-language-${langSlug}`,
        city: city.label,
        citySlug: `psw-${city.key}`,
        service: service.key,
        serviceLabel: service.label,
      }))
    );
  });
