import { SEO_CITIES } from "@/lib/seoCityData";
import { TIER_1_CITY_KEYS } from "@/lib/seoTierConfig";

export interface CityNearMeRoute {
  slug: string;
  city: string;
  variant: "home-care" | "caregiver" | "psw";
}

/** Only generate city+near-me combos for Tier 1 cities to keep volume manageable */
export const cityNearMeRoutes: CityNearMeRoute[] = SEO_CITIES
  .filter((c) => TIER_1_CITY_KEYS.includes(c.key))
  .flatMap((c) => [
    { slug: `home-care-${c.key}-near-me`, city: c.label, variant: "home-care" as const },
    { slug: `caregiver-${c.key}-near-me`, city: c.label, variant: "caregiver" as const },
    { slug: `psw-${c.key}-near-me`, city: c.label, variant: "psw" as const },
  ]);
