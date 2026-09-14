import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  hasAttendanceActivity,
  isCorrectionAvailable,
  validateWrongDayCorrection,
  planWrongDayCorrection,
  notificationTemplateIdsFor,
  buildCorrectionIdempotencyKey,
  isCareSheetSendable,
  isEarningPayable,
  WRONG_DAY_NOTIFICATION_TEMPLATES,
  MANUAL_PAYMENT_BLOCK_MESSAGE,
  type WrongDayBookingContext,
  type WrongDayCorrectionInput,
} from "@/lib/wrongDayCorrection";

const MIGRATION = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260914152902_702aebd3-e44d-4570-9676-6076dc2397ae.sql",
  ),
  "utf8",
);

const ctx = (over: Partial<WrongDayBookingContext> = {}): WrongDayBookingContext => ({
  bookingId: "b1",
  bookingCode: "CDT-000500",
  status: "completed",
  checkedInAt: "2026-09-13T13:00:00Z",
  signedOutAt: "2026-09-13T16:00:00Z",
  careSheetStatus: "submitted",
  hasCareSheet: true,
  assignedPswId: "psw-1",
  hasRecordedManualPayment: false,
  ...over,
});

const input = (over: Partial<WrongDayCorrectionInput> = {}): WrongDayCorrectionInput => ({
  correctionCase: "no_care_original_date",
  reason: "Caregiver signed in a day early",
  adminNotes: "",
  careDelivered: false,
  clientInformed: false,
  assignment: "keep",
  adminEmail: "office@pswdirect.ca",
  finalConfirmation: true,
  ...over,
});

describe("wrong-day correction availability", () => {
  it("1. offers the correction when attendance exists", () => {
    expect(hasAttendanceActivity(ctx())).toBe(true);
    expect(isCorrectionAvailable(ctx())).toBe(true);
  });

  it("2. hides the correction for untouched orders", () => {
    expect(
      isCorrectionAvailable(ctx({ status: "active", checkedInAt: null, signedOutAt: null })),
    ).toBe(false);
  });

  it("3. hides the correction for cancelled orders", () => {
    expect(isCorrectionAvailable(ctx({ status: "cancelled" }))).toBe(false);
  });
});

describe("wrong-day correction validation", () => {
  it("4. accepts a complete no-care original-date correction", () => {
    expect(validateWrongDayCorrection(input(), ctx())).toEqual([]);
  });

  it("5. requires a reason", () => {
    expect(validateWrongDayCorrection(input({ reason: "  " }), ctx())).toContain("reason");
  });

  it("6. requires an explicit final confirmation", () => {
    expect(validateWrongDayCorrection(input({ finalConfirmation: false }), ctx()))
      .toContain("finalConfirmation");
  });

  it("7. requires the administrator identity", () => {
    expect(validateWrongDayCorrection(input({ adminEmail: null }), ctx()))
      .toContain("administrator");
  });

  it("8. requires a corrected date, times and client confirmation for the new-date case", () => {
    const errs = validateWrongDayCorrection(input({ correctionCase: "no_care_new_date" }), ctx());
    expect(errs).toEqual(expect.arrayContaining(["newDate", "newStart", "newEnd", "clientInformed"]));
  });

  it("9. accepts a complete corrected-date correction", () => {
    const errs = validateWrongDayCorrection(
      input({
        correctionCase: "no_care_new_date",
        newDate: "2026-09-15",
        newStart: "09:00",
        newEnd: "12:00",
        clientInformed: true,
      }),
      ctx(),
    );
    expect(errs).toEqual([]);
  });

  it("10. requires care-delivered confirmation for the review case", () => {
    expect(
      validateWrongDayCorrection(
        input({ correctionCase: "care_delivered_review", careDelivered: false }),
        ctx(),
      ),
    ).toContain("careDelivered");
  });

  it("11. requires a caregiver when reassigning", () => {
    expect(validateWrongDayCorrection(input({ assignment: "reassign" }), ctx()))
      .toContain("newPswId");
  });

  it("12. blocks reactivation when a manual payment is already recorded", () => {
    expect(
      validateWrongDayCorrection(input(), ctx({ hasRecordedManualPayment: true })),
    ).toContain("manualPaymentRecorded");
    expect(MANUAL_PAYMENT_BLOCK_MESSAGE).toMatch(/manual payment/i);
  });

  it("13. still allows routing to review when a manual payment exists", () => {
    const errs = validateWrongDayCorrection(
      input({ correctionCase: "care_delivered_review", careDelivered: true }),
      ctx({ hasRecordedManualPayment: true }),
    );
    expect(errs).toEqual([]);
  });
});

