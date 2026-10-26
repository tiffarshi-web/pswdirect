import { describe, expect, it } from "vitest";
import { buildMainSitemapUrls, type InventorySnapshot } from "../../../../scripts/generate-sitemap";
import { seoStartingRate } from "@/lib/seoDisplayPricing";

const snapshot: InventorySnapshot = {
  provinces: [{ code: "ON", is_active: true, launch_status: "live", bookings_enabled: true, payments_enabled: true, recruitment_enabled: false }],
  offeredServiceIds: ["standard"], radiusKm: 75, complete: true, failedCities: [],
  activeCityKeys: new Set(["barrie", "toronto", "beaverton"]), eligibleLanguageCitySlugs: new Set(),
};

describe("customer home-care acquisition boundaries", () => {
  it("keeps the main Ontario entry while excluding unverified city coverage and duplicate entries", async () => {
    const { paths } = await buildMainSitemapUrls(snapshot);
    expect(paths).toContain("/home-care-ontario");
    for (const path of ["/home-care-barrie", "/home-care-toronto", "/home-care-beaverton", "/home-care", "/ontario-home-care"]) {
      expect(paths).not.toContain(path);
    }
  });
  it("does not infer Alberta availability from pricing or nearby inventory", async () => {
    const { paths } = await buildMainSitemapUrls({ ...snapshot, provinces: [{ code: "AB", is_active: true, launch_status: "preparation", bookings_enabled: false, payments_enabled: false, recruitment_enabled: false }], activeCityKeys: new Set(["calgary"]) });
    expect(paths).not.toContain("/home-care-calgary");
    expect(paths).not.toContain("/home-care-ontario");
  });
  it("does not let customer landing improvements admit private booking, account or profile pages", async () => {
    const { paths } = await buildMainSitemapUrls(snapshot);
    for (const path of ["/client", "/client-login", "/admin", "/psw", "/pay/test", "/order-confirmed", "/psw/profile/test"]) expect(paths).not.toContain(path);
  });
  it("preserves approved home-care display pricing at $40 per hour", () => {
    expect(seoStartingRate("home-care")).toBe(40);
  });
});