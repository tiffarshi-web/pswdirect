import { SEO_CITIES } from "@/lib/seoCityData";

/**
 * Public home-care SEO city set, derived from active Ontario PSW inventory
 * (non-test, unarchived, active, approved, police check current, eligible for
 * jobs; home_city normalized to the catalog, neighbourhoods folded into their
 * city). Snapshot Oct 29 2026 — re-derive with an aggregate query when the
 * caregiver roster changes. Only catalog cities with a verified local profile
 * are listed. Does not change booking, payment or dispatch city controls.
 */
export const APPROVED_HOME_CARE_CITY_KEYS = [
  "toronto", "brampton", "barrie", "mississauga", "hamilton", "london", "belleville",
  "oshawa", "ottawa", "sault-ste-marie", "kitchener", "vaughan", "windsor", "timmins",
  "thunder-bay", "sarnia", "north-bay", "niagara-falls", "peterborough", "waterloo",
  "brantford", "whitby", "sudbury", "collingwood", "guelph", "cambridge", "orillia",
  "chatham-kent", "kingston", "wasaga-beach", "st-catharines", "burlington", "milton",
  "caledon", "richmond-hill", "bowmanville", "kenora", "georgetown", "huntsville", "aurora",
  "innisfil", "hawkesbury", "cornwall", "stouffville", "keswick", "bracebridge", "woodstock",
  "midland", "markham", "ajax", "shelburne",
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
