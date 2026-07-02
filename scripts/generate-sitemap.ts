// Prebuild script: writes static sitemap files to public/ so /sitemap.xml is
// reachable on the site origin.
//
// Important: the main SEO sitemap is generated from the same route registries
// used by src/App.tsx. Do not fetch the main sitemap from the deployed edge
// function here; that can lag behind the app bundle and cause Google to crawl
// routes that the current React app does not actually generate.
// Chunks the main sitemap into ≤25k-URL parts to stay under repo file size limits
// and well below the 50k-URL/50MB Google sitemap caps.
import { writeFileSync, mkdirSync, readdirSync, unlinkSync, readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { seoRoutes, homeCareCityRoutes } from "../src/pages/seo/seoRoutes";
import { cityServiceRoutes } from "../src/pages/seo/cityServiceRoutes";
import { additionalCityServiceRoutes } from "../src/pages/seo/additionalCityServiceRoutes";
import { languageRoutes } from "../src/pages/seo/languageRoutes";
import { languageCityRoutes } from "../src/pages/seo/languageCityRoutes";
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

const SUPABASE_FN = "https://pavibobervhqkfzwkotw.supabase.co/functions/v1/generate-sitemap";
const SITE = "https://pswdirect.ca";
const CHUNK_SIZE = 25000;

type SitemapUrl = { loc: string; priority: string; freq: string };

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

function toUrlNode(p: SitemapUrl, lastmod: string): string {
  return `  <url>
    <loc>${p.loc}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${p.freq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`;
}

function buildMainSitemapUrls(today: string): string[] {
  const pages = new Map<string, SitemapUrl>();
  const add = (pathOrSlug: string, priority = "0.7", freq = "weekly") => {
    const path = pathOrSlug.startsWith("/") ? pathOrSlug : `/${pathOrSlug}`;
    const loc = `${SITE}${path}`;
    // Preserve the first occurrence so hand-curated static priorities win and
    // duplicate route registry entries do not create duplicate sitemap URLs.
    if (!pages.has(loc)) pages.set(loc, { loc, priority, freq });
  };

  const staticSeoPaths = [
    ["/", "1.0", "daily"],
    ["/faq", "0.8", "monthly"],
    ["/psw-directory", "0.9", "weekly"],
    ["/psw-near-me", "0.8", "weekly"],
    ["/home-care-near-me", "0.8", "weekly"],
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
    ["/meal-preparation-for-seniors", "0.7", "weekly"],
    ["/home-care-cost-ontario", "0.8", "monthly"],
    ["/psw-hourly-rate", "0.8", "monthly"],
    ["/caregiver-cost-canada", "0.7", "monthly"],
    ["/is-home-care-covered-by-insurance", "0.7", "monthly"],
  ] as const;

  staticSeoPaths.forEach(([path, priority, freq]) => add(path, priority, freq));

  seoRoutes.forEach((r) => add(r.slug, "0.8"));
  homeCareCityRoutes.forEach((r) => add(r.slug, ["home-care-toronto", "home-care-mississauga", "home-care-brampton", "home-care-vaughan", "home-care-markham", "home-care-oshawa", "home-care-hamilton", "home-care-barrie"].includes(r.slug) ? "0.9" : "0.8"));
  pswWorkerCityRoutes.forEach((r) => add(r.slug, "0.8"));
  cityServiceRoutes.forEach((r) => add(r.slug, "0.6"));
  additionalCityServiceRoutes.forEach((r) => add(r.slug, "0.6"));
  languageRoutes.forEach((r) => add(r.slug, "0.7"));
  homeCareLanguageRoutes.forEach((r) => add(r.slug, "0.7"));
  languageCityRoutes.forEach((r) => add(r.slug, "0.5"));
  languageServiceCityRoutes.forEach((r) => add(r.slug, r.service === "home-care" ? "0.7" : "0.5"));
  emergencyCareRoutes.forEach((r) => add(r.slug, "0.6"));
  pswJobCityRoutes.forEach((r) => add(r.slug, "0.7"));
  questionRoutes.forEach((r) => add(r.slug, "0.7", "monthly"));
  homeCareKeywordRoutes.forEach((r) => add(r.slug, "0.7"));
  privateHomeCareCityRoutes.forEach((r) => add(r.slug, "0.8"));
  caregiverCityRoutes.forEach((r) => add(r.slug, "0.7"));
  cityNearMeRoutes.forEach((r) => add(r.slug, "0.6"));
  expandedCityServiceRoutes.forEach((r) => add(r.slug, "0.7"));
  FAMILY_INTENT_SLUGS.forEach((slug) => add(slug, "0.7"));

  extractRecordKeys("src/pages/seo/LongTailPages.tsx").forEach((slug) => add(slug, "0.7"));
  extractRecordKeys("src/pages/seo/ConditionPages.tsx").forEach((slug) => add(slug, "0.8"));
  extractRecordKeys("src/pages/seo/InsurancePages.tsx").forEach((slug) => add(slug, "0.7", "monthly"));
  extractRecordKeys("src/pages/seo/TrustPages.tsx").forEach((slug) => add(slug, "0.7", "monthly"));

  return [...pages.values()].map((p) => toUrlNode(p, today));
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

  const today = new Date().toISOString().split("T")[0];
  const urls = buildMainSitemapUrls(today);
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

  try {
    const psws = await fetchText(`${SUPABASE_FN}?type=psws`);
    writeFileSync(resolve("public/sitemap-psws.xml"), psws);
  } catch (err) {
    const pswPath = resolve("public/sitemap-psws.xml");
    if (!existsSync(pswPath)) {
      writeFileSync(pswPath, wrapUrlset([]));
    }
    console.warn(`⚠️  PSW sitemap fetch failed (${(err as Error).message}). Keeping existing sitemap-psws.xml.`);
  }

  const sitemapEntries = [
    ...chunkFiles.map((f) => `  <sitemap>\n    <loc>${SITE}/${f}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`),
    `  <sitemap>\n    <loc>${SITE}/sitemap-psws.xml</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`,
  ].join("\n");
  const index = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapEntries}
</sitemapindex>`;
  writeFileSync(resolve("public/sitemap.xml"), index);

  console.log(`✅ sitemap.xml + ${chunkFiles.length} main chunk(s) + sitemap-psws.xml generated (${urls.length} main URLs)`);
}

main();
