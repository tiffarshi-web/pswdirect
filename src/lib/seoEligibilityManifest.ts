import manifestJson from "@/generated/seoEligibilityManifest.json";
import { normalizePath } from "@/lib/seoIndexability";

export interface SeoEligibilityManifest {
  version: number;
  generatedAt: string;
  inventoryRadiusKm: number | null;
  inventoryComplete: boolean;
  failedCities: string[];
  activeCityKeys: string[];
  eligibleLanguageCitySlugs: string[];
  sitemapPaths: string[];
  knownPublicPaths: string[];
}

export const seoEligibilityManifest = manifestJson as SeoEligibilityManifest;

const eligibleLanguageCitySlugs = new Set(seoEligibilityManifest.eligibleLanguageCitySlugs);
const sitemapPaths = new Set(seoEligibilityManifest.sitemapPaths.map(normalizePath));
const knownPublicPaths = new Set(seoEligibilityManifest.knownPublicPaths.map(normalizePath));

export const isLanguageCityInventoryEligible = (slug: string): boolean =>
  eligibleLanguageCitySlugs.has(slug.replace(/^\//, "").toLowerCase());

export const isSitemapEligiblePath = (path: string): boolean => sitemapPaths.has(normalizePath(path));

export const isKnownPublicPath = (path: string): boolean => knownPublicPaths.has(normalizePath(path));