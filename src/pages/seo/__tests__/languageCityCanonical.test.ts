import { describe, it, expect } from "vitest";
import { languageCityRoutes } from "../languageCityRoutes";

// Load source and public files via Vite's raw glob — avoids the need for @types/node.
const sourceFiles = import.meta.glob("/src/**/*.{ts,tsx}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const publicFiles = import.meta.glob("/public/**/*.{xml,htaccess,txt}", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("Language+City SEO canonicalization", () => {
  it("canonical route slug is /{lang}-psw-{city} and never contains '-speaking-psw-'", () => {
    const canonicals = languageCityRoutes.filter((r) => !r.isAlias);
    expect(canonicals.length).toBeGreaterThan(0);
    for (const r of canonicals) {
      expect(r.slug).not.toContain("-speaking-psw-");
      expect(r.slug).toBe(r.canonicalSlug);
    }
  });

  it("every alias points at a real canonical route", () => {
    const canonicalSet = new Set(
      languageCityRoutes.filter((r) => !r.isAlias).map((r) => r.slug),
    );
    const aliases = languageCityRoutes.filter((r) => r.isAlias);
    expect(aliases.length).toBeGreaterThan(0);
    for (const a of aliases) {
      expect(a.slug).toContain("-speaking-psw-");
      expect(a.canonicalSlug).not.toContain("-speaking-psw-");
      expect(canonicalSet.has(a.canonicalSlug)).toBe(true);
    }
  });

  it("canonical slugs are unique", () => {
    const canonicals = languageCityRoutes.filter((r) => !r.isAlias).map((r) => r.slug);
    expect(new Set(canonicals).size).toBe(canonicals.length);
  });

  it("no '-speaking-psw-' URLs appear in any generated main-sitemap chunk", () => {
    const sitemapEntries = Object.entries(publicFiles).filter(([p]) =>
      /\/sitemap-main.*\.xml$/.test(p),
    );
    if (sitemapEntries.length === 0) return; // sitemaps not generated in this env
    for (const [path, xml] of sitemapEntries) {
      expect(xml.includes("-speaking-psw-"), `alias URL leaked into ${path}`).toBe(false);
    }
  });

  it("generated sitemap chunks omit known empty/noindex language-city pages", () => {
    const sitemapEntries = Object.entries(publicFiles).filter(([p]) =>
      /\/sitemap-main.*\.xml$/.test(p),
    );
    if (sitemapEntries.length === 0) return;
    for (const [path, xml] of sitemapEntries) {
      expect(xml.includes("/telugu-psw-clarington"), `empty URL leaked into ${path}`).toBe(false);
    }
  });

  it("active alias redirect is implemented at React route level before the SEO page renders", () => {
    const appSource = sourceFiles["/src/App.tsx"];
    expect(appSource).toContain("isAlias ? (");
    expect(appSource).toContain("<Navigate to={`/${canonicalSlug}`} replace />");
    expect(appSource).not.toContain("isAlias={isAlias}");
  });

  it("source tree contains no internal links to '-speaking-psw-' URLs", () => {
    const offenders: string[] = [];
    for (const [path, src] of Object.entries(sourceFiles)) {
      // Skip the route generator (which intentionally emits alias slugs) and this test.
      if (path.endsWith("languageCityRoutes.ts")) continue;
      if (path.includes("__tests__")) continue;
      if (/["'`\/][a-z]+-speaking-psw-[a-z0-9-]+/.test(src)) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });
});
