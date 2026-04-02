import { SEO_CITIES } from "@/lib/seoCityData";

export interface PSWWorkerCityRoute {
  slug: string;
  city: string;
}

export const pswWorkerCityRoutes: PSWWorkerCityRoute[] = SEO_CITIES.map((c) => ({
  slug: `personal-support-worker-${c.key}`,
  city: c.label,
}));
