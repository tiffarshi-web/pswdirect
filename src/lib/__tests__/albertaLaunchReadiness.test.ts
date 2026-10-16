/**
 * Alberta launch readiness — fail-closed rules.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { DEFAULT_PROVINCES, taxBpsForProvince } from "@/lib/provinceConfig";
import {
  taxBpsForProvince as serverTaxBps,
  computeOrderTotals,
} from "../../../supabase/functions/_shared/pricingTax";

const migration = () => {
  const dir = "drizzle/migrations";
  const f = readdirSync(dir).find((n) => n.includes("alberta_readiness_fail_closed"))!;
  return readFileSync(`${dir}/${f}`, "utf8");
};

describe("Alberta tax fails closed", () => {
  it("no Alberta tax rate without an approved matrix (client)", () => {
    expect(taxBpsForProvince(DEFAULT_PROVINCES.AB, "home_care")).toBeNull();
    expect(taxBpsForProvince(DEFAULT_PROVINCES.AB, "doctor_escort")).toBeNull();
    expect(taxBpsForProvince(DEFAULT_PROVINCES.AB, "hospital_discharge")).toBeNull();
  });

  it("server never falls back to Ontario HST or assumed GST for Alberta", () => {
    expect(serverTaxBps(null, "doctor_escort", "AB")).toBeNull();
    expect(serverTaxBps({ label: "GST", doctor_escort_bps: 500 }, "doctor_escort", "AB")).toBeNull();
    expect(serverTaxBps({ label: "GST", approved: true }, "home_care", "AB")).toBeNull();
    expect(serverTaxBps({ approved: true, doctor_escort_bps: 500 }, "doctor_escort", "AB")).toBe(500);
  });

  it("Ontario tax is unchanged: 0% home care, 13% transport", () => {
    expect(serverTaxBps(null, "home_care", "ON")).toBe(0);
    expect(serverTaxBps(null, "doctor_escort", "ON")).toBe(1300);
    expect(serverTaxBps(null, "hospital_discharge", "ON")).toBe(1300);
    expect(computeOrderTotals({ subtotal: 100, service: "doctor_escort" }).hst).toBe(13);
    expect(computeOrderTotals({ subtotal: 100, service: "home_care" }).hst).toBe(0);
  });

  it("create-booking refuses non-Ontario orders without approved tax", () => {
    const src = readFileSync("supabase/functions/create-booking/index.ts", "utf8");
    expect(src).toContain("province_tax_not_configured");
    expect(src).toContain("taxBps: provinceTaxBps");
  });
});

describe("Alberta switches and Ontario settings", () => {
  it("Alberta stays in preparation with everything off", () => {
    const ab = DEFAULT_PROVINCES.AB;
    expect([ab.launchStatus, ab.recruitmentEnabled, ab.bookingsEnabled, ab.paymentsEnabled])
      .toEqual(["preparation", false, false, false]);
  });

  it("Ontario stays live with HST", () => {
    const on = DEFAULT_PROVINCES.ON;
    expect(on.launchStatus).toBe("live");
    expect(on.paymentsEnabled).toBe(true);
    expect(on.taxConfig).toMatchObject({ label: "HST", home_care_bps: 0, doctor_escort_bps: 1300, hospital_discharge_bps: 1300 });
  });
});

describe("Database guards", () => {
  it("checklist ticks need a signed-in admin, written evidence and passing live evidence", () => {
    const sql = migration();
    expect(sql).toContain("checklist_requires_signed_in_admin");
    expect(sql).toContain("checklist_evidence_required");
    expect(sql).toContain("checklist_evidence_missing");
  });

  it("bookings/payments cannot be switched on outside Ontario until launch-ready", () => {
    const sql = migration();
    expect(sql).toContain("province_not_launch_ready");
    expect(sql).toMatch(/NEW\.code <> 'ON'/);
  });

  it("Alberta HCA verification requires CLHA registration and a current practice permit", () => {
    const sql = migration();
    expect(sql).toContain("ab_hca_requires_clha_registration_and_practice_permit");
    expect(sql).toContain("ab_current_permit_expiry_required");
    expect(sql).toContain("ab_registration_evidence_required");
  });

  it("Alberta LPN/RN verification requires an Alberta registration body", () => {
    expect(migration()).toContain("ab_nurse_requires_alberta_registration_body");
  });

  it("checklist requires base prices for all three Alberta services", () => {
    expect(migration()).toContain("'standard','doctor-appointment','hospital-discharge'");
  });
});
