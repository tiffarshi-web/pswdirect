import { describe, it, expect, vi } from "vitest";
import { scopeToProvince, recordInProvince, provinceLaunchLabel } from "@/lib/provinceScope";

const builder = () => {
  const b: { or: ReturnType<typeof vi.fn>; eq: ReturnType<typeof vi.fn> } = { or: vi.fn(), eq: vi.fn() };
  b.or.mockReturnValue(b); b.eq.mockReturnValue(b);
  return b;
};

describe("province scope", () => {
  it("Ontario does not silently include rows without a province", () => {
    const b = builder();
    scopeToProvince(b, "service_province", "ON");
    expect(b.eq).toHaveBeenCalledWith("service_province", "ON");
    expect(b.or).not.toHaveBeenCalled();
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
  it("missing province matches no specific province", () => {
    expect(recordInProvince(null, "ON")).toBe(false);
    expect(recordInProvince(null, "AB")).toBe(false);
    expect(recordInProvince("ab", "AB")).toBe(true);
    expect(recordInProvince(null, null)).toBe(true);
  });
  it("booking-linked records follow their booking's province", async () => {
    const { bookingInProvince } = await import("@/lib/provinceBookingScope");
    const keys = { ids: new Set(["b1"]), codes: new Set(["CDT-000001"]) };
    expect(bookingInProvince(keys, "b1", null)).toBe(true);
    expect(bookingInProvince(keys, null, "CDT-000001")).toBe(true);
    expect(bookingInProvince(keys, "b2", "CDT-000002")).toBe(false);
    expect(bookingInProvince(keys, null, null)).toBe(false);
    expect(bookingInProvince(null, null, null)).toBe(true);
  });
  it("launch labels", () => {
    expect(provinceLaunchLabel({ isActive: true, launchStatus: "live", bookingsEnabled: true })).toBe("Live");
    expect(provinceLaunchLabel({ isActive: true, launchStatus: "preparation", bookingsEnabled: false })).toBe("Preparation");
  });
});
