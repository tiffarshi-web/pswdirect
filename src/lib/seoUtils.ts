// Shared SEO utilities for structured data generation

import { getNearbyCities as getNearbyCitiesFromData } from "@/lib/seoCityData";

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
 * Get nearby cities for geo SEO signals (delegates to centralized data)
 */
export const getNearbyCities = (city: string): string[] => {
  return getNearbyCitiesFromData(city);
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
