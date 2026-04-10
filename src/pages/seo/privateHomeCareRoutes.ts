import { SEO_CITIES } from "@/lib/seoCityData";

/** Route definitions for /private-home-care-{city} pages — auto-generated for ALL SEO cities */
export const privateHomeCareCityRoutes = SEO_CITIES.map((c) => ({
  slug: `private-home-care-${c.key}`,
  city: c.label,
}));
