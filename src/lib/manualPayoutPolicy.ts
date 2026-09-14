/**
 * Manual provider payout policy — permanent platform rule.
 *
 * PSW Direct never sends money to a provider automatically. The app may
 * calculate, display, approve and record provider earnings, but every payment
 * is reviewed and issued manually by the PSW Direct office.
 *
 * The server-side source of truth is the app_settings row
 * AUTOMATIC_PROVIDER_PAYOUTS_ENABLED (production value: false) and the
 * public.automatic_provider_payouts_enabled() database function.
 */

/** Client-side mirror of the server flag. Must remain false. */
export const AUTOMATIC_PROVIDER_PAYOUTS_ENABLED = false;

export const MANUAL_PAYOUT_NOTICE =
  "Provider payments are reviewed and processed manually by the PSW Direct office.";

/** The office earning lifecycle. Completing a shift never means "paid". */
export const PROVIDER_EARNING_STATUSES = [
  "pending_shift_completion",
  "pending_care_sheet",
  "pending_office_review",
  "approved_for_manual_payment",
  "disputed",
  "paid_manually",
  "voided",
] as const;

export type ProviderEarningStatus = (typeof PROVIDER_EARNING_STATUSES)[number];

/** Statuses only an authorized administrator may set. */
export const ADMIN_ONLY_EARNING_STATUSES: ProviderEarningStatus[] = [
  "approved_for_manual_payment",
  "disputed",
  "paid_manually",
  "voided",
];

export const isAdminOnlyEarningStatus = (s: string): boolean =>
  (ADMIN_ONLY_EARNING_STATUSES as string[]).includes(s);

export interface ManualPaymentRecord {
  pswId?: string | null;
  entryIds?: string[] | null;
  grossEarnings?: number | null;
  adjustments?: number | null;
  finalAmount?: number | null;
  method?: string | null;
  reference?: string | null;
  paidAt?: string | null;
  adminEmail?: string | null;
  note?: string | null;
}

/**
 * Field-level validation for recording a manual office payment.
 * Returns the list of missing/invalid fields (empty = valid).
 */
export const validateManualPaymentRecord = (r: ManualPaymentRecord): string[] => {
  const missing: string[] = [];
  if (!r.pswId) missing.push("provider");
  if (!r.entryIds || r.entryIds.length === 0) missing.push("shifts");
  if (r.finalAmount === null || r.finalAmount === undefined || !(r.finalAmount > 0))
    missing.push("finalAmount");
  if (!r.method) missing.push("method");
  if (!r.paidAt) missing.push("paymentDate");
  if (!r.adminEmail) missing.push("administrator");
  return missing;
};

/**
 * Guard used by any future payout code path. Automatic transfers are a
 * release blocker: this throws unless the flag has been deliberately enabled.
 */
export const assertAutomaticPayoutsDisabled = (): void => {
  if (AUTOMATIC_PROVIDER_PAYOUTS_ENABLED) {
    throw new Error(
      "Automatic provider payouts are disabled by policy. Payments are issued manually by the office.",
    );
  }
};

/** Completing a shift must never mark an earning as paid. */
export const earningStatusAfterShiftCompletion = (
  careSheetSubmitted: boolean,
): ProviderEarningStatus =>
  careSheetSubmitted ? "pending_office_review" : "pending_care_sheet";
