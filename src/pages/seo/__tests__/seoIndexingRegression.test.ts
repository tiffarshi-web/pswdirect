/**
 * SEO indexing / canonical regression suite.
 *
 * Fails the build when any of the Aug 2026 Search Console consolidation rules
 * regress. Static analysis only (no rendering) so it stays fast on a 75k-URL
 * sitemap; rendered-metadata assertions live in seoRenderedMeta.test.tsx.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { SEO_REDIRECTS, resolveLegacySeoPath, isRedirectedSlug } from "../legacyRedirects";
import { isPrivatePath, normalizePath, SITE_ORIGIN } from "@/lib/seoIndexability";
import { seoRoutes, homeCareCityRoutes } from "../seoRoutes";
import { cityServiceRoutes } from "../cityServiceRoutes";
import { additionalCityServiceRoutes } from "../additionalCityServiceRoutes";
import { languageRoutes } from "../languageRoutes";
import { languageCityRoutes } from "../languageCityRoutes";
import { languageServiceCityRoutes } from "../languageServiceCityRoutes";
import { emergencyCareRoutes } from "../emergencyCareRoutes";
import { pswJobCityRoutes } from "../pswJobRoutes";
import { questionRoutes } from "../questionRoutes";
import { homeCareKeywordRoutes } from "../homeCareKeywordRoutes";
import { privateHomeCareCityRoutes } from "../privateHomeCareRoutes";
import { pswWorkerCityRoutes } from "../pswWorkerCityRoutes";
import { caregiverCityRoutes } from "../caregiverCityRoutes";
import { cityNearMeRoutes } from "../cityNearMeRoutes";
import { expandedCityServiceRoutes } from "../expandedCityServiceRoutes";
import { FAMILY_INTENT_SLUGS } from "../familyIntentRoutes";
import { homeCareLanguageRoutes } from "../homeCareLanguageRoutes";
import { longTailPageSlugs } from "../LongTailPages";
import { conditionPageSlugs } from "../ConditionPages";
import { insurancePageSlugs } from "../InsurancePages";

const PUBLIC_DIR = resolve("public");

const sitemapChunkFiles = (): string[] =>
  existsSync(PUBLIC_DIR)
    ? readdirSync(PUBLIC_DIR).filter((f) => /^sitemap-main(-\d+)?\.xml$/.test(f))
    : [];

const sitemapLocs = (): string[] => {
  const locs: string[] = [];
  for (const file of sitemapChunkFiles()) {
    const xml = readFileSync(resolve(PUBLIC_DIR, file), "utf8");
    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) locs.push(match[1]);
  }
  return locs;
};

/** Every slug that App.tsx actually mounts as a real (non-alias) page. */
const registrySlugs = (): Set<string> => {
  const all = new Set<string>();
  const push = (rows: Array<{ slug: string } | string>) =>
    rows.forEach((r) => all.add(typeof r === "string" ? r : r.slug));

  push(seoRoutes);
  push(homeCareCityRoutes);
  push(cityServiceRoutes.filter((r) => !isRedirectedSlug(r.slug)));
  push(additionalCityServiceRoutes.filter((r) => !isRedirectedSlug(r.slug)));
  push(languageRoutes);
  push(languageCityRoutes.filter((r) => !r.isAlias));
  push(languageServiceCityRoutes.filter((r) => r.service !== "caregiver" && !isRedirectedSlug(r.slug)));
  push(emergencyCareRoutes);
  push(pswJobCityRoutes);
  push(questionRoutes);
  push(homeCareKeywordRoutes);
  push(privateHomeCareCityRoutes);
  push(pswWorkerCityRoutes);
  push(caregiverCityRoutes);
  push(cityNearMeRoutes);
  push(expandedCityServiceRoutes.filter((r) => !isRedirectedSlug(r.slug)));
  push([...FAMILY_INTENT_SLUGS]);
  push(homeCareLanguageRoutes);
  push(longTailPageSlugs);
  push(conditionPageSlugs);
  push(insurancePageSlugs);
  return all;
};

