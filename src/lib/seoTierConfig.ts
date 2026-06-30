/**
 * SEO Tier Configuration
 *
 * Indexing throttle REMOVED — all legitimate city/service pages produced by
 * the SEO route system are now indexable (index, follow). The helpers below
 * always return `true` so the per-page `<meta name="robots" content="noindex">`
 * guards never render.
 *
 * `TIER_1_CITY_KEYS` is retained only for legacy imports; it no longer gates
 * route generation or indexability.
 */

/** Legacy curated list — not used for route generation or indexing. */
export const TIER_1_CITY_KEYS: string[] = [
  // Primary
  "toronto", "mississauga", "brampton", "hamilton", "ottawa", "london",
  "kitchener", "waterloo", "windsor",
  // Secondary
  "scarborough", "north-york", "etobicoke", "vaughan", "markham",
  "richmond-hill", "oakville", "burlington", "barrie", "oshawa", "whitby",
  "ajax", "pickering", "newmarket", "aurora",
  // Expansion
  "niagara-falls", "st-catharines", "peterborough", "kingston", "guelph",
  "cambridge", "brantford",
  // Wave 2
  "milton", "sudbury", "thunder-bay", "sault-ste-marie", "sarnia",
  "cornwall", "north-bay", "stratford", "owen-sound", "orillia", "cobourg",
  "belleville", "caledon", "halton-hills", "innisfil", "collingwood",
];

/** Always indexable — throttle removed. */
export const isTier1City = (_citySlug: string): boolean => true;

/** Always indexable — throttle removed. */
export const isTier1CityByLabel = (_cityLabel: string): boolean => true;
