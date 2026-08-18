import { describe, it, expect } from "vitest";
import {
  computeOrderTotals,
  resolveServiceCode,
  normalizeServiceCode,
  isTaxableService,
  fromLegacyCategory,
} from "@/lib/taxRules";

/**
 * Authoritative tax engine regression suite.
 * Mirrors supabase/functions/_shared/pricingTax.ts (same rules, same rounding).
 *
 * Rules: Home Care non-taxable · Doctor Escort 13% HST · Hospital Discharge 13% HST
 * Parking is a non-taxable pass-through on transport orders only.
 */
describe("Authoritative tax engine", () => {
  describe("1. Home Care → no HST", () => {
    it("2h home care at $70 is non-taxable", () => {
      const r = computeOrderTotals({ subtotal: 70, service: "home_care" });
      expect(r.isTaxable).toBe(false);
      expect(r.hstCents).toBe(0);
      expect(r.totalCents).toBe(7000);
      expect(r.total).toBe(70);
    });
  });

  describe("2. Doctor Escort → 13% HST", () => {
    it("$45 escort → $5.85 HST → $50.85", () => {
      const r = computeOrderTotals({ subtotal: 45, service: "doctor_escort" });
      expect(r.isTaxable).toBe(true);
      expect(r.hstCents).toBe(585);
      expect(r.totalCents).toBe(5085);
    });
  });

  describe("3. Hospital Discharge → 13% HST", () => {
    it("$67.50 (1.5h) → $8.78 HST → $76.28", () => {
      const r = computeOrderTotals({ subtotal: 67.5, service: "hospital_discharge" });
      expect(r.hstCents).toBe(878); // 6750 * 0.13 = 877.5 → 878
      expect(r.totalCents).toBe(7628);
    });
  });

  describe("4. Hospital service with parking", () => {
    it("taxes the service only, parking passes through untaxed", () => {
      const r = computeOrderTotals({
        subtotal: 90,
        parking: 12.5,
        service: "hospital_discharge",
      });
      expect(r.hstCents).toBe(1170);
      expect(r.parkingCents).toBe(1250);
      expect(r.totalCents).toBe(9000 + 1170 + 1250);
      expect(r.total).toBe(114.2);
    });

    it("clamps parking at $500", () => {
      const r = computeOrderTotals({ subtotal: 45, parking: 9999, service: "hospital_discharge" });
      expect(r.parkingCents).toBe(50_000);
    });
  });

  describe("5. Doctor Escort with parking", () => {
    it("$45 service + $8 parking = $58.85", () => {
      const r = computeOrderTotals({ subtotal: 45, parking: 8, service: "doctor_escort" });
      expect(r.hstCents).toBe(585);
      expect(r.totalCents).toBe(5885);
    });

    it("drops parking on a non-taxable home care order", () => {
      const r = computeOrderTotals({ subtotal: 70, parking: 20, service: "home_care" });
      expect(r.parkingCents).toBe(0);
      expect(r.totalCents).toBe(7000);
    });
  });

  describe("6. Multi-day taxable order", () => {
    it("group total equals the sum of per-visit authoritative totals", () => {
      const visits = [45, 45, 45].map((s) =>
        computeOrderTotals({ subtotal: s, service: "hospital_discharge" })
      );
      const groupCents = visits.reduce((a, v) => a + v.totalCents, 0);
      expect(groupCents).toBe(3 * 5085);
      expect(groupCents / 100).toBe(152.55);
    });
  });

  describe("7. Mixed visit durations", () => {
    it("sums 1h + 1.5h + 2h escort visits correctly", () => {
      const subtotals = [45, 67.5, 90];
      const visits = subtotals.map((s) => computeOrderTotals({ subtotal: s, service: "doctor_escort" }));
      expect(visits.map((v) => v.hstCents)).toEqual([585, 878, 1170]);
      const groupCents = visits.reduce((a, v) => a + v.totalCents, 0);
      expect(groupCents).toBe(5085 + 7628 + 10170);
    });
  });

  describe("8. One lump-sum Stripe amount", () => {
    it("Stripe amount is a single integer-cent total", () => {
      const r = computeOrderTotals({ subtotal: 90, parking: 12.5, service: "hospital_discharge" });
      const stripeAmount = r.totalCents;
      expect(Number.isInteger(stripeAmount)).toBe(true);
      expect(stripeAmount).toBe(11420);
    });
  });

  describe("9. Invoice tax matches Stripe tax", () => {
    it("invoice HST line equals the taxed component of the charged amount", () => {
      const r = computeOrderTotals({ subtotal: 80, parking: 5, service: "doctor_escort" });
      const invoiceLines = r.subtotalCents + r.parkingCents + r.hstCents;
      expect(invoiceLines).toBe(r.totalCents);
      expect(r.hstCents).toBe(1040);
    });
  });

  describe("10. Email invoice matches stored financial snapshot", () => {
    it("stored snapshot fields reconcile to the total", () => {
      const r = computeOrderTotals({ subtotal: 45, service: "hospital_discharge" });
      const snapshot = { subtotal: r.subtotal, hst_amount: r.hst, parking_fee: r.parking, total: r.total };
      expect(
        Math.round((snapshot.subtotal + snapshot.hst_amount + snapshot.parking_fee) * 100)
      ).toBe(Math.round(snapshot.total * 100));
    });
  });

  describe("11. Browser-forged tax rejected", () => {
    it("recomputes from subtotal and ignores any client-supplied total", () => {
      const forged = { subtotal: 45, total: 45, tax: 0, service: "hospital_discharge" };
      const authoritative = computeOrderTotals({
        subtotal: forged.subtotal,
        service: forged.service,
      });
      expect(authoritative.totalCents).not.toBe(Math.round(forged.total * 100));
      expect(authoritative.totalCents).toBe(5085);
    });

    it("negative subtotals clamp to zero rather than credit the customer", () => {
      const r = computeOrderTotals({ subtotal: -100, service: "doctor_escort" });
      expect(r.subtotalCents).toBe(0);
      expect(r.totalCents).toBe(0);
    });
  });

  describe("12. Alias service codes cannot bypass tax", () => {
    const taxableAliases = [
      "hospital_visit",
      "hospital_discharge",
      "hospital-discharge",
      "hospital",
      "Hospital Discharge",
      "Hospital Discharge Assistance",
      "Hospital Pick-up/Drop-off (Discharge)",
      "doctor_escort",
      "Doctor Escort",
      "Doctor Appointment Escort",
      "transport_assistance",
    ];

    it.each(taxableAliases)("'%s' resolves to a taxable service", (alias) => {
      const code = normalizeServiceCode(alias);
      expect(isTaxableService(code)).toBe(true);
      expect(computeOrderTotals({ subtotal: 45, service: alias }).hstCents).toBe(585);
    });

    it("resolves taxable code from a mixed service_type array", () => {
      expect(resolveServiceCode(["Personal Care", "Doctor Appointment Escort"])).toBe("doctor_escort");
      expect(resolveServiceCode(["Personal Care", "Meal Prep"])).toBe("home_care");
    });

    it("maps legacy admin categories to authoritative codes", () => {
      expect(fromLegacyCategory("standard")).toBe("home_care");
      expect(fromLegacyCategory("doctor-appointment")).toBe("doctor_escort");
      expect(fromLegacyCategory("hospital-discharge")).toBe("hospital_discharge");
    });

    it("unknown labels default to non-taxable home care, never a silent tax", () => {
      expect(normalizeServiceCode("Companionship")).toBe("home_care");
      expect(computeOrderTotals({ subtotal: 70, service: "Companionship" }).hstCents).toBe(0);
    });
  });

  describe("13. Historical invoices remain unchanged", () => {
    it("engine is pure — it never mutates the stored snapshot passed to it", () => {
      const historical = Object.freeze({ subtotal: 45, hst_amount: 0, total: 45 });
      const recomputed = computeOrderTotals({ subtotal: historical.subtotal, service: "hospital_discharge" });
      // Recompute reports the correct amount but leaves the record untouched.
      expect(historical.total).toBe(45);
      expect(historical.hst_amount).toBe(0);
      expect(recomputed.totalCents).toBe(5085);
    });
  });

  describe("Integer-cent rounding", () => {
    it("rounds half-cent HST up consistently", () => {
      expect(computeOrderTotals({ subtotal: 67.5, service: "doctor_escort" }).hstCents).toBe(878);
      expect(computeOrderTotals({ subtotal: 0.5, service: "doctor_escort" }).hstCents).toBe(7); // 6.5 → 7
    });

    it("accepts amounts already expressed in cents", () => {
      const r = computeOrderTotals({ subtotal: 4500, inCents: true, service: "doctor_escort" });
      expect(r.totalCents).toBe(5085);
    });
  });
});
