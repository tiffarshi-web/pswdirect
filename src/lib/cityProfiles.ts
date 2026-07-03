/**
 * City profile registry — verified attributes only.
 *
 * Each profile lists factual, publicly-known attributes about an Ontario
 * community that our SEO copy can safely lean on: region, county/municipality,
 * a small "topics" list (retirement growth, waterfront, cottage country,
 * bilingual, government/veterans, cardiac hub, etc.).
 *
 * Rule: NEVER invent a topic. If a fact isn't verifiable, omit it. The content
 * engine treats a missing flag as "do not mention" — it will not fabricate
 * cardiac programs, bilingual services, or hospital affiliations for cities
 * that don't legitimately have them.
 *
 * Suburbs / neighbourhoods inherit their parent city's profile via `parent`.
 */

export type OntarioRegion =
  | "gta"
  | "gta-outer"
  | "central"
  | "southwest"
  | "east"
  | "north"
  | "niagara"
  | "cottage-country"
  | "durham"
  | "halton"
  | "peel"
  | "york"
  | "simcoe"
  | "waterloo"
  | "ottawa-valley";

export type PopulationBand = "large" | "mid" | "small" | "town";

export type CityTopic =
  | "retirement-growth"
  | "commuter-community"
  | "waterfront"
  | "cottage-country"
  | "seasonal-population"
  | "aging-in-place"
  | "bilingual-care"
  | "veterans"
  | "government-retirees"
  | "cardiac-recovery"
  | "orthopedic-recovery"
  | "stroke-rehab"
  | "cancer-recovery"
  | "tourism-population"
  | "university-town"
  | "manufacturing-town"
  | "farming-community"
  | "northern-community"
  | "rural"
  | "urban-density"
  | "new-canadians"
  | "multigenerational-households"
  | "hospital-hub"
  | "regional-referral-hospital"
  | "cottage-caregiver-relief"
  | "snowbird-population"
  | "post-industrial";

export interface CityProfile {
  /** Full label as used in SEO_CITIES. */
  label: string;
  /** Parent city label if this is a suburb/neighbourhood. Content inherits. */
  parent?: string;
  region?: OntarioRegion;
  /** County or upper-tier municipality (verified). */
  county?: string;
  /** Larger metro / catchment (e.g. "Greater Toronto Area", "Golden Horseshoe"). */
  metro?: string;
  populationBand?: PopulationBand;
  /** Northern Ontario (verified by latitude / district). */
  northern?: boolean;
  /** Statistical urban vs rural classification (verified). */
  rural?: boolean;
  gta?: boolean;
  /** Verified topical emphases. Order = priority. Max 4 recommended. */
  topics?: CityTopic[];
}

/**
 * Explicit profiles for named Ontario communities.
 * Everything else falls back to a generic Ontario profile (region undefined).
 */
