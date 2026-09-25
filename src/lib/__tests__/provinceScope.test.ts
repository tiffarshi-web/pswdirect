import { describe, it, expect, vi } from "vitest";
import { scopeToProvince, recordInProvince, provinceLaunchLabel } from "@/lib/provinceScope";

const builder = () => {
  const b: { or: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> } = { or: vi.fn(), eq: vi.fn() };
  b.or.mockReturnValue(b); b.eq.mockReturnValue(b);
  return b;
};

describe("province scope", () => {
  it("Ontario includes legacy rows without a province", () => {
    const b = builder();
    scopeToProvince(b, "service_province", "ON");
    expect(b.or).toHaveBeenCalledWith("service_province.eq.ON,service_province.is.null");
  });
  it("Alberta shows only Alberta rows", () => {
    const b = builder();
    scopeToProvince(b, "province", "AB");
    expect(b.eq).toHaveBeenCalledWith("province", "AB");
    expect(b.or).not.toHaveBeenCalled();
  });
  it("no selection leaves the query untouched", () => {
    const b = builder();
    scopeToProvince(b, "province", null);
    expect(b.eq).not.toHaveBeenCalled();
    expect(b.or).not.toHaveBeenCalled();
  });
  it("record matching treats missing province as Ontario", () => {
    expect(recordInProvince(null, "ON")).toBe(true);
    expect(recordInProvince(null, "AB")).toBe(false);
    expect(recordInProvince("ab", "AB")).toBe(true);
  });
  it("launch labels", () => {
    expect(provinceLaunchLabel({ isActive: true, launchStatus: "live", bookingsEnabled: true })).toBe("Live");
    expect(provinceLaunchLabel({ isActive: true, launchStatus: "preparation", bookingsEnabled: false })).toBe("Preparation");
  });
});
