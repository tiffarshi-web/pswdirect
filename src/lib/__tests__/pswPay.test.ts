import { describe, it, expect, vi } from "vitest";
import {
  computePswPayCents,
  bookedMinutesFromTimes,
  bookedMinutesFromHours,
  formatCents,
  formatEstimatedEarnings,
  resolvePayCents,
  rateDollarsToCents,
  EARNINGS_UNAVAILABLE,
} from "@/lib/pswPay";

const HOME_CARE = 2100;
const DOCTOR_ESCORT = 2700;

describe("PSW estimated pay — confirmed duration × the booking's locked rate", () => {
  it.each([
    [120, 4200, "$42.00"],
    [180, 6300, "$63.00"],
    [240, 8400, "$84.00"],
    [270, 9450, "$94.50"],
    [300, 10500, "$105.00"],
  ])("%i booked minutes at $21/h => %i cents (%s)", (minutes, cents, display) => {
    expect(computePswPayCents(minutes, HOME_CARE)).toBe(cents);
    expect(formatCents(computePswPayCents(minutes, HOME_CARE)!)).toBe(display);
  });

  it("derives 270 minutes for a 4.5-hour booking from hours and from times", () => {
    expect(bookedMinutesFromHours(4.5)).toBe(270);
    expect(bookedMinutesFromTimes("18:00", "22:30")).toBe(270);
    expect(computePswPayCents(bookedMinutesFromTimes("18:00", "22:30"), HOME_CARE)).toBe(9450);
  });

  it("handles overnight bookings", () => {
    expect(bookedMinutesFromTimes("22:00", "02:00")).toBe(240);
    expect(computePswPayCents(240, HOME_CARE)).toBe(8400);
  });

  it("labels pre-completion amounts as estimated earnings", () => {
    expect(formatEstimatedEarnings(9450)).toBe("Estimated earnings: $94.50");
  });

  it("never uses client price, taxes, parking, transport fees, tips or Stripe amounts", () => {
    const booking = { bookedMinutes: 270, clientServicePriceCents: 22500, hstCents: 2925 };
    expect(computePswPayCents(booking.bookedMinutes, HOME_CARE)).toBe(9450);
  });

  it("shows the same amount on every PSW-facing screen (single shared calculation)", () => {
    const minutes = 270;
    const server = { bookingId: "b1", bookedMinutes: minutes, rateDollars: 21, payCents: 9450 };
    const screens = [
      resolvePayCents(server, minutes),
      resolvePayCents(server, minutes),
      resolvePayCents(undefined, minutes, HOME_CARE),
      computePswPayCents(minutes, HOME_CARE),
    ];
    expect(new Set(screens).size).toBe(1);
    expect(screens[0]).toBe(9450);
  });

  it("prefers the server-calculated amount over any local value", () => {
    const server = { bookingId: "b1", bookedMinutes: 300, rateDollars: 21, payCents: 10500 };
    expect(resolvePayCents(server, 270, HOME_CARE)).toBe(10500);
  });

  it("does not increase the estimate merely because a shift ran long", () => {
    expect(computePswPayCents(270, HOME_CARE)).toBe(9450);
    expect(computePswPayCents(270, HOME_CARE)).not.toBe(computePswPayCents(315, HOME_CARE));
  });

  it("CDT-000399 regression: Home Care 4.5h × $21 locked rate displays $94.50", () => {
    const minutes = bookedMinutesFromTimes("18:00", "22:30");
    expect(resolvePayCents(undefined, minutes, rateDollarsToCents(21))).toBe(9450);
  });

  it("Doctor Escort: 4.5 hours × $27 locked rate displays $121.50", () => {
    expect(computePswPayCents(270, DOCTOR_ESCORT)).toBe(12150);
    expect(formatEstimatedEarnings(12150)).toBe("Estimated earnings: $121.50");
    expect(resolvePayCents(undefined, 270, rateDollarsToCents(27))).toBe(12150);
  });

  it("Hospital Discharge $27 locked rate is never displayed as the $21 Home Care rate", () => {
    expect(resolvePayCents(undefined, 270, rateDollarsToCents(27))).toBe(12150);
    expect(resolvePayCents(undefined, 270, rateDollarsToCents(27))).not.toBe(9450);
  });

  it("never guesses a rate: missing locked rate yields null and the unavailable notice", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(resolvePayCents(undefined, 270, undefined)).toBeNull();
    expect(computePswPayCents(270, null)).toBeNull();
    expect(computePswPayCents(270, 0)).toBeNull();
    expect(formatEstimatedEarnings(null)).toBe(EARNINGS_UNAVAILABLE);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("guards against invalid input", () => {
    expect(computePswPayCents(-60, HOME_CARE)).toBe(0);
    expect(computePswPayCents(NaN, HOME_CARE)).toBe(0);
    expect(rateDollarsToCents(0)).toBeUndefined();
    expect(rateDollarsToCents(null)).toBeUndefined();
  });
});
