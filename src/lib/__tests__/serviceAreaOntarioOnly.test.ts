import { describe, it, expect } from "vitest";
import {
  ACTIVE_PROVINCE_CODE,
  SERVICE_AREA_NOTICE,
  isNonOntarioPostal,
  hasNonOntarioProvinceToken,
  isOutsideServiceArea,
} from "@/lib/serviceArea";

describe("Ontario-only service area", () => {
  it("exposes the approved notice wording", () => {
    expect(ACTIVE_PROVINCE_CODE).toBe("ON");
    expect(SERVICE_AREA_NOTICE).toBe(
      "PSW Direct currently provides bookable services in Ontario."
    );
  });

  it("accepts Ontario postal codes", () => {
    for (const pc of ["K8V 4N2", "L4M 2R1", "M5V 2T6", "N2L 3G1", "P7B 1A1"]) {
      expect(isNonOntarioPostal(pc)).toBe(false);
    }
  });

  it("rejects non-Ontario postal codes", () => {
    for (const pc of ["H2X 1Y4", "V6B 1A1", "T2P 1J9", "R3C 0V8", "S7K 0J5", "B3H 4R2"]) {
      expect(isNonOntarioPostal(pc)).toBe(true);
    }
  });

  it("ignores missing postal codes", () => {
    expect(isNonOntarioPostal(null)).toBe(false);
    expect(isNonOntarioPostal("")).toBe(false);
  });

  it("detects explicit non-Ontario province segments", () => {
    expect(hasNonOntarioProvinceToken("1 Rue Sainte-Catherine, Montreal, QC H2X 1Y4")).toBe(true);
    expect(hasNonOntarioProvinceToken("100 Main St, Calgary, Alberta")).toBe(true);
    expect(hasNonOntarioProvinceToken("55 Water St, Vancouver, British Columbia V6B 1A1")).toBe(true);
  });

  it("does not misread Ontario street names as provinces", () => {
    expect(hasNonOntarioProvinceToken("124 Quebec Ave, Toronto, ON M6P 2T4")).toBe(false);
    expect(hasNonOntarioProvinceToken("12 Alberta St, Barrie, ON L4M 2R1")).toBe(false);
    expect(hasNonOntarioProvinceToken("38 Front St, Unit 1, Trenton, ON K8V 4N2")).toBe(false);
  });

  it("combines postal and address checks", () => {
    expect(
      isOutsideServiceArea({ postalCode: "K8V 4N2", addresses: ["38 Front St, Trenton, ON"] })
    ).toBe(false);
    expect(
      isOutsideServiceArea({ postalCode: "H2X 1Y4", addresses: ["1 Rue X, Montreal, QC"] })
    ).toBe(true);
  });
});
