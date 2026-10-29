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

/** Localities outside the SEO city catalog. */
const EXTRA_LOCALITIES: Record<string, string> = {
  beaverton: "Beaverton", otterville: "Otterville", "port-carling": "Port Carling",
  "adjala-tosorontio": "Adjala-Tosorontio", frankford: "Frankford", seguin: "Seguin",
  blackstock: "Blackstock", tiny: "Tiny", nakina: "Nakina", pefferlaw: "Pefferlaw", "trent-lakes": "Trent Lakes",
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
  key: string; label: string; name: string; slug: string;
  area?: string; localities: string[];
}

export const APPROVED_HOME_CARE_CITIES: ApprovedHomeCareCity[] = APPROVED_HOME_CARE_CITY_KEYS.map(key => {
  const label = SEO_CITIES.find(city => city.key === key)?.label ?? EXTRA_LOCALITIES[key];
  if (!label) throw new Error(`Approved home-care locality missing: ${key}`);
  return { key, label, name: DISPLAY_NAME[key] ?? label, slug: `home-care-${key}`,
    area: AREA[key], localities: COVERED_LOCALITIES[key] ?? [] };
});

export const APPROVED_HOME_CARE_SLUGS = new Set(APPROVED_HOME_CARE_CITIES.map(c => c.slug));
