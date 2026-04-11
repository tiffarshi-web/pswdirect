import { SEO_CITIES } from "@/lib/seoCityData";

export interface CaregiverCityRoute {
  slug: string;
  city: string;
}

export const caregiverCityRoutes: CaregiverCityRoute[] = SEO_CITIES.map((c) => ({
  slug: `caregiver-${c.key}`,
  city: c.label,
}));
