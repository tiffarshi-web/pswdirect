import { describe, it, expect } from "vitest";
import {
  normalizeServiceCodeStrict,
  resolveServiceCodeStrict,
  computeOrderTotals,
  UnsupportedServiceTypeError,
} from "../taxRules";

const expectRejected = (value: unknown) => {
  try {
    resolveServiceCodeStrict(value);
  } catch (e) {
    expect(e).toBeInstanceOf(UnsupportedServiceTypeError);
    expect((e as UnsupportedServiceTypeError).code).toBe("unsupported_service_type");
    return;
  }
  throw new Error(`Expected rejection for ${JSON.stringify(value)}`);
};

describe("strict service-type resolution", () => {
  it("rejects blank, null, undefined and empty lists", () => {
    [null, undefined, "", "   ", [], [""], [null]].forEach(expectRejected);
  });

  it("rejects unknown identifiers instead of defaulting to Home Care", () => {
    ["banana", "concierge_service", "unknown-service", "physiotherapy"].forEach(expectRejected);
  });

  it("accepts Home Care task labels as non-taxable", () => {
    [
      "Home Care", "standard", "Bathing & Personal Hygiene", "Companionship",
      "Light Housekeeping", "Meal Preparation", "Medication Reminders",
      "Mobility Assistance", "Wound Care/Post Surgical", "Overnight Care",
    ].forEach((label) => {
      expect(normalizeServiceCodeStrict(label)).toBe("home_care");
    });
  });

  it("accepts taxable transport aliases", () => {
    expect(normalizeServiceCodeStrict("Doctor Appointment Escort")).toBe("doctor_escort");
    expect(normalizeServiceCodeStrict("Hospital Pick-up/Drop-off (Discharge)")).toBe("hospital_discharge");
  });

  it("resolves the most taxable code across a mixed list", () => {
    expect(resolveServiceCodeStrict(["Companionship", "Doctor Escort"])).toBe("doctor_escort");
    expect(resolveServiceCodeStrict(["Doctor Escort", "Hospital Discharge"])).toBe("hospital_discharge");
  });

  it("rejects a list containing one unknown value", () => {
    expectRejected(["Companionship", "teleportation"]);
  });
});

describe("grouped Home Care invoice math", () => {
  it("sums three 3-hour visits at $35/hr with zero HST and no parking", () => {
    const visits = [3, 3, 3].map((hours) => computeOrderTotals({ subtotal: hours * 35, service: "home_care" }));
    const subtotal = visits.reduce((s, v) => s + v.subtotal, 0);
    const hst = visits.reduce((s, v) => s + v.hst, 0);
    const total = visits.reduce((s, v) => s + v.total, 0);
    expect(subtotal).toBe(315);
    expect(hst).toBe(0);
    expect(total).toBe(315);
    expect(visits.every((v) => v.parking === 0)).toBe(true);
  });

  it("ignores parking on Home Care groups", () => {
    const v = computeOrderTotals({ subtotal: 105, parking: 25, service: "home_care" });
    expect(v.parking).toBe(0);
    expect(v.total).toBe(105);
  });
});
