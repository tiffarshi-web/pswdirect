// Prebuild script: writes static sitemap files to public/ so /sitemap.xml is
// reachable on the site origin.
//
// Important: the main SEO sitemap is generated from the same route registries
// used by src/App.tsx. Do not fetch the main sitemap from the deployed edge
// function here; that can lag behind the app bundle and cause Google to crawl
// routes that the current React app does not actually generate.
// Chunks the main sitemap into ≤25k-URL parts to stay under repo file size limits
// and well below the 50k-URL/50MB Google sitemap caps.
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync } from "fs";
import { resolve } from "path";
import { pathToFileURL } from "url";
import { seoRoutes, homeCareCityRoutes } from "../src/pages/seo/seoRoutes";
import { cityServiceRoutes } from "../src/pages/seo/cityServiceRoutes";
import { additionalCityServiceRoutes } from "../src/pages/seo/additionalCityServiceRoutes";
import { languageRoutes } from "../src/pages/seo/languageRoutes";
import { languageCityRoutes, languageCitySlug } from "../src/pages/seo/languageCityRoutes";
import { languageServiceCityRoutes } from "../src/pages/seo/languageServiceCityRoutes";
import { emergencyCareRoutes } from "../src/pages/seo/emergencyCareRoutes";
import { pswJobCityRoutes } from "../src/pages/seo/pswJobRoutes";
import { questionRoutes } from "../src/pages/seo/questionRoutes";
import { homeCareKeywordRoutes } from "../src/pages/seo/homeCareKeywordRoutes";
import { privateHomeCareCityRoutes } from "../src/pages/seo/privateHomeCareRoutes";
import { APPROVED_HOME_CARE_CITIES } from "../src/lib/approvedHomeCareCities";
import { pswWorkerCityRoutes } from "../src/pages/seo/pswWorkerCityRoutes";
import { caregiverCityRoutes } from "../src/pages/seo/caregiverCityRoutes";
import { cityNearMeRoutes } from "../src/pages/seo/cityNearMeRoutes";
import { expandedCityServiceRoutes } from "../src/pages/seo/expandedCityServiceRoutes";
import { FAMILY_INTENT_SLUGS } from "../src/pages/seo/familyIntentRoutes";
import { homeCareLanguageRoutes } from "../src/pages/seo/homeCareLanguageRoutes";
import { SEO_CITIES } from "../src/lib/seoCityData";
import { isRedirectedSlug, resolveLegacySeoPath } from "../src/pages/seo/legacyRedirects";
import { isPrivatePath } from "../src/lib/seoIndexability";
import { getCityProfile } from "../src/lib/cityProfiles";
import { SEO_SUPPORTED_SERVICES, SEO_LANGUAGE_CARE_TOPICS, localServiceEligible, provinceSupportsSeo, type SeoProvinceEvidence } from "../src/lib/seoSupportedServices";
import { ONTARIO_HUBS } from "../src/lib/serviceOntarioHubs";

const SUPABASE_FN = "https://pavibobervhqkfzwkotw.supabase.co/functions/v1/generate-sitemap";
const SITE = "https://pswdirect.ca";
const CHUNK_SIZE = 25000;

type SitemapUrl = { loc: string; priority: string; freq: string };
type NearbyPswRecord = { languages: string[] | null };
export type InventorySnapshot = {
  provinces?: SeoProvinceEvidence[];
  offeredServiceIds?: string[];
  radiusKm: number;
  complete: boolean;
  failedCities: string[];
  activeCityKeys: Set<string>;
  eligibleLanguageCitySlugs: Set<string>;
};

