import { SEO_CITIES } from "@/lib/seoCityData";

export interface EmergencyCareRoute {
  slug: string;
  city: string;
  variant: "urgent" | "same-day";
}

export const emergencyCareRoutes: EmergencyCareRoute[] = SEO_CITIES.flatMap((city) => [
  { slug: `urgent-home-care-${city.key}`, city: city.label, variant: "urgent" as const },
  { slug: `same-day-home-care-${city.key}`, city: city.label, variant: "same-day" as const },
]);
