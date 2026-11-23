import data from "./ontarioMunicipalPlaces.json";
import { ONTARIO_CUSTOMER_CITIES } from "./ontarioCustomerCities";
import { APPROVED_HOME_CARE_CITY_KEYS } from "./approvedHomeCareCities";
import { SEO_CITIES } from "./seoCityData";
import { isRedirectedSlug, resolveLegacySeoPath } from "../pages/seo/legacyRedirects";

/**
 * Incorporated Ontario local municipalities missing from the existing customer
 * planning catalog (Statistics Canada 2021 Census facts only). SEO planning only:
 * never use for dispatch, coverage or booking. No office, local staff or
 * caregiver-presence claims.
 */
export interface MunicipalPlace {
  key: string; name: string; type: string; tier: string; division: string;
  pop: number; area: number; slug: string; regionLabel: string; northern: boolean;
}

const NORTHERN = new Set(["Algoma", "Cochrane", "Kenora", "Manitoulin", "Nipissing", "Parry Sound", "Rainy River", "Sudbury", "Thunder Bay", "Timiskaming"]);
const REGIONS = new Set(["Durham", "Niagara", "Waterloo", "York"]);
const UNITED: Record<string, string> = {
  "Leeds and Grenville": "the United Counties of Leeds and Grenville",
  "Prescott and Russell": "the United Counties of Prescott and Russell",
  "Stormont, Dundas and Glengarry": "the United Counties of Stormont, Dundas and Glengarry",
  "Lennox and Addington": "Lennox and Addington County",
};

function regionLabel(division: string, tier: string): string {
  if (tier === "Single-tier") return "Ontario";
  if (UNITED[division]) return UNITED[division];
  if (division === "Muskoka") return "the District Municipality of Muskoka";
  if (NORTHERN.has(division)) return `${division} District`;
  if (REGIONS.has(division)) return `${division} Region`;
  return `${division} County`;
}

/** Existing catalog communities inside a municipality (linked, never merged). */
const MUNICIPAL_COMMUNITIES: Record<string, string[]> = {
  "kawartha-lakes": ["lindsay"], brant: ["paris"], haldimand: ["caledonia"], "quinte-west": ["trenton", "frankford"],
  georgina: ["keswick", "pefferlaw"], scugog: ["blackstock"], brock: ["beaverton"], cramahe: ["colborne"],
  "centre-wellington": ["fergus", "elora"], "strathroy-caradoc": ["strathroy"], "middlesex-centre": ["komoka"],
  lincoln: ["beamsville", "vineland", "jordan"], essa: ["angus"], "lambton-shores": ["grand-bend", "forest"],
  wilmot: ["new-hamburg", "baden"], severn: ["washago", "coldwater"], "asphodel-norwood": ["norwood"],
  selwyn: ["lakefield", "bridgenorth"], "cavan-monaghan": ["millbrook"], "otonabee-south-monaghan": ["keene"],
  "havelock-belmont-methuen": ["havelock"], greenstone: ["geraldton", "nakina"], "west-nipissing": ["sturgeon-falls"],
  "oliver-paipoonge": ["kakabeka-falls"], "stirling-rawdon": ["stirling"], "muskoka-lakes": ["port-carling"],
  "thames-centre": ["dorchester"], "south-frontenac": ["sydenham"], loyalist: ["amherstview", "bath"],
  "north-dumfries": ["ayr"], "huron-shores": ["iron-bridge"], "guelph-eramosa": ["rockwood", "eden-mills"],
  "east-gwillimbury": ["holland-landing", "sharon", "queensville"], "west-lincoln": [],
};

const takenKeys = new Set<string>([...ONTARIO_CUSTOMER_CITIES.map(c => c.key), ...SEO_CITIES.map(c => c.key), ...APPROVED_HOME_CARE_CITY_KEYS]);

export const ONTARIO_MUNICIPAL_PLACES: MunicipalPlace[] = data.places
  .filter(p => !takenKeys.has(p.key) && !isRedirectedSlug(`home-care-${p.key}`) && !resolveLegacySeoPath(`/home-care-${p.key}`))
  .map(p => ({ ...p, slug: `home-care-${p.key}`, regionLabel: regionLabel(p.division, p.tier), northern: NORTHERN.has(p.division) }));

export const municipalCommunityLinks = (key: string) => (MUNICIPAL_COMMUNITIES[key] ?? [])
  .map(k => ONTARIO_CUSTOMER_CITIES.find(c => c.key === k)).filter((c): c is NonNullable<typeof c> => Boolean(c));

export const municipalNeighbours = (place: MunicipalPlace, limit = 6) => ONTARIO_MUNICIPAL_PLACES
  .filter(p => p.division === place.division && p.key !== place.key)
  .sort((a, b) => b.pop - a.pop).slice(0, limit);