function readDotEnvValue(key: string): string | undefined {
  try {
    const env = readFileSync(resolve(".env"), "utf8");
    const line = env.split(/\r?\n/).find((entry) => entry.startsWith(`${key}=`));
    return line?.slice(key.length + 1).replace(/^['"]|['"]$/g, "");
  } catch {
    return undefined;
  }
}

const BACKEND_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || readDotEnvValue("VITE_SUPABASE_URL");
const PUBLISHABLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || readDotEnvValue("VITE_SUPABASE_PUBLISHABLE_KEY");

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed ${url}: ${res.status}`);
  return res.text();
}

function splitUrls(xml: string): string[] {
  return xml.match(/<url>[\s\S]*?<\/url>/g) ?? [];
}

function wrapUrlset(urls: string[]): string {
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...urls,
    `</urlset>`,
  ].join("\n");
}

function extractRecordKeys(filePath: string): string[] {
  const src = readFileSync(resolve(filePath), "utf8");
  return [...src.matchAll(/^\s*"([^"]+)":\s*\{/gm)].map((m) => m[1]);
}

// No <lastmod>: this project has no per-page content-modification timestamp,
// and stamping the build date on 75k URLs is a false freshness signal that
// Google discounts (and that made every deploy look like a sitewide edit).
function toUrlNode(p: SitemapUrl): string {
  return `  <url>
    <loc>${p.loc}</loc>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`;
}

async function fetchInventorySnapshot(): Promise<InventorySnapshot> {
  let provinces: SeoProvinceEvidence[] = [];
  let offeredServiceIds: string[] = [];
  const headers = { apikey: PUBLISHABLE_KEY ?? "", authorization: `Bearer ${PUBLISHABLE_KEY ?? ""}` };
  try {
    if (!BACKEND_URL || !PUBLISHABLE_KEY) throw new Error("missing public configuration");
    const [provinceResponse, servicesResponse] = await Promise.all([
      fetch(`${BACKEND_URL}/rest/v1/provinces?select=code,is_active,launch_status,bookings_enabled,payments_enabled,recruitment_enabled`, { headers, signal: AbortSignal.timeout(20000) }),
      fetch(`${BACKEND_URL}/rest/v1/provincial_pricing?select=service_id&province=eq.ON&active=eq.true`, { headers, signal: AbortSignal.timeout(20000) }),
    ]);
    if (!provinceResponse.ok || !servicesResponse.ok) throw new Error("public launch/service read failed");
    const provinceData = await provinceResponse.json();
    const serviceData = await servicesResponse.json();
    if (!Array.isArray(provinceData) || !Array.isArray(serviceData)) throw new Error("malformed launch/service response");
    provinces = provinceData;
    offeredServiceIds = [...new Set<string>(serviceData.filter(r => r && typeof r.service_id === "string").map(r => r.service_id))];
  } catch (error) {
    console.error("SEO eligibility: launch/service evidence unavailable; dependent families fail closed.", error);
  }
  if (!BACKEND_URL || !PUBLISHABLE_KEY) {
    console.error("SEO eligibility: missing backend URL/key; failing closed with no inventory pages.");
    return { radiusKm: 75, complete: false, failedCities: SEO_CITIES.map((city) => city.key), activeCityKeys: new Set(), eligibleLanguageCitySlugs: new Set() };
  }

  const indexable = new Set<string>();
  const activeCityKeys = new Set<string>();
  const failedCities: string[] = [];
  const languageByCode = new Map(
    languageCityRoutes
      .filter((r) => !r.isAlias)
      .map((r) => [r.languageCode, r] as const),
  );
  const langSlugByCode = new Map<string, string>();
  for (const route of languageCityRoutes) {
    if (!route.isAlias) langSlugByCode.set(route.languageCode, route.languageSlug.replace("psw-language-", ""));
  }

  let radiusKm = 75;
  try {
    const radiusResponse = await fetch(`${BACKEND_URL}/rest/v1/rpc/active_service_radius_km`, {
      signal: AbortSignal.timeout(20000),
      method: "POST",
      headers: { apikey: PUBLISHABLE_KEY, authorization: `Bearer ${PUBLISHABLE_KEY}`, "content-type": "application/json" },
      body: "{}",
    });
    if (!radiusResponse.ok) throw new Error(String(radiusResponse.status));
    const configuredRadius = Number(await radiusResponse.json());
    if (!Number.isFinite(configuredRadius) || configuredRadius <= 0) throw new Error("invalid radius");
    radiusKm = configuredRadius;
  } catch (error) {
    console.error("SEO eligibility: active service radius lookup failed; all inventory pages fail closed.", error);
    return { radiusKm, complete: false, failedCities: SEO_CITIES.map((city) => city.key), activeCityKeys, eligibleLanguageCitySlugs: indexable };
  }

  const checkCity = async (city: (typeof SEO_CITIES)[number]) => {
    try {
      const res = await fetch(`${BACKEND_URL}/rest/v1/rpc/get_nearby_psws_public`, {
        signal: AbortSignal.timeout(20000),
        method: "POST",
        headers: {
          apikey: PUBLISHABLE_KEY,
          authorization: `Bearer ${PUBLISHABLE_KEY}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({ p_lat: city.lat, p_lng: city.lng, p_radius_km: radiusKm }),
      });

      if (!res.ok) {
        throw new Error(`Language-city inventory check failed for ${city.key}: ${res.status}`);
      }

      const nearby = (await res.json()) as NearbyPswRecord[];
      if (!Array.isArray(nearby) || nearby.some(psw => !psw ||
        (psw.languages !== null && (!Array.isArray(psw.languages) || psw.languages.some(code => typeof code !== "string"))))) {
        throw new Error("malformed response");
      }
      const availableLanguageCodes = new Set<string>();
      nearby.forEach((psw) => psw.languages?.forEach((code) => availableLanguageCodes.add(code)));
      if (nearby.length > 0) activeCityKeys.add(city.key);

      availableLanguageCodes.forEach((code) => {
        if (!languageByCode.has(code)) return;
        const langSlug = langSlugByCode.get(code);
        if (langSlug) indexable.add(languageCitySlug(langSlug, city.key));
      });
    } catch (error) {
      failedCities.push(city.key);
      console.error(`SEO eligibility: ${city.key} inventory lookup failed; city fails closed.`, error);
    }
  };

  const batchSize = 8;
  for (let i = 0; i < SEO_CITIES.length; i += batchSize) {
    await Promise.all(SEO_CITIES.slice(i, i + batchSize).map(checkCity));
  }

  return {
    provinces, offeredServiceIds,
    radiusKm,
    complete: failedCities.length === 0,
    failedCities,
    activeCityKeys,
    eligibleLanguageCitySlugs: indexable,
  };
}

