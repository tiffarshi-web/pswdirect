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
  it("canonical route slug is /{lang}-speaking-psw-{city}", () => {
    const canonicals = languageCityRoutes.filter((r) => !r.isAlias);
    expect(canonicals.length).toBeGreaterThan(0);
    for (const r of canonicals) {
      expect(r.slug).toContain("-speaking-psw-");
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
      expect(a.slug).not.toContain("-speaking-psw-");
      expect(a.canonicalSlug).toContain("-speaking-psw-");
      expect(canonicalSet.has(a.canonicalSlug)).toBe(true);
    }
  });

  it("canonical slugs are unique", () => {
    const canonicals = languageCityRoutes.filter((r) => !r.isAlias).map((r) => r.slug);
    expect(new Set(canonicals).size).toBe(canonicals.length);
  });

  it("no short /{lang}-psw-{city} alias URLs appear in any generated main-sitemap chunk", () => {
    const sitemapEntries = Object.entries(publicFiles).filter(([p]) =>
      /\/sitemap-main.*\.xml$/.test(p),
    );
    if (sitemapEntries.length === 0) return; // sitemaps not generated in this env
    for (const [path, xml] of sitemapEntries) {
      expect(
        /<loc>[^<]*\/(english|french|punjabi|hindi|urdu|tamil|gujarati|mandarin|cantonese|tagalog|spanish|portuguese|italian|polish|ukrainian|russian|arabic|farsi|korean|vietnamese|bengali|telugu|marathi|somali|amharic|swahili|greek|turkish)-psw-[a-z0-9-]+<\/loc>/.test(xml),
        `alias URL leaked into ${path}`,
      ).toBe(false);
    }
  });

  it("generated sitemap chunks omit known empty/noindex language-city pages", () => {
    const sitemapEntries = Object.entries(publicFiles).filter(([p]) =>
      /\/sitemap-main.*\.xml$/.test(p),
    );
    if (sitemapEntries.length === 0) return;
    for (const [path, xml] of sitemapEntries) {
      expect(xml.includes("/telugu-speaking-psw-clarington"), `empty URL leaked into ${path}`).toBe(false);
    }
  });

  it("active alias redirect is implemented at React route level before the SEO page renders", () => {
    const appSource = sourceFiles["/src/App.tsx"];
    expect(appSource).toContain("isAlias ? (");
    expect(appSource).toContain("<LanguageAliasRedirect canonicalSlug={canonicalSlug} />");
    expect(appSource).not.toContain("isAlias={isAlias}");
  });

  it("alias handler declares the long canonical and noindex, never itself", () => {
    const src = sourceFiles["/src/pages/seo/LanguageAliasRedirect.tsx"];
    expect(src).toContain('content="noindex,follow"');
    expect(src).toContain("rel=\"canonical\" href={`${SITE_URL}/${canonicalSlug}`}");
    expect(src).toContain("<Navigate to={`/${canonicalSlug}`} replace />");
  });

  it("no /psw/profile/* URLs appear in any sitemap", () => {
    for (const [path, xml] of Object.entries(publicFiles)) {
      if (!/sitemap.*\.xml$/.test(path)) continue;
      expect(xml.includes("/psw/profile/"), `profile URL leaked into ${path}`).toBe(false);
    }
  });


  it("source tree contains no internal links to short /{lang}-psw-{city} alias URLs", () => {
    const offenders: string[] = [];
    for (const [path, src] of Object.entries(sourceFiles)) {
      // Skip the route generator (which intentionally emits alias slugs) and this test.
      if (path.endsWith("languageCityRoutes.ts")) continue;
      if (path.includes("__tests__")) continue;
      if (/["'`\/](english|french|punjabi|hindi|urdu|tamil|gujarati|mandarin|cantonese|tagalog|spanish|portuguese|italian|polish|ukrainian|russian|arabic|farsi|korean|vietnamese|bengali|telugu|marathi|somali|amharic|swahili|greek|turkish)-psw-[a-z0-9-]+/.test(src)) offenders.push(path);
    }
    expect(offenders).toEqual([]);
  });
});
