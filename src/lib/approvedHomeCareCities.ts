import { SEO_CITIES } from "@/lib/seoCityData";

/**
 * Owner-approved Ontario home-care service areas for public SEO pages.
 * Source: owner confirmation (Oct 2026) that home care is provided in all
 * major Ontario cities. This list only controls public home-care landing
 * pages; it does not change booking, payment or dispatch city controls.
 * Neighbourhood aliases (e.g. North York) are covered by their parent city page.
 */
export const APPROVED_HOME_CARE_CITY_KEYS = [
  "toronto", "ottawa", "mississauga", "brampton", "hamilton", "london", "markham",
  "vaughan", "kitchener", "windsor", "oakville", "burlington", "oshawa", "barrie",
  "st-catharines", "cambridge", "kingston", "guelph", "whitby", "ajax", "richmond-hill",
  "thunder-bay", "sudbury", "pickering", "niagara-falls", "peterborough", "brantford",
  "chatham-kent", "sarnia", "north-bay",
] as const;

const DISPLAY_NAME: Record<string, string> = { sudbury: "Greater Sudbury" };

export interface ApprovedHomeCareCity { key: string; label: string; name: string; slug: string; lat: number; lng: number }

export const APPROVED_HOME_CARE_CITIES: ApprovedHomeCareCity[] = APPROVED_HOME_CARE_CITY_KEYS.map(key => {
  const c = SEO_CITIES.find(city => city.key === key);
  if (!c) throw new Error(`Approved home-care city missing from catalog: ${key}`);
  return { key, label: c.label, name: DISPLAY_NAME[key] ?? c.label, slug: `home-care-${key}`, lat: c.lat, lng: c.lng };
});

export const APPROVED_HOME_CARE_SLUGS = new Set(APPROVED_HOME_CARE_CITIES.map(c => c.slug));

export function nearestApprovedHomeCareCities(key: string, count = 5): ApprovedHomeCareCity[] {
  const self = APPROVED_HOME_CARE_CITIES.find(c => c.key === key);
  if (!self) return [];
  return APPROVED_HOME_CARE_CITIES.filter(c => c.key !== key)
    .map(c => ({ c, d: (c.lat - self.lat) ** 2 + ((c.lng - self.lng) * Math.cos(self.lat * Math.PI / 180)) ** 2 }))
    .sort((a, b) => a.d - b.d).slice(0, count).map(x => x.c);
}