const foundationalSeoPaths = [
  "/", "/faq", "/about", "/guides", "/guides/how-to-hire-a-personal-support-worker",
  "/guides/cost-of-home-care-ontario", "/guides/hospital-discharge-checklist",
  "/guides/signs-your-parent-needs-home-care", "/guides/psw-vs-nurse-difference",
  "/languages", "/cities", "/coverage", "/home-care-ontario", "/home-care-services",
  "/personal-support-workers-ontario", "/psw-directory", "/psw-near-me", "/home-care-near-me",
  "/psw-cost", "/psw-hourly-rate", "/private-home-care", "/doctor-escort-service",
  "/hospital-discharge-care", "/same-day-home-care",
] as const;

/**
 * Public content pages mounted individually in src/App.tsx (not part of a
 * generated route registry). They must be known public paths, otherwise the
 * route-level robots owner treats them as unknown routes and emits
 * noindex,nofollow on live customer-facing pages.
 */
const mountedPublicSeoPaths = [
  "/home-care", "/personal-support-worker", "/caregiver-services", "/in-home-care",
  "/senior-home-care", "/senior-home-care-near-me", "/senior-care-near-me",
  "/caregiver-near-me", "/elderly-care-near-me", "/personal-support-worker-near-me",
  "/elderly-care-at-home", "/overnight-home-care", "/24-hour-home-care",
  "/post-hospital-care", "/private-caregiver",
  "/in-home-care-ontario", "/in-home-care-services", "/private-home-care-ontario",
  "/private-home-care-near-me", "/private-home-care-services",
  "/ontario-home-care", "/ontario-psw-locations", "/ontario-home-care-services",
  "/home-care-ontario-map",
  "/help-for-elderly-parents-at-home", "/care-for-aging-parents",
  "/help-with-elderly-parent-daily-care", "/support-for-seniors-at-home",
  "/care-for-elderly-after-hospital", "/home-care-after-hospital-discharge",
  "/urgent-caregiver-services", "/psw-after-surgery", "/hospital-discharge-care-ontario",
  "/help-with-bathing-elderly", "/senior-transportation-services",
  "/doctor-appointment-assistance", "/companionship-for-seniors",
  "/meal-preparation-for-seniors",
  "/home-care-cost-ontario", "/caregiver-cost-canada", "/is-home-care-covered-by-insurance",
  "/psw-pay-calculator", "/psw-agency-vs-private-pay", "/psw-work-areas-ontario",
  "/private-psw-jobs", "/overnight-psw-jobs", "/24-hour-psw-jobs", "/psw-part-time-jobs",
  "/islamabad-community-care-ontario", "/islamabad-community-home-care-ontario",
  "/islamabad-community-doctor-escort-ontario",
  "/islamabad-community-hospital-discharge-care-ontario",
  "/islamabad-community-overnight-care-ontario",
] as const;

