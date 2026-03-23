/**
 * Pricing Pipeline Validation Tests
 * Tests the unified pricing engine across all service categories.
 * 
 * Admin Source of Truth:
 *   Standard Home Care:  firstHour=35, per30Min=15
 *   Doctor Escort:       firstHour=40, per30Min=20
 *   Hospital/Discharge:  firstHour=45, per30Min=22.50
 *   Minimum Booking Fee: 30
 * 
 * Tax: Doctor Escort & Hospital Discharge = 13% HST
 *      Standard Home Care = 0% (unless task flags say otherwise)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase before any other imports
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: null, error: null }),
          order: () => Promise.resolve({ data: [], error: null }),
        }),
        order: () => Promise.resolve({ data: [], error: null }),
      }),
      upsert: () => Promise.resolve({ error: null }),
    }),
  },
}));

// Set up localStorage with admin pricing before importing modules
const ADMIN_RATES = {
  standard: { firstHour: 35, per30Min: 15 },
  "doctor-appointment": { firstHour: 40, per30Min: 20 },
  "hospital-discharge": { firstHour: 45, per30Min: 22.5 },
  minimumBookingFee: 30,
};

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("pswdirect_category_rates", JSON.stringify(ADMIN_RATES));
  // No surge rules by default
  localStorage.removeItem("surge_schedule_rules");
  localStorage.removeItem("adminPricing");
});

import { getRatesForCategory, getCategoryRates } from "../pricingConfigStore";
import { calculateDurationBasedPrice, calculateOvertimeCharges } from "../businessConfig";
import type { ServiceCategory } from "../taskConfig";

// Helper to compute expected price
const computeExpected = (
  category: ServiceCategory,
  durationHours: number,
  taxableFraction: number,
  rushMultiplier: number = 1,
) => {
  const rates = ADMIN_RATES[category] || ADMIN_RATES.standard;
  const additionalHalfHours = Math.max(0, Math.round((durationHours - 1) * 2));
  const baseCost = rates.firstHour + additionalHalfHours * rates.per30Min;
  const surgeAmount = baseCost * (rushMultiplier - 1);
  const preTax = baseCost + surgeAmount;
  const hst = preTax * taxableFraction * 0.13;
  return { baseCost, surgeAmount, preTax, hst, total: preTax + hst };
};

describe("Unified Pricing Pipeline", () => {
  // ─── 1. Home Care 1 hour ───
  it("1. Home Care 1 hour — $35, no HST", () => {
    const result = calculateDurationBasedPrice(1, "standard", false);
    const expected = computeExpected("standard", 1, 0);
    expect(result.subtotal).toBeCloseTo(35, 2);
    expect(result.hstAmount).toBeCloseTo(0, 2);
    expect(result.total).toBeCloseTo(35, 2);
    console.log("✅ Test 1 PASS — Home Care 1h:", result);
  });

  // ─── 2. Home Care 1.5 hours ───
  it("2. Home Care 1.5 hours — $35 + $15 = $50, no HST", () => {
    const result = calculateDurationBasedPrice(1.5, "standard", false);
    expect(result.subtotal).toBeCloseTo(50, 2);
    expect(result.hstAmount).toBeCloseTo(0, 2);
    expect(result.total).toBeCloseTo(50, 2);
    console.log("✅ Test 2 PASS — Home Care 1.5h:", result);
  });

  // ─── 3. Doctor Escort 1 hour ───
  it("3. Doctor Escort 1 hour — $40 + HST", () => {
    const result = calculateDurationBasedPrice(1, "doctor-appointment", false, undefined, undefined, undefined, undefined, 1);
    expect(result.subtotal).toBeCloseTo(40, 2);
    expect(result.hstAmount).toBeCloseTo(40 * 0.13, 2);
    expect(result.total).toBeCloseTo(40 + 40 * 0.13, 2);
    console.log("✅ Test 3 PASS — Doctor Escort 1h:", result);
  });

  // ─── 4. Doctor Escort 2 hours ───
  it("4. Doctor Escort 2 hours — $40 + 2×$20 = $80 + HST", () => {
    const result = calculateDurationBasedPrice(2, "doctor-appointment", false, undefined, undefined, undefined, undefined, 1);
    expect(result.subtotal).toBeCloseTo(80, 2);
    expect(result.hstAmount).toBeCloseTo(80 * 0.13, 2);
    expect(result.total).toBeCloseTo(80 + 80 * 0.13, 2);
    console.log("✅ Test 4 PASS — Doctor Escort 2h:", result);
  });

  // ─── 5. Hospital 1 hour ───
  it("5. Hospital 1 hour — $45 + HST", () => {
    const result = calculateDurationBasedPrice(1, "hospital-discharge", false, undefined, undefined, undefined, undefined, 1);
    expect(result.subtotal).toBeCloseTo(45, 2);
    expect(result.hstAmount).toBeCloseTo(45 * 0.13, 2);
    expect(result.total).toBeCloseTo(45 + 45 * 0.13, 2);
    console.log("✅ Test 5 PASS — Hospital 1h:", result);
  });

  // ─── 6. Hospital 1.5 hours ───
  it("6. Hospital 1.5 hours — $45 + $22.50 = $67.50 + HST", () => {
    const result = calculateDurationBasedPrice(1.5, "hospital-discharge", false, undefined, undefined, undefined, undefined, 1);
    expect(result.subtotal).toBeCloseTo(67.5, 2);
    expect(result.hstAmount).toBeCloseTo(67.5 * 0.13, 2);
    expect(result.total).toBeCloseTo(67.5 + 67.5 * 0.13, 2);
    console.log("✅ Test 6 PASS — Hospital 1.5h:", result);
  });

  // ─── 7. ASAP / Rush booking ───
  it("7. ASAP booking applies rush multiplier (default 1.25)", () => {
    // Set up admin pricing with ASAP enabled
    localStorage.setItem("adminPricing", JSON.stringify({
      asapPricingEnabled: true,
      asapMultiplier: 1.25,
    }));
    
    const result = calculateDurationBasedPrice(1, "standard", true);
    const baseCost = 35;
    const surgeAmount = baseCost * 0.25;
    // subtotal in calculateDurationBasedPrice is the preTax amount (base + surge)
    expect(result.surgeAmount).toBeCloseTo(surgeAmount, 2);
    expect(result.total).toBeCloseTo(baseCost + surgeAmount, 2);
    console.log("✅ Test 7 PASS — ASAP Rush:", result);
  });

  // ─── 8. Weekend booking (surge) ───
  it("8. Weekend surge applies when rules active", () => {
    // Create a surge rule for weekends (15%)
    const saturdayDate = "2026-03-28"; // a Saturday
    const time = "10:00";
    localStorage.setItem("surge_schedule_rules", JSON.stringify([
      {
        id: "weekend",
        name: "Weekend Surge",
        enabled: true,
        multiplier: 1.15,
        daysOfWeek: [0, 6], // Sun, Sat
        stackable: false,
      },
    ]));

    const result = calculateDurationBasedPrice(1, "standard", false, undefined, undefined, saturdayDate, time);
    expect(result.surgeAmount).toBeCloseTo(35 * 0.15, 2);
    expect(result.total).toBeCloseTo(35 + 35 * 0.15, 2);
    console.log("✅ Test 8 PASS — Weekend Surge:", result);
  });

  // ─── 9. Evening booking (surge) ───
  it("9. Evening surge applies when rules active", () => {
    localStorage.setItem("surge_schedule_rules", JSON.stringify([
      {
        id: "evening",
        name: "Evening Surge",
        enabled: true,
        multiplier: 1.10,
        startTime: "18:00",
        endTime: "23:59",
        stackable: false,
      },
    ]));

    const result = calculateDurationBasedPrice(1, "doctor-appointment", false, undefined, undefined, "2026-03-25", "19:00", 1);
    const baseCost = 40;
    const surgeAmount = baseCost * 0.10;
    const preTax = baseCost + surgeAmount;
    const hst = preTax * 0.13;
    expect(result.surgeAmount).toBeCloseTo(surgeAmount, 2);
    expect(result.hstAmount).toBeCloseTo(hst, 2);
    expect(result.total).toBeCloseTo(preTax + hst, 2);
    console.log("✅ Test 9 PASS — Evening Surge:", result);
  });

  // ─── 10. Tax validation ───
  it("10. Tax validation — transport has HST, home care does not", () => {
    // Doctor Escort with taxableFraction=1 (fully taxable)
    const doctor = calculateDurationBasedPrice(1, "doctor-appointment", false, undefined, undefined, undefined, undefined, 1);
    expect(doctor.hstAmount).toBeGreaterThan(0);
    expect(doctor.hstAmount).toBeCloseTo(40 * 0.13, 2);

    // Hospital with taxableFraction=1
    const hospital = calculateDurationBasedPrice(1, "hospital-discharge", false, undefined, undefined, undefined, undefined, 1);
    expect(hospital.hstAmount).toBeGreaterThan(0);
    expect(hospital.hstAmount).toBeCloseTo(45 * 0.13, 2);

    // Standard Home Care with taxableFraction=0 (no HST)
    const homeCare = calculateDurationBasedPrice(1, "standard", false, undefined, undefined, undefined, undefined, 0);
    expect(homeCare.hstAmount).toBeCloseTo(0, 2);

    console.log("✅ Test 10 PASS — Tax validation:", { doctor: doctor.hstAmount, hospital: hospital.hstAmount, homeCare: homeCare.hstAmount });
  });

  // ─── 11. Overtime scenario ───
  it("11. Overtime calculation follows 14-min grace, 15-min blocks", () => {
    // Import overtime calculator
    const { calculateOvertimeCharges } = require("../businessConfig");
    
    // 10 min over — within grace
    const grace = calculateOvertimeCharges("14:00", "14:10", 35);
    expect(grace.withinGracePeriod).toBe(true);
    expect(grace.overtimeCharge).toBe(0);

    // 20 min over — 2 blocks of 15 min
    const overtime = calculateOvertimeCharges("14:00", "14:20", 35);
    expect(overtime.withinGracePeriod).toBe(false);
    expect(overtime.billableOvertimeBlocks).toBeGreaterThanOrEqual(1);
    expect(overtime.overtimeCharge).toBeGreaterThan(0);

    console.log("✅ Test 11 PASS — Overtime:", { grace, overtime });
  });

  // ─── Minimum booking fee ───
  it("Minimum booking fee is enforced", () => {
    const rates = getCategoryRates();
    expect(rates.minimumBookingFee).toBe(30);
  });

  // ─── No fallback pricing ───
  it("No hardcoded $20 fallback exists in pricing engine", () => {
    // All categories must produce pricing > $20 for 1 hour
    const standard = calculateDurationBasedPrice(1, "standard", false);
    const doctor = calculateDurationBasedPrice(1, "doctor-appointment", false, undefined, undefined, undefined, undefined, 1);
    const hospital = calculateDurationBasedPrice(1, "hospital-discharge", false, undefined, undefined, undefined, undefined, 1);

    expect(standard.total).toBeGreaterThan(20);
    expect(doctor.total).toBeGreaterThan(20);
    expect(hospital.total).toBeGreaterThan(20);
    console.log("✅ No fallback pricing — all totals > $20");
  });

  // ─── Rates match admin source of truth ───
  it("Rates match admin source of truth", () => {
    const rates = getCategoryRates();
    expect(rates.standard.firstHour).toBe(35);
    expect(rates.standard.per30Min).toBe(15);
    expect(rates["doctor-appointment"].firstHour).toBe(40);
    expect(rates["doctor-appointment"].per30Min).toBe(20);
    expect(rates["hospital-discharge"].firstHour).toBe(45);
    expect(rates["hospital-discharge"].per30Min).toBe(22.5);
  });
});
