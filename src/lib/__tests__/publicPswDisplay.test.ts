import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc: (...a: unknown[]) => rpc(...a) } }));

import { mapPublicPswRows, getPublicPSWsByCity, getCoverageInventory } from "@/lib/nearbyPSWs";

beforeEach(() => rpc.mockReset());

describe("public caregiver cards", () => {
  it("read only the consent-filtered source", async () => {
    rpc.mockResolvedValue({ data: [], error: null });
    await getPublicPSWsByCity("Barrie");
    expect(rpc).toHaveBeenCalledWith("get_public_psws_by_city", { p_city: "Barrie" });
  });

  it("show first name only and never distance, gender or experience", () => {
    const [c] = mapPublicPswRows([{ first_name: "ana Maria Lopez", last_initial: "M", service_city: "Barrie", languages: ["en"], profile_photo_url: null, public_summary: null }]);
    expect(c.first_name).toBe("Ana");
    expect(c.last_name).toBe("");
    expect(c.languages).toEqual(["English"]);
    expect(c.distanceKm).toBe(0);
    expect(c.gender).toBeNull();
    expect(c.years_experience).toBeNull();
  });

  it("drop anonymous rows so no nameless cards render", () => {
    expect(mapPublicPswRows([{ first_name: null, last_initial: null, service_city: "Barrie", languages: [], profile_photo_url: null, public_summary: null }])).toEqual([]);
  });

  it("return no cards when the lookup fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect(await getPublicPSWsByCity("Barrie")).toEqual([]);
  });
});

describe("coverage lookup", () => {
  it("uses the aggregate-only function", async () => {
    rpc.mockResolvedValue({ data: [{ has_coverage: true, languages: ["en"] }], error: null });
    const r = await getCoverageInventory(44.4, -79.7, 75);
    expect(rpc).toHaveBeenCalledWith("get_city_coverage_public", { p_lat: 44.4, p_lng: -79.7, p_radius_km: 75 });
    expect(r).toEqual({ hasCoverage: true, languages: ["en"] });
  });
  it("returns null on failure so booking falls back instead of claiming no coverage", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "x" } });
    expect(await getCoverageInventory(1, 2, 3)).toBeNull();
  });
});
