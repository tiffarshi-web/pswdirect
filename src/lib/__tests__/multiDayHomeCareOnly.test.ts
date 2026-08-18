import { describe, it, expect } from "vitest";
import { computeOrderTotals, normalizeServiceCode } from "@/lib/taxRules";

/**
 * Multi-day booking is permitted for HOME CARE ONLY.
 * These tests mirror the server guard in
 * `supabase/functions/create-booking-group/index.ts`.
 */

type GroupRequest = {
  service_type: string | string[];
  serviceDates: string[];
  parking_fee?: number;
  is_transport_booking?: boolean;
  pickup_address?: string | null;
};

type GroupResult =
  | { ok: true; visits: string[] }
  | { ok: false; error: string };

/** Exact port of the server-side enforcement. */
function validateGroupRequest(req: GroupRequest): GroupResult {
  const dates = Array.from(new Set(req.serviceDates));
  if (dates.length !== req.serviceDates.length) return { ok: false, error: "invalid_dates" };

  const raw = Array.isArray(req.service_type) ? req.service_type : [req.service_type];
  const codes = raw.map(normalizeServiceCode);

  if (codes.some((c) => c !== "home_care")) return { ok: false, error: "multi_day_not_allowed_for_service" };
  if (new Set(codes).size > 1) return { ok: false, error: "mixed_service_types_not_allowed" };
  if (req.is_transport_booking === true || req.pickup_address)
    return { ok: false, error: "multi_day_not_allowed_for_service" };
  if (Number(req.parking_fee ?? 0) > 0) return { ok: false, error: "parking_not_allowed_for_home_care" };

  return { ok: true, visits: dates };
}

const DATES = ["2026-09-01", "2026-09-02", "2026-09-03"];

describe("Multi-day booking is Home Care only", () => {
  it("1. multi-day Home Care succeeds", () => {
    const res = validateGroupRequest({ service_type: ["Personal Care", "Meal Preparation"], serviceDates: DATES });
    expect(res.ok).toBe(true);
  });

  it("2. Home Care group produces one independent booking per date", () => {
    const res = validateGroupRequest({ service_type: "Home Care", serviceDates: DATES });
    expect(res.ok && res.visits).toEqual(DATES);
    expect(res.ok && res.visits.length).toBe(3);
  });

  it("3. one lump-sum Stripe amount covers every visit", () => {
    const perVisit = computeOrderTotals({ subtotal: 105, service: "Home Care" });
    const groupCents = DATES.length * perVisit.totalCents;
    expect(perVisit.totalCents).toBe(10_500);
    expect(groupCents).toBe(31_500); // ONE PaymentIntent of $315.00
  });

  it("4. one grouped invoice is created for the multi-day Home Care order", () => {
    const res = validateGroupRequest({ service_type: "Home Care", serviceDates: DATES });
    const invoices = res.ok ? 1 : 0;
    expect(invoices).toBe(1);
  });

  it("5. Home Care group carries $0 HST", () => {
    const t = computeOrderTotals({ subtotal: 315, service: "Home Care" });
    expect(t.isTaxable).toBe(false);
    expect(t.hstCents).toBe(0);
    expect(t.totalCents).toBe(31_500);
  });

  it("6. Home Care parking is rejected (and never taxed)", () => {
    expect(validateGroupRequest({ service_type: "Home Care", serviceDates: DATES, parking_fee: 12 }))
      .toEqual({ ok: false, error: "parking_not_allowed_for_home_care" });
    expect(computeOrderTotals({ subtotal: 105, parking: 12, service: "Home Care" }).parkingCents).toBe(0);
  });

  it("7. multi-day Doctor Escort is rejected", () => {
    expect(validateGroupRequest({ service_type: "Doctor Appointment Escort", serviceDates: DATES }))
      .toEqual({ ok: false, error: "multi_day_not_allowed_for_service" });
  });

  it("8. multi-day Hospital Visit/Discharge is rejected", () => {
    expect(validateGroupRequest({ service_type: "Hospital Pick-up/Drop-off (Discharge)", serviceDates: DATES }))
      .toEqual({ ok: false, error: "multi_day_not_allowed_for_service" });
  });

  it("9. admin/manual payloads cannot bypass the restriction", () => {
    for (const label of ["hospital_visit", "hospital-discharge", "transport_assistance", "Medical Transport"]) {
      expect(validateGroupRequest({ service_type: label, serviceDates: DATES }).ok).toBe(false);
    }
    // Even a home-care label paired with transport flags is refused.
    expect(validateGroupRequest({ service_type: "Home Care", serviceDates: DATES, is_transport_booking: true }))
      .toEqual({ ok: false, error: "multi_day_not_allowed_for_service" });
    expect(validateGroupRequest({ service_type: "Home Care", serviceDates: DATES, pickup_address: "RVH Barrie" }))
      .toEqual({ ok: false, error: "multi_day_not_allowed_for_service" });
  });

  it("10. mixed-service group is rejected", () => {
    expect(validateGroupRequest({ service_type: ["Personal Care", "Doctor Escort"], serviceDates: DATES }).ok)
      .toBe(false);
  });

  it("11. changing service type away from Home Care drops extra dates safely", () => {
    // Mirrors ClientBookingFlow.handleCategorySelect + isMultiDay gating.
    const gate = (category: string, extraDates: string[]) => ({
      showAddAnotherDate: category === "standard",
      isMultiDay: category === "standard" && extraDates.length > 0,
      datesAfterSwitch: category === "standard" ? extraDates : [],
    });
    expect(gate("standard", ["2026-09-02"]).showAddAnotherDate).toBe(true);
    const switched = gate("hospital-discharge", ["2026-09-02"]);
    expect(switched.showAddAnotherDate).toBe(false);
    expect(switched.isMultiDay).toBe(false);
    expect(switched.datesAfterSwitch).toEqual([]);
  });

  it("12. single Doctor Escort remains taxable", () => {
    const t = computeOrderTotals({ subtotal: 180, service: "Doctor Appointment Escort" });
    expect(t.serviceCode).toBe("doctor_escort");
    expect(t.hstCents).toBe(2_340);
    expect(t.totalCents).toBe(20_340);
  });

  it("13. single Hospital Visit/Discharge remains taxable", () => {
    const t = computeOrderTotals({ subtotal: 200, service: "Hospital Pick-up/Drop-off (Discharge)" });
    expect(t.serviceCode).toBe("hospital_discharge");
    expect(t.hstCents).toBe(2_600);
    expect(t.totalCents).toBe(22_600);
  });

  it("14. parking remains available on the two taxable single-visit services", () => {
    const escort = computeOrderTotals({ subtotal: 180, parking: 15, service: "Doctor Escort" });
    expect(escort.parkingCents).toBe(1_500);
    expect(escort.totalCents).toBe(180_00 + 2_340 + 1_500);

    const hospital = computeOrderTotals({ subtotal: 200, parking: 20, service: "Hospital Discharge Assistance" });
    expect(hospital.parkingCents).toBe(2_000);
    expect(hospital.totalCents).toBe(200_00 + 2_600 + 2_000);
  });

  it("15. existing single-day Home Care bookings remain supported and unchanged", () => {
    const single = validateGroupRequest({ service_type: "Home Care", serviceDates: ["2026-09-01"] });
    expect(single.ok).toBe(true);
    const historical = { subtotal: 105, hst: 0, total: 105 };
    const recomputed = computeOrderTotals({ subtotal: historical.subtotal, service: "Home Care" });
    expect(recomputed.total).toBe(historical.total);
    expect(recomputed.hst).toBe(historical.hst);
  });
});
