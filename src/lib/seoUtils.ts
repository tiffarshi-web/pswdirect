// Shared SEO utilities for structured data generation

const SITE_URL = "https://psadirect.ca";
const ORG_ID = `${SITE_URL}/#organization`;
const OG_IMAGE = `${SITE_URL}/logo-512.png`;

export { SITE_URL, ORG_ID, OG_IMAGE };

/**
 * Generate BreadcrumbList JSON-LD
 * Each item: { name, url }
 */
export const buildBreadcrumbList = (items: { name: string; url: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    item: item.url,
  })),
});

/**
 * Generate ProfessionalService JSON-LD
 */
export const buildProfessionalService = (city?: string) => ({
  "@type": "ProfessionalService",
  "@id": city ? `${SITE_URL}/psw-${city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}#service` : `${SITE_URL}/#professional-service`,
  name: "PSW Direct",
  description: city
    ? `Professional personal support worker services in ${city}, Ontario. Vetted home care workers, elderly caregivers, and private PSW services.`
    : "Professional personal support worker services across Ontario. Vetted home care workers, elderly caregivers, and private PSW services.",
  url: SITE_URL,
  telephone: "+1-249-288-4787",
  priceRange: "$30-$35",
  serviceType: ["Personal Support Worker", "Home Care Worker", "Elderly Caregiver", "Private PSW"],
  areaServed: city
    ? { "@type": "City", name: city, containedInPlace: { "@type": "AdministrativeArea", name: "Ontario" } }
    : { "@type": "AdministrativeArea", name: "Ontario, Canada" },
  provider: { "@id": ORG_ID },
});

/**
 * Nearby cities mapping for geo signals
 * Maps a city to its neighboring cities for "near me" relevance
 */
const nearbyCitiesMap: Record<string, string[]> = {
  "Toronto": ["North York", "Scarborough", "Etobicoke", "Mississauga", "Vaughan", "Richmond Hill", "Markham", "Pickering", "Ajax", "Whitby"],
  "Mississauga": ["Toronto", "Brampton", "Oakville", "Burlington", "Etobicoke", "Meadowvale", "Streetsville"],
  "Brampton": ["Toronto", "Mississauga", "Vaughan", "Georgetown", "Malton", "Bramalea"],
  "Vaughan": ["Toronto", "Brampton", "Richmond Hill", "Markham", "Woodbridge", "Maple", "Concord"],
  "Markham": ["Toronto", "Vaughan", "Richmond Hill", "Pickering", "Unionville", "Stouffville"],
  "Richmond Hill": ["Toronto", "Vaughan", "Markham", "Aurora", "Newmarket", "Oak Ridges"],
  "Oakville": ["Mississauga", "Burlington", "Milton", "Bronte", "Palermo"],
  "Burlington": ["Oakville", "Hamilton", "Milton", "Waterdown", "Aldershot"],
  "Ajax": ["Pickering", "Whitby", "Oshawa", "Courtice"],
  "Pickering": ["Ajax", "Toronto", "Markham", "Scarborough", "Whitby"],
  "Oshawa": ["Whitby", "Ajax", "Courtice", "Bowmanville"],
  "Whitby": ["Oshawa", "Ajax", "Pickering", "Courtice"],
  "Barrie": ["Innisfil", "Orillia", "Alliston", "Newmarket", "Angus", "Alcona"],
  "Hamilton": ["Burlington", "Dundas", "Stoney Creek", "Ancaster", "Waterdown", "Binbrook"],
  "Kitchener": ["Waterloo", "Cambridge", "Guelph", "Elmira", "New Hamburg"],
  "Waterloo": ["Kitchener", "Cambridge", "Guelph", "Elmira"],
  "Cambridge": ["Kitchener", "Waterloo", "Guelph", "Hespeler", "Preston"],
  "London": ["St. Thomas", "Woodstock", "Strathroy", "Aylmer"],
  "Windsor": ["LaSalle", "Tecumseh", "Lakeshore", "Amherstburg", "Essex"],
  "St. Catharines": ["Niagara Falls", "Welland", "Thorold", "Pelham", "Grimsby"],
  "Niagara Falls": ["St. Catharines", "Welland", "Fort Erie", "Thorold"],
  "Guelph": ["Kitchener", "Cambridge", "Waterloo", "Milton", "Fergus"],
  "Kingston": ["Gananoque", "Napanee", "Belleville", "Amherstview", "Bath"],
  "Peterborough": ["Lindsay", "Lakefield", "Cobourg", "Norwood", "Bridgenorth"],
  "Ottawa": ["Gatineau", "Kanata", "Orleans", "Barrhaven", "Nepean", "Gloucester"],
  "Newmarket": ["Aurora", "Richmond Hill", "Barrie", "Markham", "Bradford", "Holland Landing"],
  "Aurora": ["Newmarket", "Richmond Hill", "Markham", "King City"],
  "Milton": ["Oakville", "Burlington", "Guelph", "Cambridge", "Georgetown", "Campbellville"],
  "Innisfil": ["Barrie", "Bradford", "Newmarket", "Alliston", "Alcona", "Stroud"],
  "Orillia": ["Barrie", "Innisfil", "Midland", "Gravenhurst"],
  "Bradford": ["Newmarket", "Innisfil", "Barrie", "Aurora", "Holland Landing"],
  "Alliston": ["Barrie", "Innisfil", "Bradford", "Angus", "Beeton"],
  "Cobourg": ["Peterborough", "Belleville", "Port Hope", "Trenton"],
  "Belleville": ["Kingston", "Cobourg", "Peterborough", "Trenton", "Napanee"],
  "Welland": ["St. Catharines", "Niagara Falls", "Thorold", "Pelham"],
  "Stoney Creek": ["Hamilton", "Burlington", "Dundas", "Ancaster", "Grimsby"],
  "Georgetown": ["Brampton", "Milton", "Guelph", "Acton"],
  "Dundas": ["Hamilton", "Burlington", "Stoney Creek", "Ancaster"],
  "Woodstock": ["London", "Cambridge", "Kitchener", "Tillsonburg"],
  "Courtice": ["Oshawa", "Whitby", "Ajax", "Bowmanville"],
};

