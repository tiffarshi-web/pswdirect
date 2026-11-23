import { SEO_CITIES } from "./seoCityData";
import { APPROVED_HOME_CARE_CITIES, type ApprovedHomeCareCity } from "./approvedHomeCareCities";
import { getCityProfile } from "./cityProfiles";

/** Existing neighbourhood consolidation: no new duplicate planning entries. */
export const ONTARIO_PLANNING_ALIAS_KEYS = new Set([
  ...SEO_CITIES.filter(city => getCityProfile(city.label).parent).map(city => city.key),
  "woodbridge", "maple", "kleinburg", "orleans", "stittsville",
]);

/** SEO planning locations only: never use this registry for dispatch or coverage. */
export const ONTARIO_CUSTOMER_CITIES: ApprovedHomeCareCity[] = [
  ...SEO_CITIES.filter(city => !ONTARIO_PLANNING_ALIAS_KEYS.has(city.key)).map(city => APPROVED_HOME_CARE_CITIES.find(c => c.key === city.key) ?? {
    key: city.key, label: city.label, name: city.label,
    slug: `home-care-${city.key}`, localities: [],
  }),
  ...APPROVED_HOME_CARE_CITIES.filter(city => !SEO_CITIES.some(c => c.key === city.key)),
];

export const ONTARIO_CUSTOMER_HOME_CARE_SLUGS = new Set(ONTARIO_CUSTOMER_CITIES.map(c => c.slug));