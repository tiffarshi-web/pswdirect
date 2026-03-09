import { SEO_CITIES } from "@/lib/seoCityData";

export interface PSWJobCityRoute {
  slug: string;
  city: string;
}

export const pswJobCityRoutes: PSWJobCityRoute[] = SEO_CITIES.map((c) => ({
  slug: `psw-jobs-${c.key}`,
  city: c.label,
}));
