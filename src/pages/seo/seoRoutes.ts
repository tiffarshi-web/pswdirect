import { SEO_CITIES } from "@/lib/seoCityData";

export interface SEORoute {
  slug: string;
  city: string;
}

export const seoRoutes: SEORoute[] = SEO_CITIES.flatMap((c) => [
  { slug: `psw-${c.key}`, city: c.label },
  { slug: `home-care-${c.key}`, city: c.label },
]);
