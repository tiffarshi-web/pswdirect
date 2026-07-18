import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, existsSync } from "fs";
import { resolve } from "path";
import { languageCityRoutes } from "../languageCityRoutes";

describe("Language+City SEO canonicalization", () => {
  it("canonical route slug never contains '-speaking-psw-'", () => {
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

  it("no '-speaking-psw-' URLs appear in any generated sitemap chunk", () => {
    const dir = resolve("public");
    if (!existsSync(dir)) return; // sitemap not generated yet in this env
    const files = readdirSync(dir).filter((f) => /^sitemap-main.*\.xml$/.test(f));
    for (const f of files) {
      const xml = readFileSync(resolve(dir, f), "utf8");
      expect(xml.includes("-speaking-psw-")).toBe(false);
    }
  });

  it("hosting redirect rules 301 the legacy alias to the canonical path", () => {
    const htaccess = readFileSync(resolve("public/.htaccess"), "utf8");
    expect(htaccess).toMatch(/-speaking-psw-.*R=301/);
    const redirects = readFileSync(resolve("public/_redirects"), "utf8");
    expect(redirects).toMatch(/speaking-psw.*301/);
  });

  it("source tree contains no internal links to '-speaking-psw-' URLs", () => {
    const walk = (d: string, acc: string[] = []): string[] => {
      for (const entry of readdirSync(d, { withFileTypes: true })) {
        if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
        const p = resolve(d, entry.name);
        if (entry.isDirectory()) walk(p, acc);
        else if (/\.(tsx?|jsx?)$/.test(entry.name) && !p.includes("__tests__")) acc.push(p);
      }
      return acc;
    };
    const files = walk(resolve("src"));
    const offenders: string[] = [];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      // Ignore the route generator itself (which intentionally emits alias slugs).
      if (f.endsWith("languageCityRoutes.ts")) continue;
      if (/["'`\/][a-z]+-speaking-psw-[a-z0-9-]+/.test(src)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });
});
