import { SEO_CITIES } from "@/lib/seoCityData";
import { EXPANDED_SERVICE_CONTENT, EXPANDED_SERVICE_KEYS } from "./expandedServiceContent";

export interface ExpandedCityServiceRoute {
  slug: string;
  city: string;
  citySlug: string;
  service: string;
  serviceLabel: string;
}

/**
 * Expanded city + service routes generated additively for the SEO client acquisition
 * project. Format: /{service}-{city}. Does not overwrite any existing routes;
 * existing service slugs are excluded by construction (via a separate content map).
 */
export const expandedCityServiceRoutes: ExpandedCityServiceRoute[] = SEO_CITIES.flatMap((city) =>
  EXPANDED_SERVICE_KEYS.map((service) => ({
    slug: `${service}-${city.key}`,
    city: city.label,
    citySlug: city.key,
    service,
    serviceLabel: EXPANDED_SERVICE_CONTENT[service].label,
  }))
);