function allKnownPublicPaths(): string[] {
  const paths = new Set<string>([...foundationalSeoPaths, ...mountedPublicSeoPaths]);
  const add = (slug: string) => paths.add(slug.startsWith("/") ? slug : `/${slug}`);

  [seoRoutes, homeCareCityRoutes, pswWorkerCityRoutes, cityServiceRoutes, additionalCityServiceRoutes,
    languageRoutes, homeCareLanguageRoutes, languageCityRoutes, languageServiceCityRoutes,
    emergencyCareRoutes, pswJobCityRoutes, questionRoutes, homeCareKeywordRoutes,
    privateHomeCareCityRoutes, caregiverCityRoutes, cityNearMeRoutes, expandedCityServiceRoutes]
    .forEach((routes) => routes.forEach((route) => add(route.slug)));
  FAMILY_INTENT_SLUGS.forEach(add);
  APPROVED_HOME_CARE_CITIES.forEach(c => add(c.slug));
  ["src/pages/seo/LongTailPages.tsx", "src/pages/seo/ConditionPages.tsx", "src/pages/seo/InsurancePages.tsx", "src/pages/seo/TrustPages.tsx"]
    .forEach((file) => extractRecordKeys(file).forEach(add));
  ONTARIO_HUBS.forEach(hub => add(hub.slug));
  return [...paths].sort();
}

