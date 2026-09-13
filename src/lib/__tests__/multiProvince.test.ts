import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: async () => ({ data: null, error: new Error("offline") }),
    }),
  },
}));

import {
  DEFAULT_PROVINCES,
  provinceFromPostalCode,
  provinceFromAddress,
  resolveServiceProvince,
  isBookingEnabledForProvince,
  providerTerm,
  canProviderTakeOrder,
  clearProvinceCache,
} from "@/lib/provinceConfig";
import { evaluateServiceArea, isOutsideServiceArea } from "@/lib/serviceArea";

const future = new Date(Date.now() + 90 * 864e5).toISOString();
const past = new Date(Date.now() - 5 * 864e5).toISOString();

const onProvider = {
  province: "ON",
  providerType: "PSW",
  vettingStatus: "approved",
  eligibleForJobs: true,
};
const abProvider = {
  province: "AB",
  providerType: "HCA",
  vettingStatus: "approved",
  eligibleForJobs: true,
  registrationStatus: "verified",
  registrationExpiry: future,
};
const onOrder = { serviceProvince: "ON", requiredProviderType: "PSW" };
const abOrder = { serviceProvince: "AB", requiredProviderType: "HCA" };

beforeEach(() => clearProvinceCache());

describe("province resolution", () => {
  it("maps postal codes to provinces", () => {
    expect(provinceFromPostalCode("L4M 2R1")).toBe("ON");
    expect(provinceFromPostalCode("T2P 1J9")).toBe("AB");
    expect(provinceFromPostalCode("V6B 1A1")).toBe("BC");
    expect(provinceFromPostalCode("")).toBeNull();
  });

  it("reads provinces from address segments only", () => {
    expect(provinceFromAddress("100 Main St, Calgary, AB T2P 1J9")).toBe("AB");
    expect(provinceFromAddress("124 Quebec Ave, Toronto, ON M6P 2T4")).toBe("ON");
  });

  it("prefers an explicit province field", () => {
    expect(resolveServiceProvince({ province: "AB", postalCode: "L4M 2R1" })).toBe("AB");
    expect(resolveServiceProvince({ postalCode: "L4M 2R1" })).toBe("ON");
    expect(resolveServiceProvince({})).toBeNull();
  });
});

describe("bookability by province", () => {
  it("keeps Ontario bookable", async () => {
    expect(await isBookingEnabledForProvince("ON")).toBe(true);
    const status = await evaluateServiceArea({ postalCode: "L4M 2R1" });
    expect(status.bookable).toBe(true);
    expect(status.province).toBe("ON");
  });

  it("keeps Alberta client bookings disabled by default (Coming Soon)", async () => {
    expect(DEFAULT_PROVINCES.AB.bookingsEnabled).toBe(false);
    expect(await isBookingEnabledForProvince("AB")).toBe(false);
    const status = await evaluateServiceArea({ postalCode: "T2P 1J9" });
    expect(status.bookable).toBe(false);
    expect(status.comingSoon).toBe(true);
    expect(status.message).toMatch(/coming soon to Alberta/i);
  });

  it("does not let unsupported provinces proceed to payment", async () => {
    const status = await evaluateServiceArea({ addresses: ["55 Water St, Vancouver, BC"] });
    expect(status.bookable).toBe(false);
    expect(isOutsideServiceArea({ postalCode: "V6B 1A1" })).toBe(true);
  });
});

describe("provider terminology", () => {
  it("uses PSW in Ontario and HCA in Alberta", () => {
    expect(providerTerm(DEFAULT_PROVINCES.ON, "long")).toBe("Personal Support Worker");
    expect(providerTerm(DEFAULT_PROVINCES.ON)).toBe("PSW");
    expect(providerTerm(DEFAULT_PROVINCES.AB, "long")).toBe("Health Care Aide");
    expect(providerTerm(DEFAULT_PROVINCES.AB)).toBe("HCA");
  });
});

describe("province-aware job matching", () => {
  it("lets an approved Ontario PSW take an Ontario order", () => {
    expect(canProviderTakeOrder(onProvider, onOrder)).toBe(true);
  });

  it("never shows Alberta jobs to Ontario providers", () => {
    expect(canProviderTakeOrder(onProvider, abOrder)).toBe(false);
    expect(canProviderTakeOrder(abProvider, onOrder)).toBe(false);
  });

  it("blocks unverified Alberta HCAs", () => {
    expect(
      canProviderTakeOrder({ ...abProvider, registrationStatus: "pending" }, abOrder),
    ).toBe(false);
  });

  it("blocks expired or restricted Alberta registrations", () => {
    expect(canProviderTakeOrder({ ...abProvider, registrationExpiry: past }, abOrder)).toBe(false);
    expect(
      canProviderTakeOrder({ ...abProvider, registrationStatus: "restricted" }, abOrder),
    ).toBe(false);
  });

  it("allows a verified Alberta HCA with a valid permit", () => {
    expect(canProviderTakeOrder(abProvider, abOrder)).toBe(true);
  });

  it("blocks suspended, unapproved or ineligible providers", () => {
    expect(canProviderTakeOrder({ ...onProvider, suspended: true }, onOrder)).toBe(false);
    expect(canProviderTakeOrder({ ...onProvider, vettingStatus: "pending" }, onOrder)).toBe(false);
    expect(canProviderTakeOrder({ ...onProvider, eligibleForJobs: false }, onOrder)).toBe(false);
  });

  it("defaults legacy records without a province to Ontario", () => {
    expect(
      canProviderTakeOrder(
        { vettingStatus: "approved", eligibleForJobs: true },
        { serviceProvince: null, requiredProviderType: null },
      ),
    ).toBe(true);
  });
});
