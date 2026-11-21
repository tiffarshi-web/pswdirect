// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSeoPublicConfig, resolveSeoPublicConfig } from "../seoGenerationConfig";
import { fetchInventorySnapshot, main, type InventorySnapshot } from "../generate-sitemap";
import { SEO_CITIES } from "@/lib/seoCityData";

const config = { backendUrl: "https://example.test", publishableKey: "public-test-key" };
const province = { code: "ON", is_active: true, launch_status: "live", bookings_enabled: true, payments_enabled: true, recruitment_enabled: true };
const snapshot: InventorySnapshot = { provinces: [province], offeredServiceIds: ["standard"], radiusKm: 75,
  complete: true, failedCities: [], activeCityKeys: new Set(), eligibleLanguageCitySlugs: new Set() };
const city = SEO_CITIES.filter(c => c.key === "barrie");
const files = ["src/generated/seoEligibilityManifest.json", "public/sitemap.xml", "public/sitemap-main.xml"];
const tempDirs: string[] = [];
afterEach(() => { tempDirs.forEach(dir => rmSync(dir, { recursive: true, force: true })); tempDirs.length = 0; vi.unstubAllEnvs(); });

function publicFetch(overrides: { provinces?: unknown; services?: unknown; radius?: unknown; inventory?: unknown; fail?: string } = {}) {
  return vi.fn<typeof fetch>(async input => {
    const url = String(input);
    if (overrides.fail && url.includes(overrides.fail)) return new Response("not available", { status: 503 });
    const data = url.includes("/provinces?") ? overrides.provinces ?? [province]
      : url.includes("/provincial_pricing?") ? overrides.services ?? [{ service_id: "standard" }]
      : url.includes("active_service_radius_km") ? overrides.radius ?? 75 : overrides.inventory ?? [{ languages: ["en"] }];
    return Response.json(data);
  });
}

describe("SEO generation configuration and artifact safety", () => {
  it("uses the same Vite public settings as the app, ahead of legacy settings", () => {
    expect(resolveSeoPublicConfig({ VITE_SUPABASE_URL: config.backendUrl, VITE_SUPABASE_PUBLISHABLE_KEY: config.publishableKey,
      SUPABASE_URL: "https://legacy.test", SUPABASE_PUBLISHABLE_KEY: "legacy-test-key" })).toEqual(config);
  });
  it("loads legacy public settings from dotenv files with Vite parsing and mode overrides", async () => {
    const dir = mkdtempSync(join(tmpdir(), "seo-env-test-")); tempDirs.push(dir);
    // Prevent real runtime public settings from masking the fixture.
    for (const key of ["VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"]) vi.stubEnv(key, undefined);
    writeFileSync(join(dir, ".env"), '  SUPABASE_URL = "https://example.test"\nSUPABASE_PUBLISHABLE_KEY="base-test-key"\n');
    writeFileSync(join(dir, ".env.production"), 'SUPABASE_PUBLISHABLE_KEY="public-test-key"\n');
    expect(await loadSeoPublicConfig(dir, {})).toEqual(config);
  });
  it("rejects missing configuration rather than generating an empty-evidence snapshot", () => {
    expect(() => resolveSeoPublicConfig({})).toThrow("public backend configuration is missing");
  });
  it("does not disclose malformed configuration values", () => {
    expect(() => resolveSeoPublicConfig({ VITE_SUPABASE_URL: "sensitive-invalid-value", VITE_SUPABASE_PUBLISHABLE_KEY: config.publishableKey }))
      .toThrow("public backend URL is invalid; existing artifacts preserved");
  });
  it("collects live launch/service/radius and matching inventory evidence", async () => {
    const result = await fetchInventorySnapshot(config, publicFetch(), city);
    expect(result.complete).toBe(true); expect(result.failedCities).toEqual([]);
    expect(result.provinces).toEqual([province]); expect(result.offeredServiceIds).toEqual(["standard"]);
    expect(result.activeCityKeys.has("barrie")).toBe(true);
    expect(result.eligibleLanguageCitySlugs.has("english-speaking-psw-barrie")).toBe(true);
  });
  it.each(["provinces?", "provincial_pricing?", "active_service_radius_km", "get_nearby_psws_public"])
    ("aborts and leaves all saved artifacts unchanged if %s fails", async fail => {
      const before = files.map(file => readFileSync(file));
      await expect(main(() => fetchInventorySnapshot(config, publicFetch({ fail }), city))).rejects.toThrow("existing artifacts preserved");
      files.forEach((file, i) => expect(readFileSync(file).equals(before[i])).toBe(true));
    });
  it.each([{ provinces: [] }, { services: [{}] }, { radius: 0 }, { inventory: {} }, { inventory: [{ languages: [123] }] }])
    ("rejects malformed evidence %j", async overrides => {
      await expect(fetchInventorySnapshot(config, publicFetch(overrides), city)).rejects.toThrow("existing artifacts preserved");
    });
  it("rejects incomplete snapshots before writing", async () => {
    const before = files.map(file => readFileSync(file));
    await expect(main(async () => ({ ...snapshot, complete: false, failedCities: ["barrie"] }))).rejects.toThrow("incomplete eligibility evidence");
    files.forEach((file, i) => expect(readFileSync(file).equals(before[i])).toBe(true));
  });
  it("treats legitimate empty inventory and inactive services/province as complete exclusion evidence", async () => {
    const result = await fetchInventorySnapshot(config, publicFetch({ provinces: [{ ...province, bookings_enabled: false }], services: [], inventory: [] }), city);
    expect(result.complete).toBe(true); expect(result.offeredServiceIds).toEqual([]);
    expect(result.activeCityKeys.size).toBe(0); expect(result.eligibleLanguageCitySlugs.size).toBe(0);
  });
});