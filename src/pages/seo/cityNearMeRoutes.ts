import { SEO_CITIES } from "@/lib/seoCityData";

export interface CityNearMeRoute {
  slug: string;
  city: string;
  variant: "home-care" | "caregiver" | "psw";
}

/** Generate every legitimate city+near-me route so sitemap URLs never soft-404. */
export const cityNearMeRoutes: CityNearMeRoute[] = SEO_CITIES
  .flatMap((c) => [
    { slug: `home-care-${c.key}-near-me`, city: c.label, variant: "home-care" as const },
    { slug: `caregiver-${c.key}-near-me`, city: c.label, variant: "caregiver" as const },
    { slug: `psw-${c.key}-near-me`, city: c.label, variant: "psw" as const },
  ]);