function writeEligibilityManifest(snapshot: InventorySnapshot, sitemapPaths: string[]) {
  const localLandingPages = supportedLocalPages(snapshot).filter(page => sitemapPaths.includes(page.path));
  const languageCarePages = supportedLanguageCarePages(snapshot).filter(page => sitemapPaths.includes(page.path));
  const familyCounts: Record<string, number> = { "local-service-city": localLandingPages.length, "language-service-city": languageCarePages.length, "language-city": 0, "recruitment-city": 0, "language": 0, "editorial-core": 0 };
  for (const path of sitemapPaths) {
    if (localLandingPages.some(p => p.path === path) || languageCarePages.some(p => p.path === path)) continue;
    const family = path.includes("-speaking-psw-") ? "language-city" : path.startsWith("/psw-jobs-") ? "recruitment-city" : path.startsWith("/psw-language-") ? "language" : "editorial-core";
    familyCounts[family]++;
  }
  const manifest = {
    version: 2,
    ruleVersion: "supported-local-care-v3",
    provinces: snapshot.provinces ?? [],
    offeredServiceIds: snapshot.offeredServiceIds ?? [],
    localLandingPages, languageCarePages, familyCounts,
    generatedAt: new Date().toISOString(),
    inventoryRadiusKm: snapshot.radiusKm,
    inventoryComplete: snapshot.complete,
    failedCities: [...snapshot.failedCities].sort(),
    activeCityKeys: [...snapshot.activeCityKeys].sort(),
    eligibleLanguageCitySlugs: [...snapshot.eligibleLanguageCitySlugs].filter(slug => sitemapPaths.includes(`/${slug}`)).sort(),
    sitemapPaths: [...sitemapPaths].sort(),
    knownPublicPaths: allKnownPublicPaths(),
  };
  mkdirSync(resolve("src/generated"), { recursive: true });
  writeFileSync(resolve("src/generated/seoEligibilityManifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Mounted public paths that must never be advertised in a sitemap:
 *  - REDIRECT_ONLY: the route only forwards to another canonical page.
 *  - THIN_RECRUITMENT: worker-recruitment stubs (~120-210 words of generic copy)
 *    that were in the sitemap but repeat each other and the /join-team flow.
 *    They stay reachable and render noindex,follow (known public, not eligible)
 *    until they get substantive, distinct content.
 */
export const SITEMAP_EXCLUDED_PATHS = new Set<string>([
  // REDIRECT_ONLY
  "/private-home-care-services", "/meal-preparation-for-seniors",
  // Consolidated home-care entry aliases (city pages come from approvedHomeCareCities).
  "/home-care", "/ontario-home-care",
  // THIN_RECRUITMENT
  "/private-psw-jobs", "/overnight-psw-jobs", "/24-hour-psw-jobs", "/psw-part-time-jobs",
  "/psw-pay-calculator", "/psw-agency-vs-private-pay", "/psw-work-areas-ontario",
]);

export function supportedLocalPages(snapshot: InventorySnapshot) {
  const province = snapshot.provinces?.find(p => p.code === "ON");
  const rosterCities = new Set<string>(APPROVED_HOME_CARE_CITIES.map(city => city.key));
  const candidates = [...expandedCityServiceRoutes, ...additionalCityServiceRoutes, ...cityServiceRoutes];
  const seen = new Set<string>();
  return candidates.flatMap(route => {
    const city = SEO_CITIES.find(c => c.label === route.city);
    const topic = SEO_SUPPORTED_SERVICES[route.service];
    const path = `/${route.slug}`;
    if (!city || !topic || seen.has(path)) return [];
    // Bound this family cluster to actual roster localities; do not extend
    // proximity-only recovery/memory pages or promote specialist dementia routes.
    if (["post-surgery-care", "recovery-care", "memory-care"].includes(route.service) && !rosterCities.has(city.key)) return [];
    // A real local profile (not a generated Ontario fallback) supplies local substance.
    const profile = getCityProfile(city.label);
    const canonical = route.slug === `${route.service}-${city.key}` && !isRedirectedSlug(route.slug) && !resolveLegacySeoPath(path);
    if (!localServiceEligible({ province, service: route.service, offeredServiceIds: snapshot.offeredServiceIds ?? [],
      hasLocalContent: Boolean(profile.region && profile.county), hasNearbyInventory: snapshot.activeCityKeys.has(city.key), canonical })) return [];
    seen.add(path);
    return [{ path, cityKey: city.key, city: city.label, service: route.service, label: topic.label }];
  });
}

export function supportedLanguageCarePages(snapshot: InventorySnapshot) {
  const province = snapshot.provinces?.find(p => p.code === "ON");
  return languageServiceCityRoutes.flatMap(route => {
    const service = SEO_LANGUAGE_CARE_TOPICS[route.service];
    const topic = SEO_SUPPORTED_SERVICES[service];
    const city = SEO_CITIES.find(c => c.label === route.city);
    if (!topic || !city) return [];
    const languageSlug = route.languageSlug.replace("psw-language-", "");
    const profile = getCityProfile(city.label);
    const path = `/${route.slug}`;
    if (!localServiceEligible({ province, service, offeredServiceIds: snapshot.offeredServiceIds ?? [],
      hasLocalContent: Boolean(profile.region && profile.county),
      hasNearbyInventory: snapshot.activeCityKeys.has(city.key) && snapshot.eligibleLanguageCitySlugs.has(languageCitySlug(languageSlug, city.key)),
      canonical: route.slug === `${languageSlug}-${route.service}-${city.key}` && !resolveLegacySeoPath(path) && !isRedirectedSlug(route.slug),
    })) return [];
    return [{ path, cityKey: city.key, city: city.label, service, label: topic.label, languageLabel: route.languageLabel,
      languageCityPath: `/${languageCitySlug(languageSlug, city.key)}` }];
  });
}

export async function buildMainSitemapUrls(snapshot: InventorySnapshot): Promise<{ nodes: string[]; paths: string[] }> {
  const pages = new Map<string, SitemapUrl>();
  const ontario = snapshot.provinces?.find(p => p.code === "ON");
  const careOpen = provinceSupportsSeo(ontario, "care");
  const add = (pathOrSlug: string, priority = "0.7", freq = "weekly") => {
    const path = pathOrSlug.startsWith("/") ? pathOrSlug : `/${pathOrSlug}`;
    // SEO URL consolidation: never emit a URL that redirects or is noindex.
    const slug = path.replace(/^\//, "");
    if (isRedirectedSlug(slug)) return;
    if (SITEMAP_EXCLUDED_PATHS.has(path)) return;
    if (slug.startsWith("meal-preparation")) return;
    // Private / account / auth / checkout routes are noindex — never in a sitemap.
    if (isPrivatePath(path)) return;
    // Any slug that resolves to a different canonical is an alias: it redirects,
    // so it must never be advertised to Google.
    if (resolveLegacySeoPath(path)) return;
    // No query-string or trailing-slash variants.
    if (path.includes("?") || (path.length > 1 && path.endsWith("/"))) return;
    const loc = `${SITE}${path}`;
    // Preserve the first occurrence so hand-curated static priorities win and
    // duplicate route registry entries do not create duplicate sitemap URLs.
    if (!pages.has(loc)) pages.set(loc, { loc, priority, freq });
  };

  const staticSeoPaths = [
    ["/", "1.0", "daily"], ["/faq", "0.8", "monthly"], ["/about", "0.7", "monthly"],
    ["/guides", "0.7", "monthly"], ["/guides/how-to-hire-a-personal-support-worker", "0.7", "monthly"],
    ["/guides/cost-of-home-care-ontario", "0.7", "monthly"], ["/guides/hospital-discharge-checklist", "0.7", "monthly"],
    ["/guides/signs-your-parent-needs-home-care", "0.7", "monthly"], ["/guides/psw-vs-nurse-difference", "0.7", "monthly"],
    ["/languages", "0.8", "weekly"], ["/cities", "0.8", "weekly"], ["/coverage", "0.8", "weekly"],
    ["/psw-directory", "0.9", "weekly"], ["/psw-near-me", "0.8", "weekly"], ["/home-care-near-me", "0.8", "weekly"],
    ["/home-care-ontario", "0.9", "weekly"], ["/home-care-services", "0.9", "weekly"],
    ["/personal-support-workers-ontario", "0.9", "weekly"], ["/psw-cost", "0.7", "monthly"],
    ["/psw-hourly-rate", "0.8", "monthly"], ["/private-home-care", "1.0", "weekly"],
    ["/doctor-escort-service", "0.9", "weekly"], ["/hospital-discharge-care", "0.9", "weekly"],
    ["/same-day-home-care", "0.9", "weekly"],
  ] as const;

  staticSeoPaths.forEach(([path, priority, freq]) => {
    if (careOpen || path === "/" || path === "/about" || path === "/faq" || path.startsWith("/guides")) add(path, priority, freq);
  });

  // Individually mounted public content pages. add() already skips redirect
  // aliases, private routes and excluded slugs, so only genuine canonical
  // destinations enter the sitemap (and therefore render index,follow).
  if (careOpen) mountedPublicSeoPaths.forEach((path) => add(path, "0.8", "weekly"));
  // Owner-approved Ontario home-care city pages (src/lib/approvedHomeCareCities.ts).
  if (careOpen) APPROVED_HOME_CARE_CITIES.forEach(c => add(c.slug, "0.8"));
  // Existing, reviewed non-clinical family hubs only; not every generic hub.
  if (careOpen && snapshot.offeredServiceIds?.includes("standard")) {
    ["post-surgery-care-ontario", "dementia-care-ontario", "respite-care-ontario"].forEach(slug => add(slug, "0.9"));
  }
  supportedLocalPages(snapshot).forEach(page => add(page.path, "0.7"));
  supportedLanguageCarePages(snapshot).forEach(page => add(page.path, "0.5"));

  // PSW recruitment city pages: indexable only for cities inside the active
  // service area (at least one approved caregiver within the service radius),
  // so we never advertise jobs where the platform has no operating coverage.
  pswJobCityRoutes
    .filter((r) => provinceSupportsSeo(ontario, "recruitment") && snapshot.activeCityKeys.has(r.slug.replace(/^psw-jobs-/, "")))
    .forEach((r) => add(r.slug, "0.6", "weekly"));


  // Only canonical /{lang}-speaking-psw-{city} routes with matching inventory. Legacy short
  // "/{lang}-psw-{city}" aliases and empty/noindex language-city pages are excluded.
  languageCityRoutes
    .filter((r) => careOpen && !r.isAlias && snapshot.eligibleLanguageCitySlugs.has(r.slug))
    .forEach((r) => add(r.slug, "0.5"));
  const eligibleLanguageCodes = new Set(
    languageCityRoutes
      .filter((r) => careOpen && !r.isAlias && snapshot.eligibleLanguageCitySlugs.has(r.slug))
      .map((r) => r.languageCode),
  );
  languageRoutes.filter((route) => eligibleLanguageCodes.has(route.code)).forEach((route) => add(route.slug, "0.7"));
  const values = [...pages.values()];
  return { nodes: values.map((p) => toUrlNode(p)), paths: values.map((p) => new URL(p.loc).pathname) };
}

function cleanupOldChunks() {
  const dir = resolve("public");
  for (const f of readdirSync(dir)) {
    if (/^sitemap-main(-\d+)?\.xml$/.test(f)) {
      try { unlinkSync(resolve(dir, f)); } catch {}
    }
  }
}

async function main() {
  mkdirSync(resolve("public"), { recursive: true });

  const snapshot = await fetchInventorySnapshot();
  const { nodes: urls, paths } = await buildMainSitemapUrls(snapshot);
  writeEligibilityManifest(snapshot, paths);
  cleanupOldChunks();

  const chunkFiles: string[] = [];
  if (urls.length <= CHUNK_SIZE) {
    writeFileSync(resolve("public/sitemap-main.xml"), wrapUrlset(urls));
    chunkFiles.push("sitemap-main.xml");
  } else {
    for (let i = 0, part = 1; i < urls.length; i += CHUNK_SIZE, part++) {
      const slice = urls.slice(i, i + CHUNK_SIZE);
      const name = `sitemap-main-${part}.xml`;
      writeFileSync(resolve(`public/${name}`), wrapUrlset(slice));
      chunkFiles.push(name);
    }
  }

  // Individual /psw/profile/* pages are thin, noindex,follow pages and are
  // deliberately excluded from every sitemap (Soft 404 remediation).
  try { unlinkSync(resolve("public/sitemap-psws.xml")); } catch {}

  const sitemapEntries = chunkFiles
    .map((f) => `  <sitemap>\n    <loc>${SITE}/${f}</loc>\n  </sitemap>`)
    .join("\n");
  const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
  writeFileSync(resolve("public/sitemap.xml"), index);

  console.log(`✅ sitemap.xml + ${chunkFiles.length} main chunk(s) generated (${urls.length} main URLs)`);
}

// Importing the pure eligibility builder in tests must never fetch or write artifacts.
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error("SEO generation failed", error);
    process.exitCode = 1;
  });
}
