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
import { pswWorkerCityRoutes } from "../src/pages/seo/pswWorkerCityRoutes";
import { caregiverCityRoutes } from "../src/pages/seo/caregiverCityRoutes";
import { cityNearMeRoutes } from "../src/pages/seo/cityNearMeRoutes";
import { expandedCityServiceRoutes } from "../src/pages/seo/expandedCityServiceRoutes";
import { FAMILY_INTENT_SLUGS } from "../src/pages/seo/familyIntentRoutes";
import { homeCareLanguageRoutes } from "../src/pages/seo/homeCareLanguageRoutes";
import { SEO_CITIES } from "../src/lib/seoCityData";
import { isRedirectedSlug, resolveLegacySeoPath } from "../src/pages/seo/legacyRedirects";
import { isPrivatePath } from "../src/lib/seoIndexability";

const SUPABASE_FN = "https://pavibobervhqkfzwkotw.supabase.co/functions/v1/generate-sitemap";
const SITE = "https://pswdirect.ca";
const CHUNK_SIZE = 25000;

type SitemapUrl = { loc: string; priority: string; freq: string };
type NearbyPswRecord = { languages: string[] | null };
type InventorySnapshot = {
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
      const res = await fetch(`${BACKEND_URL}/rest/v1/rpc/get_nearby_psws`, {
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
      if (!Array.isArray(nearby)) throw new Error("malformed response");
      if (nearby.length > 0) activeCityKeys.add(city.key);
      const availableLanguageCodes = new Set<string>();
      nearby.forEach((psw) => psw.languages?.forEach((code) => availableLanguageCodes.add(code)));

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

function allKnownPublicPaths(): string[] {
  const paths = new Set<string>(foundationalSeoPaths);
  const add = (slug: string) => paths.add(slug.startsWith("/") ? slug : `/${slug}`);
  [seoRoutes, homeCareCityRoutes, pswWorkerCityRoutes, cityServiceRoutes, additionalCityServiceRoutes,
    languageRoutes, homeCareLanguageRoutes, languageCityRoutes, languageServiceCityRoutes,
    emergencyCareRoutes, pswJobCityRoutes, questionRoutes, homeCareKeywordRoutes,
    privateHomeCareCityRoutes, caregiverCityRoutes, cityNearMeRoutes, expandedCityServiceRoutes]
    .forEach((routes) => routes.forEach((route) => add(route.slug)));
  FAMILY_INTENT_SLUGS.forEach(add);
  ["src/pages/seo/LongTailPages.tsx", "src/pages/seo/ConditionPages.tsx", "src/pages/seo/InsurancePages.tsx", "src/pages/seo/TrustPages.tsx"]
    .forEach((file) => extractRecordKeys(file).forEach(add));
  return [...paths].sort();
}

function writeEligibilityManifest(snapshot: InventorySnapshot, sitemapPaths: string[]) {
  const manifest = {
    version: 1,
    generatedAt: new Date().toISOString(),
    inventoryRadiusKm: snapshot.radiusKm,
    inventoryComplete: snapshot.complete,
    failedCities: [...snapshot.failedCities].sort(),
    activeCityKeys: [...snapshot.activeCityKeys].sort(),
    eligibleLanguageCitySlugs: [...snapshot.eligibleLanguageCitySlugs].sort(),
    sitemapPaths: [...sitemapPaths].sort(),
    knownPublicPaths: allKnownPublicPaths(),
  };
  mkdirSync(resolve("src/generated"), { recursive: true });
  writeFileSync(resolve("src/generated/seoEligibilityManifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

async function buildMainSitemapUrls(snapshot: InventorySnapshot): Promise<{ nodes: string[]; paths: string[] }> {
  const pages = new Map<string, SitemapUrl>();
  const add = (pathOrSlug: string, priority = "0.7", freq = "weekly") => {
    const path = pathOrSlug.startsWith("/") ? pathOrSlug : `/${pathOrSlug}`;
    // SEO URL consolidation: never emit a URL that redirects or is noindex.
    const slug = path.replace(/^\//, "");
    if (isRedirectedSlug(slug)) return;
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
    /* The remaining generated route families are intentionally omitted until
       they have route-specific content and an approved inventory rule. */
    /*
    ["/personal-support-worker-near-me", "0.8", "weekly"],
    ["/personal-support-worker-near-me", "0.8", "weekly"],
    ["/senior-home-care-near-me", "0.8", "weekly"],
    ["/caregiver-near-me", "0.8", "weekly"],
    ["/elderly-care-near-me", "0.8", "weekly"],
    ["/personal-support-workers-ontario", "0.9", "weekly"],
    ["/home-care-ontario", "0.9", "weekly"],
    ["/ontario-home-care", "0.9", "weekly"],
    ["/ontario-psw-locations", "0.9", "weekly"],
    ["/ontario-home-care-services", "0.9", "weekly"],
    ["/home-care-ontario-map", "0.9", "weekly"],
    ["/private-psw-jobs", "0.7", "weekly"],
    ["/overnight-psw-jobs", "0.7", "weekly"],
    ["/24-hour-psw-jobs", "0.7", "weekly"],
    ["/psw-part-time-jobs", "0.7", "weekly"],
    ["/psw-pay-calculator", "0.7", "monthly"],
    ["/psw-agency-vs-private-pay", "0.7", "monthly"],
    ["/psw-work-areas-ontario", "0.8", "weekly"],
    ["/coverage", "0.9", "weekly"],
    ["/about", "0.7", "monthly"],
    ["/psw-cost", "0.7", "monthly"],
    ["/senior-care-near-me", "0.8", "weekly"],
    ["/private-caregiver", "0.8", "weekly"],
    ["/in-home-care-ontario", "0.8", "weekly"],
    ["/in-home-care-services", "0.8", "weekly"],
    ["/senior-home-care", "0.8", "weekly"],
    ["/home-care-barrie", "0.9", "weekly"],
    ["/home-care-beaverton", "0.8", "weekly"],
    ["/same-day-home-care", "0.9", "weekly"],
    ["/home-care-services", "0.9", "weekly"],
    ["/elderly-care-at-home", "0.9", "weekly"],
    ["/overnight-home-care", "0.9", "weekly"],
    ["/24-hour-home-care", "0.9", "weekly"],
    ["/post-hospital-care", "0.9", "weekly"],
    ["/doctor-escort-service", "0.9", "weekly"],
    ["/hospital-discharge-care", "0.9", "weekly"],
    ["/private-home-care-near-me", "0.8", "weekly"],
    ["/languages", "0.8", "weekly"],
    ["/cities", "0.8", "weekly"],
    ["/private-home-care", "1.0", "weekly"],
    ["/private-home-care-ontario", "0.9", "weekly"],
    ["/guides", "0.7", "monthly"],
    ["/guides/how-to-hire-a-personal-support-worker", "0.7", "monthly"],
    ["/guides/cost-of-home-care-ontario", "0.7", "monthly"],
    ["/guides/hospital-discharge-checklist", "0.7", "monthly"],
    ["/guides/signs-your-parent-needs-home-care", "0.7", "monthly"],
    ["/guides/psw-vs-nurse-difference", "0.7", "monthly"],
    ["/home-care", "0.9", "weekly"],
    ["/personal-support-worker", "0.9", "weekly"],
    ["/caregiver-services", "0.9", "weekly"],
    ["/in-home-care", "0.9", "weekly"],
    ["/help-for-elderly-parents-at-home", "0.8", "weekly"],
    ["/care-for-aging-parents", "0.8", "weekly"],
    ["/help-with-elderly-parent-daily-care", "0.8", "weekly"],
    ["/support-for-seniors-at-home", "0.8", "weekly"],
    ["/care-for-elderly-after-hospital", "0.8", "weekly"],
    ["/home-care-after-hospital-discharge", "0.8", "weekly"],
    ["/urgent-caregiver-services", "0.8", "weekly"],
    ["/psw-after-surgery", "0.8", "weekly"],
    ["/hospital-discharge-care-ontario", "0.8", "weekly"],
    ["/help-with-bathing-elderly", "0.7", "weekly"],
    ["/senior-transportation-services", "0.7", "weekly"],
    ["/doctor-appointment-assistance", "0.7", "weekly"],
    ["/companionship-for-seniors", "0.7", "weekly"],
    ["/home-care-cost-ontario", "0.8", "monthly"],
    ["/psw-hourly-rate", "0.8", "monthly"],
    ["/caregiver-cost-canada", "0.7", "monthly"],
    ["/is-home-care-covered-by-insurance", "0.7", "monthly"], */
  ] as const;

  staticSeoPaths.forEach(([path, priority, freq]) => add(path, priority, freq));

  // Only canonical /{lang}-speaking-psw-{city} routes with matching inventory. Legacy short
  // "/{lang}-psw-{city}" aliases and empty/noindex language-city pages are excluded.
  languageCityRoutes
    .filter((r) => !r.isAlias && snapshot.eligibleLanguageCitySlugs.has(r.slug))
    .forEach((r) => add(r.slug, "0.5"));
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

main();
