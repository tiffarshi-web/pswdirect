import { describe, it, expect } from "vitest";
import {
  computePswPayCents,
  bookedMinutesFromTimes,
  bookedMinutesFromHours,
  formatCents,
  formatEstimatedEarnings,
  resolvePayCents,
  rateDollarsToCents,
  DEFAULT_PSW_RATE_CENTS,
} from "@/lib/pswPay";

describe("PSW estimated pay — $21/hour on confirmed booked duration", () => {
  it("rate is $21.00/hour in cents", () => {
    expect(DEFAULT_PSW_RATE_CENTS).toBe(2100);
  });

  it.each([
    [120, 4200, "$42.00"],
    [180, 6300, "$63.00"],
    [240, 8400, "$84.00"],
    [270, 9450, "$94.50"],
    [300, 10500, "$105.00"],
  ])("%i booked minutes => %i cents (%s)", (minutes, cents, display) => {
    expect(computePswPayCents(minutes)).toBe(cents);
    expect(formatCents(computePswPayCents(minutes))).toBe(display);
  });

  it("derives 270 minutes for a 4.5-hour booking from hours and from times", () => {
    expect(bookedMinutesFromHours(4.5)).toBe(270);
    expect(bookedMinutesFromTimes("18:00", "22:30")).toBe(270);
    expect(computePswPayCents(bookedMinutesFromTimes("18:00", "22:30"))).toBe(9450);
  });

  it("handles overnight bookings", () => {
    expect(bookedMinutesFromTimes("22:00", "02:00")).toBe(240);
    expect(computePswPayCents(240)).toBe(8400);
  });

  it("labels pre-completion amounts as estimated earnings", () => {
    expect(formatEstimatedEarnings(9450)).toBe("Estimated earnings: $94.50");
  });

  it("never uses client price, taxes, parking, transport fees, tips or Stripe amounts", () => {
    const booking = {
      bookedMinutes: 270,
      clientServicePriceCents: 22500,
      hstCents: 2925,
      parkingFeeCents: 4000,
      transportationFeeCents: 3500,
      tipCents: 2000,
      stripeAmountCents: 34925,
    };
    // Only the booked duration is an input.
    expect(computePswPayCents(booking.bookedMinutes)).toBe(9450);
    // Any variation of the client-side money fields is irrelevant.
    const inflated = { ...booking, clientServicePriceCents: 99999, parkingFeeCents: 12345 };
    expect(computePswPayCents(inflated.bookedMinutes)).toBe(
      computePswPayCents(booking.bookedMinutes),
    );
  });

  it("shows the same amount on every PSW-facing screen (single shared calculation)", () => {
    const minutes = 270;
    const server = {
      bookingId: "b1",
      bookedMinutes: minutes,
      rateDollars: 21,
      payCents: 9450,
    };
    const screens = [
      resolvePayCents(server, minutes), // available jobs
      resolvePayCents(server, minutes), // job detail / accept shift
      resolvePayCents(server, minutes), // upcoming shifts
      resolvePayCents(undefined, minutes), // offline mirror (same formula)
      computePswPayCents(minutes), // completed jobs / earnings
    ];
    expect(new Set(screens).size).toBe(1);
    expect(screens[0]).toBe(9450);
  });

  it("prefers the server-calculated amount over any local value", () => {
    const server = { bookingId: "b1", bookedMinutes: 300, rateDollars: 21, payCents: 10500 };
    expect(resolvePayCents(server, 270)).toBe(10500);
  });

  it("does not increase the estimate merely because a shift ran long", () => {
    const bookedMinutes = 270;
    const actualWorkedMinutes = 315; // signed out 45 min late, not approved
    expect(computePswPayCents(bookedMinutes)).toBe(9450);
    expect(computePswPayCents(bookedMinutes)).not.toBe(
      computePswPayCents(actualWorkedMinutes),
    );
  });

  it("uses the final approved payable duration when overtime is approved", () => {
    const approvedPayableMinutes = 315;
    expect(computePswPayCents(approvedPayableMinutes)).toBe(11025); // $110.25
  });

  it("CDT-000399 regression: Home Care 4.5h × $21 locked rate displays $94.50", () => {
    const minutes = bookedMinutesFromTimes("18:00", "22:30");
    expect(minutes).toBe(270);
    // Booking's locked rate (21) comes from the server / psw_safe_booking_view.
    expect(resolvePayCents(undefined, minutes, rateDollarsToCents(21))).toBe(9450);
    expect(formatEstimatedEarnings(9450)).toBe("Estimated earnings: $94.50");
  });

  it("Doctor Escort: 4.5 hours × $27 locked rate displays $121.50", () => {
    const minutes = 270;
    expect(computePswPayCents(minutes, 2700)).toBe(12150);
    expect(formatCents(12150)).toBe("$121.50");
    expect(formatEstimatedEarnings(12150)).toBe("Estimated earnings: $121.50");
    // The booking's locked $27 rate wins over the $21 Home Care default.
    expect(resolvePayCents(undefined, minutes, rateDollarsToCents(27))).toBe(12150);
  });

  it("respects the booking's locked service rate instead of any hard-coded rate", () => {
    // Same duration, different services => different pay.
    expect(resolvePayCents(undefined, 270, rateDollarsToCents(27))).toBe(12150); // Doctor Escort
    expect(resolvePayCents(undefined, 270, rateDollarsToCents(21))).toBe(9450);  // Home Care
    // Missing/invalid locked rate falls back to the $21 Home Care default only.
    expect(resolvePayCents(undefined, 270, undefined)).toBe(9450);
    expect(rateDollarsToCents(0)).toBeUndefined();
    expect(rateDollarsToCents(null)).toBeUndefined();
  });

  it("guards against invalid input", () => {
    expect(computePswPayCents(-60)).toBe(0);
    expect(computePswPayCents(NaN)).toBe(0);
    expect(computePswPayCents(270, 0)).toBe(9450); // falls back to $21
  });
});
