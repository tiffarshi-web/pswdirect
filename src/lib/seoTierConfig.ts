/**
 * SEO Tier Configuration
 * Controls which cities are indexable (Tier 1) vs noindex (Tier 2+).
 * Expand TIER_1_CITY_KEYS to scale indexing gradually.
 */

/** Tier 1 cities — fully indexable, included in sitemap */
export const TIER_1_CITY_KEYS: string[] = [
  // Primary
  "toronto",
  "mississauga",
  "brampton",
  "hamilton",
  "ottawa",
  "london",
  "kitchener",
  "waterloo",
  "windsor",
  // Secondary
  "scarborough",
  "north-york",
  "etobicoke",
  "vaughan",
  "markham",
  "richmond-hill",
  "oakville",
  "burlington",
  "barrie",
  "oshawa",
  "whitby",
  "ajax",
  "pickering",
  "newmarket",
  "aurora",
  // Expansion
  "niagara-falls",
  "st-catharines",
  "peterborough",
  "kingston",
  "guelph",
  "cambridge",
  "brantford",
];

/** Check if a city slug is Tier 1 (indexable) */
export const isTier1City = (citySlug: string): boolean =>
  TIER_1_CITY_KEYS.includes(citySlug);

/** Check using city label (e.g. "Toronto") */
export const isTier1CityByLabel = (cityLabel: string): boolean => {
  const slug = cityLabel.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return TIER_1_CITY_KEYS.includes(slug);
};
