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
  taxBpsForProvince,
} from "@/lib/provinceConfig";
import { evaluateServiceArea, isOutsideServiceArea } from "@/lib/serviceArea";
import {
  WAITLIST_ALLOWED_FIELDS,
  buildWaitlistRow,
  containsHealthDetails,
  sanitizeWaitlistNote,
} from "@/lib/provinceWaitlist";

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

describe("Phase 8 — payment gate and provincial authorizations", () => {
  it("treats a province as bookable only when payments are enabled too", async () => {
    expect(DEFAULT_PROVINCES.ON.paymentsEnabled).toBe(true);
    expect(await isBookingEnabledForProvince("ON")).toBe(true);
    expect(DEFAULT_PROVINCES.AB.paymentsEnabled).toBe(false);
    expect(DEFAULT_PROVINCES.AB.bookingsEnabled).toBe(false);
    expect(DEFAULT_PROVINCES.AB.recruitmentEnabled).toBe(false);
    expect(await isBookingEnabledForProvince("AB")).toBe(false);
  });

  it("keeps Alberta in preparation with its own timezone and tax label", () => {
    expect(DEFAULT_PROVINCES.AB.launchStatus).toBe("preparation");
    expect(DEFAULT_PROVINCES.AB.timezone).toBe("America/Edmonton");
    expect(DEFAULT_PROVINCES.AB.taxConfig.label).toBe("GST");
    expect(DEFAULT_PROVINCES.ON.timezone).toBe("America/Toronto");
  });

  it("keeps Ontario tax rates unchanged", () => {
    expect(taxBpsForProvince(DEFAULT_PROVINCES.ON, "home_care")).toBe(0);
    expect(taxBpsForProvince(DEFAULT_PROVINCES.ON, "doctor_escort")).toBe(1300);
    expect(taxBpsForProvince(DEFAULT_PROVINCES.ON, "hospital_discharge")).toBe(1300);
    expect(taxBpsForProvince(DEFAULT_PROVINCES.AB, "doctor_escort")).toBe(500);
  });

  it("uses provincial authorizations as the matching authority", () => {
    const dual = {
      vettingStatus: "approved",
      eligibleForJobs: true,
      authorizations: [
        { province: "ON", providerType: "PSW", verificationStatus: "verified", jobEligible: true },
        { province: "AB", providerType: "HCA", verificationStatus: "verified", jobEligible: true, expiresAt: future },
      ],
    };
    expect(canProviderTakeOrder(dual, onOrder)).toBe(true);
    expect(canProviderTakeOrder(dual, abOrder)).toBe(true);
  });

  it("rejects unverified, ineligible or expired authorizations", () => {
    const base = { vettingStatus: "approved", eligibleForJobs: true };
    expect(
      canProviderTakeOrder(
        { ...base, authorizations: [{ province: "AB", providerType: "HCA", verificationStatus: "pending", jobEligible: true }] },
        abOrder,
      ),
    ).toBe(false);
    expect(
      canProviderTakeOrder(
        { ...base, authorizations: [{ province: "AB", providerType: "HCA", verificationStatus: "verified", jobEligible: false }] },
        abOrder,
      ),
    ).toBe(false);
    expect(
      canProviderTakeOrder(
        { ...base, authorizations: [{ province: "AB", providerType: "HCA", verificationStatus: "verified", jobEligible: true, expiresAt: past }] },
        abOrder,
      ),
    ).toBe(false);
  });

  it("never lets an Ontario-only authorization see Alberta work", () => {
    expect(
      canProviderTakeOrder(
        {
          vettingStatus: "approved",
          eligibleForJobs: true,
          authorizations: [{ province: "ON", providerType: "PSW", verificationStatus: "verified", jobEligible: true }],
        },
        abOrder,
      ),
    ).toBe(false);
  });
});

describe("Phase 8 — Alberta waiting list collects contact details only", () => {
  it("stores only the allowed contact fields", () => {
    const row = buildWaitlistRow({
      fullName: " Jane Doe ",
      email: " JANE@Example.com ",
      phone: " 249-288-4787 ",
      province: "AB",
      city: "Calgary",
      postalCode: "T2P 1J9",
      notes: "  Hoping to start this spring  ",
    });
    expect(Object.keys(row).sort()).toEqual([...WAITLIST_ALLOWED_FIELDS].sort());
    expect(row.full_name).toBe("Jane Doe");
    expect(row.email).toBe("jane@example.com");
    expect(row.notes).toBe("Hoping to start this spring");
  });

  it("never stores health or medical details", () => {
    expect(containsHealthDetails("Mum has dementia and needs medication")).toBe(true);
    expect(sanitizeWaitlistNote("Mum has dementia")).toBeNull();
    expect(sanitizeWaitlistNote("Diagnosed last year")).toBeNull();
    expect(sanitizeWaitlistNote("")).toBeNull();
    expect(sanitizeWaitlistNote("Please call me weekday mornings")).toBe("Please call me weekday mornings");
  });
});
