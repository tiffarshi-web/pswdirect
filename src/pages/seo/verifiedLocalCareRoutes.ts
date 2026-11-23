import { APPROVED_HOME_CARE_CITIES } from "@/lib/approvedHomeCareCities";
import inventory from "@/lib/verifiedHomeCareInventory.json";
import { SEO_SUPPORTED_SERVICES } from "@/lib/seoSupportedServices";
import { languageRoutes } from "./languageRoutes";
import { cityServiceRoutes } from "./cityServiceRoutes";
import { additionalCityServiceRoutes } from "./additionalCityServiceRoutes";
import { expandedCityServiceRoutes } from "./expandedCityServiceRoutes";
import { languageServiceCityRoutes } from "./languageServiceCityRoutes";

/** Finite reviewed task intents, not synonym, schedule or specialist variants. */
export const VERIFIED_LANGUAGE_TASKS = [
  "bathing-assistance", "dressing-assistance", "toileting-assistance",
  "mobility-assistance", "light-housekeeping-services",
  "medication-reminder-services", "family-caregiver-relief",
] as const;

const existing = new Set([
  ...cityServiceRoutes, ...additionalCityServiceRoutes,
  ...expandedCityServiceRoutes, ...languageServiceCityRoutes,
].map(route => route.slug));
const evidence: Record<string, { languages: string[] }> = inventory.cities;

export const verifiedLocalCareRoutes = APPROVED_HOME_CARE_CITIES.flatMap(city =>
  Object.entries(SEO_SUPPORTED_SERVICES)
    .filter(([service, topic]) => topic.serviceId === "standard" && !existing.has(`${service}-${city.key}`))
    .map(([service, topic]) => ({ slug: `${service}-${city.key}`, city: city.label,
      cityKey: city.key, service, serviceLabel: topic.label })),
);

export const verifiedLanguageTaskRoutes = APPROVED_HOME_CARE_CITIES.flatMap(city =>
  languageRoutes.filter(language => evidence[city.key]?.languages.includes(language.code))
    .flatMap(language => {
      const languageSlug = language.slug.replace("psw-language-", "");
      // Existing personal-care/companionship URLs retain ownership. For
      // non-catalog localities their equivalent task pages can be added here.
      const tasks = [...VERIFIED_LANGUAGE_TASKS, "personal-care-assistance", "companion-care"];
      return tasks.flatMap(service => {
        const intent = service === "personal-care-assistance" ? "personal-care"
          : service === "companion-care" ? "companionship" : service;
        const slug = `${languageSlug}-${intent}-${city.key}`;
        if (existing.has(slug)) return [];
        return [{ slug, city: city.label, cityKey: city.key, service,
          serviceLabel: SEO_SUPPORTED_SERVICES[service].label,
          languageCode: language.code, languageLabel: language.label,
          languageCityPath: `/${languageSlug}-speaking-psw-${city.key}` }];
      });
    }),
);