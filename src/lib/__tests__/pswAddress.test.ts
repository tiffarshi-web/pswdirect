import { describe, it, expect } from "vitest";
import {
  normalizePostalCode,
  validateAddress,
  ENABLED_PROVINCES,
} from "@/lib/pswAddressStore";

const base = {
  streetAddress: "  123   Main St ",
  unit: " 4B ",
  city: " Barrie ",
  province: "on",
  postalCode: "l4m2r1",
};

describe("PSW self-service address", () => {
  it("normalizes lowercase / unspaced postal codes", () => {
    expect(normalizePostalCode("l4m2r1")).toBe("L4M 2R1");
    expect(normalizePostalCode(" m5v  1j9 ")).toBe("M5V 1J9");
  });

  it("rejects invalid postal codes", () => {
    expect(normalizePostalCode("12345")).toBe("");
    expect(normalizePostalCode("M5V 1J")).toBe("");
    expect(validateAddress({ ...base, postalCode: "ZZZ" }).valid).toBe(false);
  });

  it("trims and normalizes a complete address", () => {
    const r = validateAddress(base);
    expect(r.valid).toBe(true);
    expect(r.normalized).toEqual({
      streetAddress: "123 Main St",
      unit: "4B",
      city: "Barrie",
      province: "ON",
      postalCode: "L4M 2R1",
    });
  });

  it("rejects incomplete street address or city", () => {
    expect(validateAddress({ ...base, streetAddress: "Main" }).valid).toBe(false);
    expect(validateAddress({ ...base, city: "" }).valid).toBe(false);
  });

  it("restricts province selection to Ontario until expansion", () => {
    expect(ENABLED_PROVINCES.map((p) => p.code)).toEqual(["ON"]);
    expect(validateAddress({ ...base, province: "BC" }).valid).toBe(false);
  });

  it("treats the unit as optional", () => {
    const r = validateAddress({ ...base, unit: "" });
    expect(r.valid).toBe(true);
    expect(r.normalized?.unit).toBeUndefined();
  });
});
