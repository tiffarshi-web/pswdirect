import { SEO_CITIES } from "@/lib/seoCityData";

/**
 * Public home-care SEO city set, derived from active Ontario PSW inventory
 * (non-test, unarchived, active, approved, police check current, eligible for
 * jobs; home_city normalized, neighbourhoods folded into their parent page and
 * listed as covered localities). Snapshot Oct 29 2026 — re-derive with an
 * aggregate query when the caregiver roster changes. Never publish counts.
 * Does not change booking, payment or dispatch city controls.
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
  // Catalog localities without a city profile (area given below).
  "thorold", "ingersoll", "stayner", "gananoque", "st-thomas", "colborne", "thornhill",
  // Localities outside the SEO city catalog (defined in EXTRA_LOCALITIES).
  "beaverton", "otterville", "port-carling", "adjala-tosorontio", "frankford", "seguin",
  "blackstock", "tiny", "nakina", "pefferlaw", "trent-lakes",
] as const;

/** Public municipal/regional context for localities lacking a city profile. */
const AREA: Record<string, string> = {
  thorold: "Niagara Region", ingersoll: "Oxford County", stayner: "Clearview Township, Simcoe County",
  gananoque: "the United Counties of Leeds and Grenville", "st-thomas": "Elgin County",
  colborne: "Cramahe Township, Northumberland County", thornhill: "York Region, spanning parts of Vaughan and Markham",
  beaverton: "the Township of Brock, Durham Region", otterville: "the Township of Norwich, Oxford County",
  "port-carling": "the Township of Muskoka Lakes, District of Muskoka", "adjala-tosorontio": "Simcoe County",
  frankford: "Quinte West, Hastings County", seguin: "Parry Sound District",
  blackstock: "the Township of Scugog, Durham Region", tiny: "Simcoe County",
  nakina: "the Municipality of Greenstone, Thunder Bay District", pefferlaw: "the Town of Georgina, York Region",
  "trent-lakes": "Peterborough County",
};

const EXTRA_LOCALITIES: Record<string, { label: string; lat: number; lng: number }> = {
  beaverton: { label: "Beaverton", lat: 44.43, lng: -79.15 },
  otterville: { label: "Otterville", lat: 42.93, lng: -80.60 },
  "port-carling": { label: "Port Carling", lat: 45.12, lng: -79.58 },
  "adjala-tosorontio": { label: "Adjala-Tosorontio", lat: 44.13, lng: -79.93 },
  frankford: { label: "Frankford", lat: 44.20, lng: -77.60 },
  seguin: { label: "Seguin", lat: 45.29, lng: -79.87 },
  blackstock: { label: "Blackstock", lat: 44.11, lng: -78.83 },
  tiny: { label: "Tiny", lat: 44.68, lng: -79.95 },
  nakina: { label: "Nakina", lat: 50.17, lng: -86.70 },
  pefferlaw: { label: "Pefferlaw", lat: 44.31, lng: -79.20 },
  "trent-lakes": { label: "Trent Lakes", lat: 44.65, lng: -78.43 },
};

/** Coordinates corrected where the shared catalog entry is imprecise. */
const COORDS: Record<string, [number, number]> = {
  thornhill: [43.81, -79.42], ingersoll: [43.04, -80.88], thorold: [43.12, -79.20], stayner: [44.42, -80.08],
};

/** Neighbourhoods/aliases served through a parent page (listed on that page). */
const COVERED_LOCALITIES: Record<string, string[]> = {
  toronto: ["North York", "Scarborough", "Etobicoke", "York", "Islington"],
  vaughan: ["Maple", "Kleinburg", "Woodbridge"],
  hamilton: ["Stoney Creek", "Ancaster"],
  ottawa: ["Orléans", "Stittsville"],
  timmins: ["South Porcupine"],
  "chatham-kent": ["Chatham"],
};

const DISPLAY_NAME: Record<string, string> = { sudbury: "Greater Sudbury", tiny: "Tiny Township" };

export interface ApprovedHomeCareCity {
  key: string; label: string; name: string; slug: string; lat: number; lng: number;
  area?: string; localities: string[];
}

export const APPROVED_HOME_CARE_CITIES: ApprovedHomeCareCity[] = APPROVED_HOME_CARE_CITY_KEYS.map(key => {
  const c = SEO_CITIES.find(city => city.key === key) ?? (EXTRA_LOCALITIES[key] && { key, ...EXTRA_LOCALITIES[key] });
  if (!c) throw new Error(`Approved home-care locality missing: ${key}`);
  const [lat, lng] = COORDS[key] ?? [c.lat, c.lng];
  return { key, label: c.label, name: DISPLAY_NAME[key] ?? c.label, slug: `home-care-${key}`, lat, lng,
    area: AREA[key], localities: COVERED_LOCALITIES[key] ?? [] };
});

export const APPROVED_HOME_CARE_SLUGS = new Set(APPROVED_HOME_CARE_CITIES.map(c => c.slug));

export function nearestApprovedHomeCareCities(key: string, count = 5): ApprovedHomeCareCity[] {
  const self = APPROVED_HOME_CARE_CITIES.find(c => c.key === key);
  if (!self) return [];
  return APPROVED_HOME_CARE_CITIES.filter(c => c.key !== key)
    .map(c => ({ c, d: (c.lat - self.lat) ** 2 + ((c.lng - self.lng) * Math.cos(self.lat * Math.PI / 180)) ** 2 }))
    .sort((a, b) => a.d - b.d).slice(0, count).map(x => x.c);
}
