/**
 * Wrong-day attendance correction — client-side rules.
 *
 * A caregiver can accidentally arrive and sign in on the wrong calendar day.
 * The office then needs to void that attendance and put the SAME paid booking
 * back on the correct date. This module holds the pure rules the admin UI and
 * the tests share; the authoritative enforcement lives in the database
 * function public.admin_correct_wrong_day_attendance (office admins only).
 *
 * Money rules: the original client payment is never touched. No new charge,
 * no refund, no duplicate booking, and never an automatic provider payout.
 */

export const WRONG_DAY_CASES = [
  "no_care_original_date",
  "no_care_new_date",
  "care_delivered_review",
] as const;

export type WrongDayCase = (typeof WRONG_DAY_CASES)[number];

export type WrongDayAssignment = "keep" | "unassign" | "reassign";

export interface WrongDayBookingContext {
  bookingId: string;
  bookingCode?: string | null;
  status: string | null;
  checkedInAt?: string | null;
  signedOutAt?: string | null;
  careSheetStatus?: string | null;
  hasCareSheet?: boolean;
  assignedPswId?: string | null;
  /** True when a manual office payment already covers this shift. */
  hasRecordedManualPayment?: boolean;
}

export interface WrongDayCorrectionInput {
  correctionCase: WrongDayCase;
  reason: string;
  adminNotes?: string;
  careDelivered: boolean;
  newDate?: string | null;
  newStart?: string | null;
  newEnd?: string | null;
  clientInformed: boolean;
  assignment: WrongDayAssignment;
  newPswId?: string | null;
  adminEmail?: string | null;
  finalConfirmation: boolean;
}

/** The action is only offered when there is attendance activity to correct. */
export const hasAttendanceActivity = (b: WrongDayBookingContext): boolean =>
  !!b.checkedInAt ||
  !!b.signedOutAt ||
  b.status === "in-progress" ||
  b.status === "completed";

export const isCorrectionAvailable = (b: WrongDayBookingContext): boolean =>
  hasAttendanceActivity(b) && b.status !== "cancelled";

export const MANUAL_PAYMENT_BLOCK_MESSAGE =
  "A manual payment has already been recorded for this shift. Resolve the payment record through the manual payout correction process before reactivating this order.";

/** Returns the list of problems; empty means the correction may be submitted. */
export const validateWrongDayCorrection = (
  input: WrongDayCorrectionInput,
  ctx: WrongDayBookingContext,
): string[] => {
  const errors: string[] = [];

  if (!WRONG_DAY_CASES.includes(input.correctionCase)) errors.push("case");
  if (!input.reason || input.reason.trim() === "") errors.push("reason");
  if (!input.adminEmail) errors.push("administrator");
  if (!input.finalConfirmation) errors.push("finalConfirmation");

  if (input.correctionCase === "care_delivered_review" && !input.careDelivered) {
    errors.push("careDelivered");
  }
  if (input.correctionCase !== "care_delivered_review" && input.careDelivered) {
    errors.push("careDelivered");
  }

  if (input.correctionCase === "no_care_new_date") {
    if (!input.newDate) errors.push("newDate");
    if (!input.newStart) errors.push("newStart");
    if (!input.newEnd) errors.push("newEnd");
    if (!input.clientInformed) errors.push("clientInformed");
  }

  if (input.assignment === "reassign" && !input.newPswId) errors.push("newPswId");

  if (
    ctx.hasRecordedManualPayment &&
    input.correctionCase !== "care_delivered_review"
  ) {
    errors.push("manualPaymentRecorded");
  }

  return errors;
};

export interface WrongDayPlannedOutcome {
  /** 'reactivated' keeps the booking; 'manual_review' only routes for review. */
  result: "reactivated" | "manual_review";
  newStatus: "active" | "pending" | "unchanged";
  keepsBookingId: true;
  createsDuplicateBooking: false;
  createsNewCharge: false;
  createsRefund: false;
  voidsAttendance: boolean;
  deletesAttendance: false;
  voidsCareSheet: boolean;
  deletesCareSheet: false;
  voidsEarnings: boolean;
  scheduledDateChanged: boolean;
  assignedPswId: string | null;
}

