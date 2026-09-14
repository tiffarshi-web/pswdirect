import { describe, it, expect } from "vitest";
import {
  AUTOMATIC_PROVIDER_PAYOUTS_ENABLED,
  MANUAL_PAYOUT_NOTICE,
  PROVIDER_EARNING_STATUSES,
  isAdminOnlyEarningStatus,
  validateManualPaymentRecord,
  assertAutomaticPayoutsDisabled,
  earningStatusAfterShiftCompletion,
} from "@/lib/manualPayoutPolicy";

describe("manual provider payout policy", () => {
  it("keeps automatic provider payouts disabled", () => {
    expect(AUTOMATIC_PROVIDER_PAYOUTS_ENABLED).toBe(false);
    expect(() => assertAutomaticPayoutsDisabled()).not.toThrow();
  });

  it("supports the full office earning status model", () => {
    expect(PROVIDER_EARNING_STATUSES).toEqual([
      "pending_shift_completion",
      "pending_care_sheet",
      "pending_office_review",
      "approved_for_manual_payment",
      "disputed",
      "paid_manually",
      "voided",
    ]);
  });

  it("completing a shift never marks an earning paid", () => {
    expect(earningStatusAfterShiftCompletion(false)).toBe("pending_care_sheet");
    expect(earningStatusAfterShiftCompletion(true)).toBe("pending_office_review");
    expect(earningStatusAfterShiftCompletion(true)).not.toBe("paid_manually");
  });

  it("reserves approval, dispute, paid and void for administrators", () => {
    ["approved_for_manual_payment", "disputed", "paid_manually", "voided"].forEach((s) =>
      expect(isAdminOnlyEarningStatus(s)).toBe(true),
    );
    ["pending_shift_completion", "pending_care_sheet", "pending_office_review"].forEach((s) =>
      expect(isAdminOnlyEarningStatus(s)).toBe(false),
    );
  });

  it("requires amount, date, method and administrator on a manual payment", () => {
    expect(
      validateManualPaymentRecord({
        pswId: "psw-1",
        entryIds: ["e1"],
        finalAmount: 120,
        method: "e_transfer",
        paidAt: "2026-09-14",
        adminEmail: "office@pswdirect.ca",
      }),
    ).toEqual([]);

    expect(validateManualPaymentRecord({})).toEqual(
      expect.arrayContaining(["provider", "shifts", "finalAmount", "method", "paymentDate", "administrator"]),
    );

    expect(
      validateManualPaymentRecord({
        pswId: "psw-1",
        entryIds: ["e1"],
        finalAmount: 0,
        method: "cash",
        paidAt: "2026-09-14",
        adminEmail: "office@pswdirect.ca",
      }),
    ).toContain("finalAmount");
  });

  it("shows the manual-office payment message", () => {
    expect(MANUAL_PAYOUT_NOTICE).toBe(
      "Provider payments are reviewed and processed manually by the PSW Direct office.",
    );
  });
});
