import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  computePswPayCents,
  resolvePayCents,
  bookedMinutesFromTimes,
  bookedMinutesFromHours,
  formatEstimatedEarnings,
  approvedRateCents,
  ONTARIO_PSW_RATE_CENTS,
  EARNINGS_UNAVAILABLE,
} from "@/lib/pswPay";
import { calculateShiftPay, getPayRateForShiftType } from "@/lib/payrollStore";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");
const ON_PSW = ONTARIO_PSW_RATE_CENTS;

describe("Phase 8 — Ontario PSW earnings = requested hours × $21", () => {
  it.each([
    [1, 2100],
    [2, 4200],
    [2.5, 5250],
    [3, 6300],
    [4, 8400],
    [8, 16800],
  ])("%s requested hours => %i cents", (hours, cents) => {
    expect(computePswPayCents(bookedMinutesFromHours(hours as number), ON_PSW)).toBe(cents);
  });

  it("the client price never affects provider earnings", () => {
    const clientPricePerHour = 40;
    expect(computePswPayCents(180, ON_PSW)).toBe(6300);
    expect(computePswPayCents(180, ON_PSW)).not.toBe(clientPricePerHour * 3 * 100);
  });

  it("tax never affects provider earnings", () => {
    const hstCents = 2340;
    const pay = computePswPayCents(180, ON_PSW)!;
    expect(pay).toBe(6300);
    expect(pay + hstCents).not.toBe(pay);
  });

  it("early arrival does not increase earnings", () => {
    const requested = bookedMinutesFromTimes("09:00", "12:00");
    const arrivedEarly = bookedMinutesFromTimes("08:30", "12:00");
    expect(computePswPayCents(requested, ON_PSW)).toBe(6300);
    expect(computePswPayCents(requested, ON_PSW)).not.toBe(computePswPayCents(arrivedEarly, ON_PSW));
  });

  it("late sign-out does not increase earnings", () => {
    const requested = bookedMinutesFromTimes("09:00", "12:00");
    expect(computePswPayCents(requested, ON_PSW)).toBe(6300);
  });

  it("care-sheet time and GPS duration do not change earnings", () => {
    const requested = 180;
    const gpsMinutes = 214;
    const careSheetMinutes = 18;
    expect(computePswPayCents(requested, ON_PSW)).toBe(6300);
    expect(computePswPayCents(requested + gpsMinutes + careSheetMinutes, ON_PSW)).not.toBe(
      computePswPayCents(requested, ON_PSW),
    );
    expect(computePswPayCents(requested, ON_PSW)).toBe(6300);
  });

  it("no premium, overtime or bonus is ever added", () => {
    const { totalPay, overtimePay, payRate } = calculateShiftPay(3, 45, "hospital");
    expect(totalPay).toBe(63);
    expect(overtimePay).toBe(0);
    expect(payRate).toBe(21);
    expect(getPayRateForShiftType("doctor")).toBe(21);
    expect(getPayRateForShiftType("hospital")).toBe(21);
  });

  it("an unverified or missing rate hides the amount", () => {
    expect(resolvePayCents(undefined, 180, undefined)).toBeNull();
    expect(formatEstimatedEarnings(null)).toBe("Earnings amount pending verification");
    expect(EARNINGS_UNAVAILABLE).toBe("Earnings amount pending verification");
  });

  it("a missing requested duration produces no amount", () => {
    expect(computePswPayCents(0, ON_PSW)).toBe(0);
    expect(resolvePayCents(undefined, 0, undefined)).toBeNull();
  });

  it("nurse and Alberta rates are never guessed", () => {
    expect(approvedRateCents("ON", "psw")).toBe(2100);
    expect(approvedRateCents("ON", "rpn")).toBeUndefined();
    expect(approvedRateCents("ON", "rn")).toBeUndefined();
    expect(approvedRateCents("AB", "hca")).toBeUndefined();
    expect(approvedRateCents("AB", "lpn")).toBeUndefined();
    expect(approvedRateCents("AB", "rn")).toBeUndefined();
    expect(resolvePayCents(undefined, 180, approvedRateCents("AB", "hca"))).toBeNull();
  });
});

describe("Phase 8 — server enforcement contracts", () => {
  const createBooking = read("supabase/functions/create-booking/index.ts");

  it("the booking server reads the rate only from the approved rate table", () => {
    expect(createBooking).toContain("provider_earning_rates");
    expect(createBooking).not.toContain("payRates.hospitalVisit");
    expect(createBooking).not.toContain("payRates.doctorVisit");
  });

  it("the rate-card provider payout is informational only", () => {
    expect(createBooking).toContain("is NOT applied");
  });

  it("the browser cannot submit hours, rate, gross or payable status", () => {
    const store = read("src/lib/bookingStore.ts");
    expect(store).not.toMatch(/gross_cents\s*:/);
    expect(store).not.toMatch(/rate_cents\s*:/);
  });

  it("payroll display uses the client-requested schedule, not clocked time", () => {
    const approval = read("src/components/admin/PayrollApprovalSection.tsx");
    expect(approval).toContain("requestedMinutes");
    const store = read("src/lib/payrollStore.ts");
    expect(store).toContain("calculateHoursWorked(shift.scheduledStart, shift.scheduledEnd)");
  });

  it("completing a shift creates no automatic payment", () => {
    const policy = read("src/lib/manualPayoutPolicy.ts");
    expect(policy.toLowerCase()).toContain("manual");
    const store = read("src/lib/payrollStore.ts");
    expect(store).not.toContain("stripe");
  });
});

describe("Phase 8 — Alberta stays locked", () => {
  it("Alberta client booking and payment remain disabled in the province gate", () => {
    const pi = read("supabase/functions/create-payment-intent/index.ts");
    expect(pi).toContain("payments_enabled");
    expect(pi).toContain("bookings_enabled");
  });

  it("the readiness checklist is administrator-only and labelled as unapproved", () => {
    const checklist = read("src/components/admin/ProvinceReadinessChecklist.tsx");
    expect(checklist).toContain("Requires Alberta legal and operational approval before activation.");
    expect(checklist).toContain("province_activation_checklist");
  });
});
