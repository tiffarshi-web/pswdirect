import { describe, it, expect } from "vitest";
import manifest from "@/generated/seoEligibilityManifest.json";

const m = manifest as unknown as { activeCityKeys: string[]; sitemapPaths: string[] };
const paths: string[] = m.sitemapPaths;

describe("home-care city near-me sitemap", () => {
  it("includes covered major cities", () => {
    for (const c of ["toronto", "mississauga", "brampton", "hamilton", "ottawa", "london", "barrie"])
      expect(paths.some(p => p.endsWith(`/home-care-${c}-near-me`))).toBe(true);
  });
  it("excludes cities without live coverage", () => {
    expect(m.activeCityKeys).not.toContain("kenora");
    expect(paths.some(p => p.endsWith("/home-care-kenora-near-me"))).toBe(false);
  });
  it("excludes caregiver/psw near-me variants", () => {
    expect(paths.some(p => /\/(caregiver|psw)-[a-z-]+-near-me$/.test(p))).toBe(false);
  });
});
