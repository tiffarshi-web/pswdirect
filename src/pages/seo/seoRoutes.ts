import { SEO_CITIES } from "@/lib/seoCityData";

export interface SEORoute {
  slug: string;
  city: string;
}

/** PSW city pages only — home-care pages now use HomeCareCityPage */
export const seoRoutes: SEORoute[] = SEO_CITIES.map((c) => ({
  slug: `psw-${c.key}`,
  city: c.label,
}));

/** Home-care city pages rendered by HomeCareCityPage */
export const homeCareCityRoutes: SEORoute[] = SEO_CITIES.map((c) => ({
  slug: `home-care-${c.key}`,
  city: c.label,
}));