describe("wrong-day correction outcome", () => {
  it("14. keeps the same booking and never charges or refunds", () => {
    const plan = planWrongDayCorrection(input(), ctx());
    expect(plan.keepsBookingId).toBe(true);
    expect(plan.createsDuplicateBooking).toBe(false);
    expect(plan.createsNewCharge).toBe(false);
    expect(plan.createsRefund).toBe(false);
  });

  it("15. voids but never deletes attendance, care sheet or earnings", () => {
    const plan = planWrongDayCorrection(input(), ctx());
    expect(plan.voidsAttendance).toBe(true);
    expect(plan.deletesAttendance).toBe(false);
    expect(plan.voidsCareSheet).toBe(true);
    expect(plan.deletesCareSheet).toBe(false);
    expect(plan.voidsEarnings).toBe(true);
  });

  it("16. keeps the assigned caregiver and returns the order to active", () => {
    const plan = planWrongDayCorrection(input({ assignment: "keep" }), ctx());
    expect(plan.assignedPswId).toBe("psw-1");
    expect(plan.newStatus).toBe("active");
  });

  it("17. unassigning returns the order to the pending job pool", () => {
    const plan = planWrongDayCorrection(input({ assignment: "unassign" }), ctx());
    expect(plan.assignedPswId).toBeNull();
    expect(plan.newStatus).toBe("pending");
  });

  it("18. reassigning moves the order to the chosen caregiver", () => {
    const plan = planWrongDayCorrection(
      input({ assignment: "reassign", newPswId: "psw-2" }),
      ctx(),
    );
    expect(plan.assignedPswId).toBe("psw-2");
    expect(plan.newStatus).toBe("active");
  });

  it("19. the care-delivered case changes nothing and only routes for review", () => {
    const plan = planWrongDayCorrection(
      input({ correctionCase: "care_delivered_review", careDelivered: true }),
      ctx(),
    );
    expect(plan.result).toBe("manual_review");
    expect(plan.newStatus).toBe("unchanged");
    expect(plan.voidsEarnings).toBe(false);
    expect(plan.voidsCareSheet).toBe(false);
  });

  it("20. the corrected-date case moves the schedule", () => {
    const plan = planWrongDayCorrection(
      input({ correctionCase: "no_care_new_date", newDate: "2026-09-15", newStart: "09:00", newEnd: "12:00", clientInformed: true }),
      ctx(),
    );
    expect(plan.scheduledDateChanged).toBe(true);
  });
});

describe("voided records are never treated as valid", () => {
  it("21. a voided care sheet is never sendable", () => {
    expect(isCareSheetSendable("submitted")).toBe(true);
    expect(isCareSheetSendable("voided")).toBe(false);
  });

  it("22. a voided earning is never payable", () => {
    expect(isEarningPayable("approved_for_manual_payment")).toBe(true);
    expect(isEarningPayable("voided")).toBe(false);
  });
});

describe("notifications and idempotency", () => {
  it("23. picks the right templates per outcome and repeats the same key", () => {
    const base = ctx();
    const keep = notificationTemplateIdsFor(planWrongDayCorrection(input(), base), base);
    expect(keep).toContain(WRONG_DAY_NOTIFICATION_TEMPLATES.client_appointment_corrected.id);
    expect(keep).toContain(WRONG_DAY_NOTIFICATION_TEMPLATES.psw_appointment_corrected.id);

    const pool = notificationTemplateIdsFor(
      planWrongDayCorrection(input({ assignment: "unassign" }), base),
      base,
    );
    expect(pool).toContain(WRONG_DAY_NOTIFICATION_TEMPLATES.job_returned_to_pool.id);

    const review = notificationTemplateIdsFor(
      planWrongDayCorrection(input({ correctionCase: "care_delivered_review", careDelivered: true }), base),
      base,
    );
    expect(review).toEqual([WRONG_DAY_NOTIFICATION_TEMPLATES.manual_review_required.id]);

    expect(buildCorrectionIdempotencyKey("b1", "n1")).toBe(
      buildCorrectionIdempotencyKey("b1", "n1"),
    );
    expect(buildCorrectionIdempotencyKey("b1", "n1")).not.toBe(
      buildCorrectionIdempotencyKey("b1", "n2"),
    );
  });
});

describe("database guarantees in the correction migration", () => {
  it("24. is admin-only, idempotent, locking, immutable and payment-safe", () => {
    expect(MIGRATION).toMatch(/IF NOT public\.is_admin\(\)/);
    expect(MIGRATION).toMatch(/FOR UPDATE/);
    expect(MIGRATION).toMatch(/idempotency_key/);
    expect(MIGRATION).toMatch(/manual_payment_recorded/);
    expect(MIGRATION).toMatch(/REVOKE ALL ON FUNCTION public\.admin_correct_wrong_day_attendance[\s\S]*anon/);
    expect(MIGRATION).toMatch(/ENABLE ROW LEVEL SECURITY/);
    // The correction never touches client money.
    expect(MIGRATION).not.toMatch(/stripe/i);
    expect(MIGRATION).not.toMatch(/INSERT INTO public\.bookings/i);
  });
});
