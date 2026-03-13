import { SEO_CITIES } from "@/lib/seoCityData";

export interface HomeCareKeywordRoute {
  slug: string;
  city: string;
  keyword: "senior-care" | "private-caregiver" | "in-home-care";
  keywordLabel: string;
}

const keywords = [
  { key: "senior-care" as const, label: "Senior Care" },
  { key: "private-caregiver" as const, label: "Private Caregiver" },
  { key: "in-home-care" as const, label: "In-Home Care" },
];

export const homeCareKeywordRoutes: HomeCareKeywordRoute[] = SEO_CITIES.flatMap((city) =>
  keywords.map((kw) => ({
    slug: `${kw.key}-${city.key}`,
    city: city.label,
    keyword: kw.key,
    keywordLabel: kw.label,
  }))
);