describe("sitemap eligibility", () => {
  const locs = sitemapLocs();

  it("generates at least one sitemap chunk with URLs", () => {
    expect(sitemapChunkFiles().length).toBeGreaterThan(0);
    expect(locs.length).toBeGreaterThan(0);
  });

  it("contains no duplicate URLs across the whole sitemap set", () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const loc of locs) {
      if (seen.has(loc)) dupes.push(loc);
      seen.add(loc);
    }
    expect(dupes.slice(0, 10)).toEqual([]);
  });

  it("contains no private, account, auth, checkout or PSW-profile URL", () => {
    const offenders = locs.filter((loc) => isPrivatePath(loc));
    expect(offenders.slice(0, 10)).toEqual([]);
  });

  it("contains no URL that redirects (alias, legacy or consolidated slug)", () => {
    const offenders = locs.filter((loc) => {
      const path = normalizePath(loc);
      return Boolean(resolveLegacySeoPath(path)) || isRedirectedSlug(path.slice(1));
    });
    expect(offenders.slice(0, 10)).toEqual([]);
  });

  it("uses only absolute https://pswdirect.ca URLs with no query or trailing-slash variants", () => {
    const offenders = locs.filter(
      (loc) => !loc.startsWith(`${SITE_ORIGIN}/`) || loc.includes("?") || /.+\/$/.test(loc),
    );
    expect(offenders.slice(0, 10)).toEqual([]);
  });

  it("emits no build-date <lastmod> on individual URLs", () => {
    const withLastmod = sitemapChunkFiles().filter((file) =>
      readFileSync(resolve(PUBLIC_DIR, file), "utf8").includes("<lastmod>"),
    );
    expect(withLastmod).toEqual([]);
  });

  it("keeps every chunk under Google's 50,000-URL limit", () => {
    for (const file of sitemapChunkFiles()) {
      const xml = readFileSync(resolve(PUBLIC_DIR, file), "utf8");
      expect([...xml.matchAll(/<loc>/g)].length).toBeLessThanOrEqual(50000);
      expect(Buffer.byteLength(xml)).toBeLessThan(50 * 1024 * 1024);
    }
  });

  it("only advertises URLs that a route registry or App.tsx actually mounts", () => {
    const known = registrySlugs();
    const appSource = readFileSync(resolve("src/App.tsx"), "utf8");
    for (const match of appSource.matchAll(/path="\/([^"*:]+)"/g)) known.add(match[1]);

    const unknown = locs
      .map((loc) => normalizePath(loc))
      .filter((path) => path !== "/" && !known.has(path.slice(1)));
    expect(unknown.slice(0, 10)).toEqual([]);
  });
});

describe("redirect map integrity", () => {
  it("has no redirect chains or loops", () => {
    const chains: string[] = [];
    for (const [from, to] of SEO_REDIRECTS) {
      if (from === to) chains.push(`loop: ${from}`);
      if (SEO_REDIRECTS.has(to)) chains.push(`chain: ${from} -> ${to} -> ${SEO_REDIRECTS.get(to)}`);
    }
    expect(chains.slice(0, 10)).toEqual([]);
  });

  it("never redirects to a destination that is not a real mounted page", () => {
    const known = registrySlugs();
    const broken = [...SEO_REDIRECTS.entries()]
      .filter(([, to]) => !known.has(to))
      .map(([from, to]) => `${from} -> ${to}`);
    expect(broken.slice(0, 10)).toEqual([]);
  });

  it("resolves every alias family to the canonical language-city format in one hop", () => {
    const samples = [
      ["/spanish-psw-brampton", "/spanish-speaking-psw-brampton"],
      ["/marathi-psw-cliffside", "/marathi-speaking-psw-cliffside"],
      ["/french-psw-aurora", "/french-speaking-psw-aurora"],
      ["/tamil-caregiver-london", "/tamil-speaking-psw-london"],
      ["/russian-caregiver-courtice", "/russian-speaking-psw-courtice"],
      ["/marathi-caregiver-hamilton", "/marathi-speaking-psw-hamilton"],
      ["/psw-barrie-overnight-care", "/overnight-care-barrie"],
      ["/overnight-psw-north-york", "/overnight-care-north-york"],
      ["/psw-north-york-overnight-care", "/overnight-care-north-york"],
      ["/psw-sault-ste-marie-personal-care", "/personal-care-assistance-sault-ste-marie"],
      ["/psw-sarnia-personal-care", "/personal-care-assistance-sarnia"],
    ] as const;

    for (const [alias, canonical] of samples) {
      expect(resolveLegacySeoPath(alias)).toBe(canonical);
      // one hop only: the destination must not itself redirect
      expect(resolveLegacySeoPath(canonical)).toBeNull();
    }
  });

  it("keeps exactly one canonical URL per language-city intent", () => {
    const canonicalByIntent = new Map<string, string>();
    const conflicts: string[] = [];
    for (const route of languageCityRoutes) {
      if (route.isAlias) {
        expect(route.canonicalSlug).not.toBe(route.slug);
        continue;
      }
      const intent = `${route.languageCode}|${route.citySlug}`;
      const existing = canonicalByIntent.get(intent);
      if (existing && existing !== route.slug) conflicts.push(`${intent}: ${existing} vs ${route.slug}`);
      canonicalByIntent.set(intent, route.slug);
      expect(route.slug).toMatch(/-speaking-psw-/);
    }
    expect(conflicts.slice(0, 10)).toEqual([]);
  });

  it("never mounts a caregiver language-city page that duplicates the canonical", () => {
    const mounted = registrySlugs();
    const dupes = languageServiceCityRoutes
      .filter((r) => r.service === "caregiver")
      .map((r) => r.slug)
      .filter((slug) => mounted.has(slug));
    expect(dupes.slice(0, 10)).toEqual([]);
  });
});

