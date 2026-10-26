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
  localLandingPages?: { path: string; cityKey: string; city: string; service: string; label: string }[];
  familyCounts?: Record<string, number>;
}

export const seoEligibilityManifest = manifestJson as SeoEligibilityManifest;

const eligibleLanguageCitySlugs = new Set(seoEligibilityManifest.eligibleLanguageCitySlugs);
const sitemapPaths = new Set(seoEligibilityManifest.sitemapPaths.map(normalizePath));
const knownPublicPaths = new Set(seoEligibilityManifest.knownPublicPaths.map(normalizePath));
const localLandingPaths = new Set(seoEligibilityManifest.localLandingPages?.map(p => p.path));
export const isSupportedLocalLandingPath = (path: string): boolean => localLandingPaths.has(normalizePath(path));

export const isLanguageCityInventoryEligible = (slug: string): boolean =>
  eligibleLanguageCitySlugs.has(slug.replace(/^\//, "").toLowerCase());

export const isSitemapEligiblePath = (path: string): boolean => sitemapPaths.has(normalizePath(path));

export const isKnownPublicPath = (path: string): boolean => knownPublicPaths.has(normalizePath(path));