/**
 * Get nearby cities for geo SEO signals
 */
export const getNearbyCities = (city: string): string[] => {
  return nearbyCitiesMap[city] || [];
};

/**
 * Generate geo meta tags content for a given city/lat/lng
 * Returns hidden geo signals without exposing coordinates publicly
 */
export const buildGeoMeta = (city: string, lat?: number | null, lng?: number | null) => {
  const nearbyCities = getNearbyCities(city);
  const geoDescription = nearbyCities.length > 0
    ? `Serving ${city} and nearby areas including ${nearbyCities.slice(0, 3).join(", ")}`
    : `Serving ${city} and surrounding communities in Ontario`;
  
  return {
    geoRegion: "CA-ON",
    geoPlaceName: city,
    geoPosition: lat && lng ? `${lat};${lng}` : undefined,
    icbm: lat && lng ? `${lat}, ${lng}` : undefined,
    geoDescription,
    nearbyCities,
  };
};

/**
 * Generate PSW profile slug from first name, last name, city
 * Uses FIRST NAME + last initial ONLY for privacy
 * e.g. sarah-k-toronto
 */
export const generatePrivacySlug = (firstName: string, lastName: string, city: string | null) =>
  `${firstName}-${lastName.charAt(0)}-${city || "ontario"}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Legacy slug format (full last name) — used for backward compatibility
 */
export const generateLegacySlug = (firstName: string, lastName: string, city: string | null) =>
  `${firstName}-${lastName}-${city || "ontario"}`
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

/**
 * Generate descriptive alt text for PSW profile images
 */
export const generatePSWAltText = (firstName: string, lastInitial: string, city: string | null) =>
  `${firstName} ${lastInitial}. personal support worker serving ${city || "Ontario"} Ontario`;

/**
 * Privacy-safe display name: First name + last initial
 */
export const getPrivacyDisplayName = (firstName: string, lastName: string) =>
  `${firstName} ${lastName.charAt(0)}.`;