describe("private route indexability", () => {
  const privateRoutes = [
    "/client",
    "/client-login",
    "/order-confirmed",
    "/track",
    "/pay/abc123",
    "/psw",
    "/psw-login",
    "/psw-pending",
    "/psw-diagnostics",
    "/psw/jobs/CDT-000401",
    "/psw/profile/temitope-o-oshawa",
    "/admin",
    "/admin-setup",
    "/office-login",
    "/verify/psw/123",
    "/install",
    "/join-team",
  ];

  it.each(privateRoutes)("treats %s as private", (path) => {
    expect(isPrivatePath(path)).toBe(true);
  });

  const publicRoutes = [
    "/",
    "/psw-directory",
    "/psw-near-me",
    "/psw-toronto",
    "/psw-cost",
    "/psw-hourly-rate",
    "/home-care-barrie",
    "/spanish-speaking-psw-brampton",
    "/overnight-care-north-york",
    "/personal-care-assistance-sarnia",
    "/guides/psw-vs-nurse-difference",
  ];

  it.each(publicRoutes)("keeps %s public", (path) => {
    expect(isPrivatePath(path)).toBe(false);
  });

  it("normalizes query, trailing-slash and case variants to one path", () => {
    expect(normalizePath("https://pswdirect.ca/Client/?utm_source=x")).toBe("/client");
    expect(normalizePath("/spanish-speaking-psw-brampton/")).toBe("/spanish-speaking-psw-brampton");
  });
});

describe("internal links", () => {
  const linkFiles = [
    "src/lib/localContentEngine.ts",
    "src/components/seo/RelatedServiceLinks.tsx",
    "src/components/seo/SEOInternalLinks.tsx",
    "src/components/seo/CityInternalLinks.tsx",
    "src/components/seo/ServingYourArea.tsx",
    "src/components/seo/PrivateHomeCareSection.tsx",
    "src/components/seo/Breadcrumbs.tsx",
  ].filter((f) => existsSync(resolve(f)));

  it("never links to an alias or redirected slug", () => {
    const offenders: string[] = [];
    for (const file of linkFiles) {
      const src = readFileSync(resolve(file), "utf8");
      for (const match of src.matchAll(/["'`](\/[a-z0-9][a-z0-9/-]*)["'`]/g)) {
        const path = match[1];
        if (path.includes("${")) continue;
        if (resolveLegacySeoPath(path) || isRedirectedSlug(path.slice(1))) {
          offenders.push(`${file}: ${path}`);
        }
      }
    }
    expect(offenders.slice(0, 10)).toEqual([]);
  });

  it("never links to a private route from SEO link modules", () => {
    const offenders: string[] = [];
    for (const file of linkFiles) {
      const src = readFileSync(resolve(file), "utf8");
      for (const match of src.matchAll(/["'`](\/[a-z0-9][a-z0-9/-]*)["'`]/g)) {
        if (match[1].includes("${")) continue;
        if (isPrivatePath(match[1])) offenders.push(`${file}: ${match[1]}`);
      }
    }
    expect(offenders.slice(0, 10)).toEqual([]);
  });
});