export const CITY_PROFILES: Record<string, CityProfile> = {
  // ─── GTA — City of Toronto ────────────────────────────────
  "Toronto": { label: "Toronto", region: "gta", county: "City of Toronto", metro: "Greater Toronto Area", populationBand: "large", gta: true, topics: ["urban-density", "new-canadians", "multigenerational-households", "hospital-hub"] },
  "Scarborough": { label: "Scarborough", parent: "Toronto", region: "gta", county: "City of Toronto", metro: "Greater Toronto Area", populationBand: "large", gta: true, topics: ["urban-density", "new-canadians", "multigenerational-households"] },
  "North York": { label: "North York", parent: "Toronto", region: "gta", county: "City of Toronto", metro: "Greater Toronto Area", populationBand: "large", gta: true, topics: ["urban-density", "aging-in-place"] },
  "Etobicoke": { label: "Etobicoke", parent: "Toronto", region: "gta", county: "City of Toronto", metro: "Greater Toronto Area", populationBand: "large", gta: true, topics: ["urban-density", "aging-in-place"] },
  "York": { label: "York", parent: "Toronto" },
  "East York": { label: "East York", parent: "Toronto" },

  // ─── Peel ─────────────────────────────────────────────────
  "Mississauga": { label: "Mississauga", region: "peel", county: "Region of Peel", metro: "Greater Toronto Area", populationBand: "large", gta: true, topics: ["new-canadians", "multigenerational-households", "commuter-community"] },
  "Brampton": { label: "Brampton", region: "peel", county: "Region of Peel", metro: "Greater Toronto Area", populationBand: "large", gta: true, topics: ["new-canadians", "multigenerational-households", "commuter-community"] },
  "Caledon": { label: "Caledon", region: "peel", county: "Region of Peel", metro: "Greater Toronto Area", gta: true, rural: true, populationBand: "mid", topics: ["rural", "commuter-community"] },

  // ─── York Region ─────────────────────────────────────────
  "Vaughan": { label: "Vaughan", region: "york", county: "York Region", metro: "Greater Toronto Area", gta: true, populationBand: "large", topics: ["commuter-community", "multigenerational-households"] },
  "Markham": { label: "Markham", region: "york", county: "York Region", metro: "Greater Toronto Area", gta: true, populationBand: "large", topics: ["commuter-community", "new-canadians", "multigenerational-households"] },
  "Richmond Hill": { label: "Richmond Hill", region: "york", county: "York Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["commuter-community", "multigenerational-households"] },
  "Newmarket": { label: "Newmarket", region: "york", county: "York Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["commuter-community", "aging-in-place", "hospital-hub"] },
  "Aurora": { label: "Aurora", region: "york", county: "York Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["commuter-community", "aging-in-place"] },
  "Stouffville": { label: "Stouffville", region: "york", county: "York Region", gta: true, populationBand: "small", topics: ["commuter-community"] },
  "East Gwillimbury": { label: "East Gwillimbury", region: "york", county: "York Region", gta: true, populationBand: "small", topics: ["commuter-community", "rural"] },
  "King City": { label: "King City", region: "york", county: "York Region", gta: true, populationBand: "small", topics: ["rural", "commuter-community"] },
  "Keswick": { label: "Keswick", region: "york", county: "York Region", gta: true, populationBand: "small", topics: ["waterfront", "commuter-community"] },

  // ─── Halton ──────────────────────────────────────────────
  "Oakville": { label: "Oakville", region: "halton", county: "Halton Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["commuter-community", "aging-in-place", "waterfront"] },
  "Burlington": { label: "Burlington", region: "halton", county: "Halton Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["waterfront", "aging-in-place", "commuter-community"] },
  "Milton": { label: "Milton", region: "halton", county: "Halton Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["commuter-community", "multigenerational-households"] },
  "Halton Hills": { label: "Halton Hills", region: "halton", county: "Halton Region", gta: true, populationBand: "small", topics: ["rural", "commuter-community"] },
  "Georgetown": { label: "Georgetown", region: "halton", county: "Halton Region", gta: true, populationBand: "small", topics: ["commuter-community"] },

  // ─── Durham ──────────────────────────────────────────────
  "Ajax": { label: "Ajax", region: "durham", county: "Durham Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["commuter-community", "waterfront"] },
  "Pickering": { label: "Pickering", region: "durham", county: "Durham Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["commuter-community", "waterfront"] },
  "Whitby": { label: "Whitby", region: "durham", county: "Durham Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["commuter-community", "aging-in-place"] },
  "Oshawa": { label: "Oshawa", region: "durham", county: "Durham Region", metro: "Greater Toronto Area", gta: true, populationBand: "mid", topics: ["post-industrial", "aging-in-place", "hospital-hub"] },
  "Clarington": { label: "Clarington", region: "durham", county: "Durham Region", gta: true, populationBand: "small", topics: ["commuter-community", "rural"] },
  "Bowmanville": { label: "Bowmanville", region: "durham", county: "Durham Region", gta: true, populationBand: "small", topics: ["commuter-community", "aging-in-place"] },
  "Courtice": { label: "Courtice", region: "durham", county: "Durham Region", gta: true, populationBand: "small", topics: ["commuter-community"] },
  "Uxbridge": { label: "Uxbridge", region: "durham", county: "Durham Region", populationBand: "small", topics: ["rural", "retirement-growth"] },

  // ─── Simcoe ──────────────────────────────────────────────
  "Barrie": { label: "Barrie", region: "simcoe", county: "Simcoe County", populationBand: "mid", topics: ["retirement-growth", "commuter-community", "waterfront", "regional-referral-hospital"] },
  "Innisfil": { label: "Innisfil", region: "simcoe", county: "Simcoe County", populationBand: "small", topics: ["waterfront", "retirement-growth", "commuter-community"] },
  "Bradford": { label: "Bradford", region: "simcoe", county: "Simcoe County", populationBand: "small", topics: ["commuter-community", "farming-community"] },
  "Alliston": { label: "Alliston", region: "simcoe", county: "Simcoe County", populationBand: "small", topics: ["rural", "aging-in-place"] },
  "Orillia": { label: "Orillia", region: "simcoe", county: "Simcoe County", populationBand: "small", topics: ["cottage-country", "seasonal-population", "waterfront", "retirement-growth"] },
  "Midland": { label: "Midland", region: "cottage-country", county: "Simcoe County", populationBand: "small", topics: ["cottage-country", "waterfront", "retirement-growth", "seasonal-population"] },
  "Penetanguishene": { label: "Penetanguishene", region: "cottage-country", county: "Simcoe County", populationBand: "town", topics: ["cottage-country", "waterfront", "seasonal-population"] },
  "Wasaga Beach": { label: "Wasaga Beach", region: "simcoe", county: "Simcoe County", populationBand: "small", topics: ["waterfront", "retirement-growth", "seasonal-population", "snowbird-population"] },
  "Collingwood": { label: "Collingwood", region: "simcoe", county: "Simcoe County", populationBand: "small", topics: ["waterfront", "retirement-growth", "seasonal-population", "tourism-population"] },

  // ─── Muskoka / cottage country ───────────────────────────
  "Gravenhurst": { label: "Gravenhurst", region: "cottage-country", county: "District of Muskoka", populationBand: "town", rural: true, topics: ["cottage-country", "seasonal-population", "retirement-growth", "waterfront", "cottage-caregiver-relief"] },
  "Bracebridge": { label: "Bracebridge", region: "cottage-country", county: "District of Muskoka", populationBand: "town", rural: true, topics: ["cottage-country", "seasonal-population", "retirement-growth", "cottage-caregiver-relief"] },
  "Huntsville": { label: "Huntsville", region: "cottage-country", county: "District of Muskoka", populationBand: "town", rural: true, topics: ["cottage-country", "seasonal-population", "tourism-population", "cottage-caregiver-relief"] },

  // ─── Hamilton / Niagara / Golden Horseshoe ───────────────
  "Hamilton": { label: "Hamilton", region: "niagara", county: "City of Hamilton", metro: "Golden Horseshoe", populationBand: "large", topics: ["cardiac-recovery", "orthopedic-recovery", "stroke-rehab", "hospital-hub", "post-industrial", "university-town"] },
  "Ancaster": { label: "Ancaster", parent: "Hamilton" },
  "Dundas": { label: "Dundas", parent: "Hamilton" },
  "Stoney Creek": { label: "Stoney Creek", parent: "Hamilton" },
  "Grimsby": { label: "Grimsby", region: "niagara", county: "Niagara Region", metro: "Golden Horseshoe", populationBand: "small", topics: ["waterfront", "retirement-growth", "aging-in-place"] },
  "St. Catharines": { label: "St. Catharines", region: "niagara", county: "Niagara Region", populationBand: "mid", topics: ["aging-in-place", "retirement-growth", "hospital-hub", "post-industrial"] },
  "Niagara Falls": { label: "Niagara Falls", region: "niagara", county: "Niagara Region", populationBand: "mid", topics: ["tourism-population", "aging-in-place", "retirement-growth"] },
  "Welland": { label: "Welland", region: "niagara", county: "Niagara Region", populationBand: "small", topics: ["aging-in-place", "post-industrial"] },
  "Fort Erie": { label: "Fort Erie", region: "niagara", county: "Niagara Region", populationBand: "small", topics: ["waterfront", "retirement-growth", "aging-in-place", "snowbird-population"] },

  // ─── Waterloo / Wellington ───────────────────────────────
  "Kitchener": { label: "Kitchener", region: "waterloo", county: "Region of Waterloo", populationBand: "mid", topics: ["multigenerational-households", "aging-in-place", "hospital-hub"] },
  "Waterloo": { label: "Waterloo", region: "waterloo", county: "Region of Waterloo", populationBand: "mid", topics: ["university-town", "aging-in-place"] },
  "Cambridge": { label: "Cambridge", region: "waterloo", county: "Region of Waterloo", populationBand: "mid", topics: ["post-industrial", "aging-in-place"] },
  "Guelph": { label: "Guelph", region: "southwest", county: "Wellington County", populationBand: "mid", topics: ["university-town", "aging-in-place"] },
  "Orangeville": { label: "Orangeville", region: "central", county: "Dufferin County", populationBand: "small", topics: ["rural", "commuter-community"] },
  "Shelburne": { label: "Shelburne", region: "central", county: "Dufferin County", populationBand: "town", rural: true, topics: ["rural"] },

  // ─── Southwestern Ontario ────────────────────────────────
  "London": { label: "London", region: "southwest", county: "Middlesex County", populationBand: "large", topics: ["hospital-hub", "regional-referral-hospital", "university-town", "aging-in-place"] },
  "Windsor": { label: "Windsor", region: "southwest", county: "Essex County", populationBand: "mid", topics: ["post-industrial", "aging-in-place", "multigenerational-households"] },
  "Sarnia": { label: "Sarnia", region: "southwest", county: "Lambton County", populationBand: "small", topics: ["post-industrial", "aging-in-place", "waterfront"] },
  "Chatham-Kent": { label: "Chatham-Kent", region: "southwest", county: "Chatham-Kent", populationBand: "small", rural: true, topics: ["farming-community", "aging-in-place"] },
  "Leamington": { label: "Leamington", region: "southwest", county: "Essex County", populationBand: "small", topics: ["farming-community", "waterfront", "aging-in-place"] },
  "Woodstock": { label: "Woodstock", region: "southwest", county: "Oxford County", populationBand: "small", topics: ["manufacturing-town", "aging-in-place"] },
  "Stratford": { label: "Stratford", region: "southwest", county: "Perth County", populationBand: "small", topics: ["tourism-population", "aging-in-place"] },
  "Brantford": { label: "Brantford", region: "southwest", county: "Brant County", populationBand: "mid", topics: ["post-industrial", "aging-in-place"] },
  "Owen Sound": { label: "Owen Sound", region: "central", county: "Grey County", populationBand: "town", rural: true, topics: ["retirement-growth", "aging-in-place", "waterfront", "rural"] },

  // ─── Central / east Ontario ──────────────────────────────
  "Peterborough": { label: "Peterborough", region: "central", county: "Peterborough County", populationBand: "mid", topics: ["retirement-growth", "aging-in-place", "cottage-country", "university-town"] },
  "Lindsay": { label: "Lindsay", region: "central", county: "Kawartha Lakes", populationBand: "small", rural: true, topics: ["retirement-growth", "aging-in-place", "rural"] },
  "Cobourg": { label: "Cobourg", region: "central", county: "Northumberland County", populationBand: "small", topics: ["waterfront", "retirement-growth", "aging-in-place"] },
  "Port Hope": { label: "Port Hope", region: "central", county: "Northumberland County", populationBand: "small", topics: ["waterfront", "retirement-growth", "aging-in-place"] },
  "Belleville": { label: "Belleville", region: "east", county: "Hastings County", populationBand: "mid", topics: ["aging-in-place", "retirement-growth", "hospital-hub"] },
  "Kingston": { label: "Kingston", region: "east", county: "Frontenac County", populationBand: "mid", topics: ["university-town", "hospital-hub", "aging-in-place", "veterans"] },

  // ─── Ottawa Valley ───────────────────────────────────────
  "Ottawa": { label: "Ottawa", region: "ottawa-valley", county: "City of Ottawa", populationBand: "large", topics: ["bilingual-care", "government-retirees", "veterans", "hospital-hub", "aging-in-place"] },
  "Cornwall": { label: "Cornwall", region: "east", county: "Stormont, Dundas and Glengarry", populationBand: "small", topics: ["bilingual-care", "aging-in-place", "waterfront"] },
  "Hawkesbury": { label: "Hawkesbury", region: "ottawa-valley", county: "Prescott and Russell", populationBand: "town", topics: ["bilingual-care", "aging-in-place"] },
  "Smiths Falls": { label: "Smiths Falls", region: "east", county: "Lanark County", populationBand: "town", topics: ["aging-in-place", "rural"] },
  "Pembroke": { label: "Pembroke", region: "ottawa-valley", county: "Renfrew County", populationBand: "town", topics: ["veterans", "aging-in-place", "rural"] },

  // ─── Northern Ontario ────────────────────────────────────
  "Sudbury": { label: "Sudbury", region: "north", county: "Greater Sudbury", populationBand: "mid", northern: true, topics: ["northern-community", "bilingual-care", "hospital-hub", "aging-in-place"] },
  "Thunder Bay": { label: "Thunder Bay", region: "north", county: "Thunder Bay District", populationBand: "mid", northern: true, topics: ["northern-community", "regional-referral-hospital", "aging-in-place"] },
  "Sault Ste Marie": { label: "Sault Ste Marie", region: "north", county: "Algoma District", populationBand: "mid", northern: true, topics: ["northern-community", "aging-in-place", "waterfront"] },
  "North Bay": { label: "North Bay", region: "north", county: "Nipissing District", populationBand: "small", northern: true, topics: ["northern-community", "aging-in-place", "hospital-hub"] },
  "Timmins": { label: "Timmins", region: "north", county: "Cochrane District", populationBand: "small", northern: true, topics: ["northern-community", "bilingual-care", "rural"] },
  "Kenora": { label: "Kenora", region: "north", county: "Kenora District", populationBand: "town", northern: true, rural: true, topics: ["northern-community", "waterfront", "rural"] },
};

/** Default fallback profile for cities without an explicit entry. */
const DEFAULT_PROFILE: CityProfile = {
  label: "",
};

/**
 * Look up a city's profile, following one `parent` link so suburbs inherit.
 * Never fabricates — returns DEFAULT_PROFILE when nothing is verified.
 */
export function getCityProfile(cityLabel: string): CityProfile {
  const p = CITY_PROFILES[cityLabel];
  if (!p) return { ...DEFAULT_PROFILE, label: cityLabel };
  if (p.parent) {
    const parent = CITY_PROFILES[p.parent];
    if (parent) {
      // Merge: child's own explicit fields win over parent.
      return { ...parent, ...p, label: cityLabel };
    }
  }
  return p;
}

export function cityHasTopic(cityLabel: string, topic: CityTopic): boolean {
  const p = getCityProfile(cityLabel);
  return !!p.topics?.includes(topic);
}