export const planWrongDayCorrection = (
  input: WrongDayCorrectionInput,
  ctx: WrongDayBookingContext,
): WrongDayPlannedOutcome => {
  if (input.correctionCase === "care_delivered_review") {
    return {
      result: "manual_review",
      newStatus: "unchanged",
      keepsBookingId: true,
      createsDuplicateBooking: false,
      createsNewCharge: false,
      createsRefund: false,
      voidsAttendance: false,
      deletesAttendance: false,
      voidsCareSheet: false,
      deletesCareSheet: false,
      voidsEarnings: false,
      scheduledDateChanged: false,
      assignedPswId: ctx.assignedPswId ?? null,
    };
  }

  const assignedPswId =
    input.assignment === "unassign"
      ? null
      : input.assignment === "reassign"
        ? (input.newPswId ?? null)
        : (ctx.assignedPswId ?? null);

  return {
    result: "reactivated",
    newStatus: assignedPswId ? "active" : "pending",
    keepsBookingId: true,
    createsDuplicateBooking: false,
    createsNewCharge: false,
    createsRefund: false,
    voidsAttendance: true,
    deletesAttendance: false,
    voidsCareSheet: !!ctx.hasCareSheet || ctx.careSheetStatus === "submitted",
    deletesCareSheet: false,
    voidsEarnings: true,
    scheduledDateChanged: input.correctionCase === "no_care_new_date",
    assignedPswId,
  };
};

/** A voided care sheet must never be delivered to the client as a visit report. */
export const isCareSheetSendable = (careSheetStatus?: string | null): boolean =>
  careSheetStatus === "submitted";

/** Voided earnings never count toward anything payable. */
export const isEarningPayable = (earningStatus?: string | null): boolean =>
  earningStatus === "approved_for_manual_payment" ||
  earningStatus === "pending_office_review";

export const WRONG_DAY_NOTIFICATION_TEMPLATES = {
  client_appointment_corrected: {
    id: "wrong_day_client_appointment_corrected",
    subject: "Your PSW Direct appointment has been corrected",
    body: `Hi {{client_first_name}},

We've corrected the date of your visit {{booking_code}}. Your appointment is now scheduled for {{new_date}} at {{new_time}}.

Your original payment stays exactly as it was — you have not been charged again and no refund was needed.

Questions? Call us at {{office_number}}.

The PSW Direct Team`,
  },
  psw_appointment_corrected: {
    id: "wrong_day_psw_appointment_corrected",
    subject: "Visit date corrected — {{booking_code}}",
    body: `Hi {{psw_first_name}},

The office has corrected the date for visit {{booking_code}}. It is now scheduled for {{new_date}} at {{new_time}} and appears again under your Upcoming Jobs. Please sign in on that date.

Earnings are reviewed and paid manually by the PSW Direct office.

The PSW Direct Team`,
  },
  job_returned_to_pool: {
    id: "wrong_day_job_returned_to_pool",
    subject: "Visit {{booking_code}} has been returned to the job pool",
    body: `Hi {{psw_first_name}},

Visit {{booking_code}} has been removed from your schedule by the office and returned to the available job pool.

The PSW Direct Team`,
  },
  new_psw_assigned: {
    id: "wrong_day_new_psw_assigned",
    subject: "New visit assigned — {{booking_code}}",
    body: `Hi {{psw_first_name}},

You have been assigned visit {{booking_code}} on {{new_date}} at {{new_time}}.

Earnings are reviewed and paid manually by the PSW Direct office.

The PSW Direct Team`,
  },
  manual_review_required: {
    id: "wrong_day_manual_review_required",
    subject: "Wrong-day review required — {{booking_code}}",
    body: `Care may have been delivered on a different date for {{booking_code}}. This order needs office review of the actual service date, care sheet and provider earnings before anything is changed.`,
  },
  manual_payment_conflict: {
    id: "wrong_day_manual_payment_conflict",
    subject: "Manual payment conflict — {{booking_code}}",
    body: `${MANUAL_PAYMENT_BLOCK_MESSAGE}`,
  },
} as const;

export const notificationTemplateIdsFor = (
  outcome: WrongDayPlannedOutcome,
  ctx: WrongDayBookingContext,
): string[] => {
  if (outcome.result === "manual_review") {
    return [WRONG_DAY_NOTIFICATION_TEMPLATES.manual_review_required.id];
  }
  const ids: string[] = [WRONG_DAY_NOTIFICATION_TEMPLATES.client_appointment_corrected.id];
  if (!outcome.assignedPswId) {
    ids.push(WRONG_DAY_NOTIFICATION_TEMPLATES.job_returned_to_pool.id);
  } else if (outcome.assignedPswId !== (ctx.assignedPswId ?? null)) {
    ids.push(WRONG_DAY_NOTIFICATION_TEMPLATES.new_psw_assigned.id);
  } else {
    ids.push(WRONG_DAY_NOTIFICATION_TEMPLATES.psw_appointment_corrected.id);
  }
  return ids;
};

/**
 * Stable per-attempt key. The same dialog submission (even retried after a
 * refresh or a double click) produces the same key, so the database applies
 * the correction exactly once.
 */
export const buildCorrectionIdempotencyKey = (
  bookingId: string,
  attemptNonce: string,
): string => `wrongday:${bookingId}:${attemptNonce}`;
