import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { execSync } from "node:child_process";
import {
  isValidEarningTransition, reasonRequiredFor, validateManualPaymentBatch,
  buildStatementCsv, statementTotals, containsProtectedField, STATEMENT_DISCLAIMER,
  UNPAYABLE_STATUSES, toCsv, formatCents,
} from "@/lib/earningsStatements";
import {
  AUTOMATIC_PROVIDER_PAYOUTS_ENABLED, PROVIDER_EARNING_STATUSES,
  validateManualPaymentRecord, earningStatusAfterShiftCompletion,
} from "@/lib/manualPayoutPolicy";

/**
 * Phase 5 — manual provider earnings and payment recording.
 *
 * The application calculates, reviews and records. It never sends money.
 */

const migrationsDir = resolve(process.cwd(), "supabase/migrations");
const allMigrations = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .map((f) => readFileSync(resolve(migrationsDir, f), "utf8"))
  .join("\n");

const grep = (pattern: string, paths: string): string => {
  try {
    return execSync(
      `grep -rIn -E "${pattern}" ${paths} --exclude-dir=__tests__ --exclude=manualPayoutPolicy.ts || true`,
      { encoding: "utf8" },
    );
  } catch {
    return "";
  }
};

describe("Phase 5 · earning creation", () => {
  it("1. creates an earning only from a valid completed visit", () => {
    expect(allMigrations).toContain("b.checked_in_at IS NULL");
    expect(allMigrations).toContain("b.signed_out_at IS NULL");
    expect(allMigrations).toMatch(/care_sheet_status, ''\) NOT IN \('submitted'/);
    expect(allMigrations).toContain("COALESCE(b.is_test_data, false) = true");
  });

  it("2. cannot create a duplicate earning for the same visit", () => {
    expect(allMigrations).toContain("ON CONFLICT (shift_id) DO UPDATE");
  });

  it("3. keeps the client price separate from the provider rate", () => {
    expect(allMigrations).toContain("Provider rate is NEVER derived from the client price");
    expect(allMigrations).toContain("b.psw_pay_rate");
  });

  it("4. makes the provider rate snapshot immutable", () => {
    expect(allMigrations).toContain("guard_compensation_snapshot_immutable");
    expect(allMigrations).toContain("compensation snapshot is immutable");
  });

  it("5. never overwrites an office decision with a recalculation", () => {
    expect(allMigrations).toMatch(/earning_status IN \(\s*'approved_for_manual_payment','paid_manually','disputed','voided'\)\s*THEN\s*RETURN;/);
  });

  it("completing a visit never marks an earning paid", () => {
    expect(earningStatusAfterShiftCompletion(true)).toBe("pending_office_review");
    expect(earningStatusAfterShiftCompletion(false)).toBe("pending_care_sheet");
  });
});

describe("Phase 5 · status transitions", () => {
  it("uses the approved seven-status model", () => {
    expect(PROVIDER_EARNING_STATUSES).toEqual([
      "pending_shift_completion", "pending_care_sheet", "pending_office_review",
      "approved_for_manual_payment", "disputed", "paid_manually", "voided",
    ]);
  });

  it("6. a pending earning cannot jump straight to paid", () => {
    expect(isValidEarningTransition("pending_office_review", "paid_manually")).toBe(false);
    expect(UNPAYABLE_STATUSES).toContain("pending_office_review");
  });

  it("7. a disputed earning cannot be paid", () => {
    expect(isValidEarningTransition("disputed", "paid_manually")).toBe(false);
    expect(UNPAYABLE_STATUSES).toContain("disputed");
  });

  it("8. a voided earning cannot be paid", () => {
    expect(isValidEarningTransition("voided", "paid_manually")).toBe(false);
    expect(UNPAYABLE_STATUSES).toContain("voided");
  });

  it("9. an already paid earning cannot be paid again", () => {
    expect(isValidEarningTransition("paid_manually", "paid_manually")).toBe(true); // no-op only
    expect(UNPAYABLE_STATUSES).toContain("paid_manually");
    const errors = validateManualPaymentBatch({
      providerId: "p1",
      earnings: [{ entryId: "e1", providerId: "p1", status: "paid_manually", remainingCents: 5000, allocatedCents: 5000 }],
      totalCents: 5000, paidAt: "2026-09-14", method: "e_transfer", adminEmail: "office@pswdirect.ca",
    });
    expect(errors.join(" ")).toContain("paid_manually");
  });

  it("requires a reason to dispute, void or reopen", () => {
    expect(reasonRequiredFor("pending_office_review", "disputed")).toBe(true);
    expect(reasonRequiredFor("pending_office_review", "voided")).toBe(true);
    expect(reasonRequiredFor("voided", "pending_office_review")).toBe(true);
    expect(reasonRequiredFor("pending_office_review", "approved_for_manual_payment")).toBe(false);
  });

  it("enforces the same rules in the database", () => {
    expect(allMigrations).toContain("is_valid_earning_transition");
    expect(allMigrations).toContain("Invalid earning status transition");
    expect(allMigrations).toContain("A reason is required to dispute or void an earning.");
  });
});

describe("Phase 5 · provider restrictions", () => {
  it("10. providers cannot approve their own earnings", () => {
    expect(allMigrations).toContain("Only an administrator may set provider earning status to");
  });

  it("11. providers cannot change an earning amount", () => {
    expect(allMigrations).toContain("Only an administrator may change a provider earning amount");
  });

  it("12. providers cannot mark themselves paid", () => {
    expect(allMigrations).toContain("cannot be marked paid manually without a recorded manual payout");
  });

  it("providers have no cash out or withdraw affordance", () => {
    expect(grep("Cash ?Out|Withdraw Funds|Withdraw Earnings|Instant Payout", "src").trim()).toBe("");
  });
});

describe("Phase 5 · manual payment batch", () => {
  const base = {
    providerId: "p1",
    earnings: [{ entryId: "e1", providerId: "p1", status: "approved_for_manual_payment" as const, remainingCents: 8400, allocatedCents: 8400 }],
    totalCents: 8400,
    paidAt: "2026-09-14",
    method: "e_transfer",
    adminEmail: "office@pswdirect.ca",
  };

  it("accepts a well-formed batch", () => {
    expect(validateManualPaymentBatch(base)).toEqual([]);
  });

  it("13. requires amount, date, method and administrator", () => {
    expect(validateManualPaymentRecord({})).toEqual(
      expect.arrayContaining(["provider", "shifts", "finalAmount", "method", "paymentDate", "administrator"]),
    );
    expect(validateManualPaymentBatch({ ...base, paidAt: null, method: null, adminEmail: null }).length).toBe(3);
  });

  it("14. calls no Stripe or bank API anywhere in the payout path", () => {
    expect(grep("transfers\\.create|payouts\\.create|accounts\\.create|accountLinks\\.create|connect/accounts|v1/transfers", "src supabase/functions").trim()).toBe("");
  });

  it("15. rejects earnings from more than one provider", () => {
    const errors = validateManualPaymentBatch({
      ...base,
      earnings: [...base.earnings, { entryId: "e2", providerId: "p2", status: "approved_for_manual_payment", remainingCents: 100, allocatedCents: 100 }],
      totalCents: 8500,
    });
    expect(errors.join(" ")).toContain("one provider");
    expect(allMigrations).toContain("A payment may only include earnings from one provider");
  });

  it("16. payment totals must match linked earnings unless an adjustment explains it", () => {
    expect(validateManualPaymentBatch({ ...base, totalCents: 9000 }).join(" ")).toContain("documented adjustment");
    expect(validateManualPaymentBatch({ ...base, totalCents: 9000, adjustmentReason: "travel allowance" })).toEqual([]);
    expect(validateManualPaymentBatch({ ...base, totalCents: 8000 }).join(" ")).toContain("less than the amounts allocated");
  });

  it("rejects zero, negative and duplicate allocations", () => {
    expect(validateManualPaymentBatch({ ...base, totalCents: 0 }).join(" ")).toContain("greater than zero");
    expect(validateManualPaymentBatch({
      ...base,
      earnings: [base.earnings[0], { ...base.earnings[0] }],
      totalCents: 16800,
    }).join(" ")).toContain("twice");
    expect(allMigrations).toContain("This earning is already linked to that payment");
  });

  it("18. keeps disputed and voided earnings out of payment batches at database level", () => {
    expect(allMigrations).toContain("earning cannot be included in a manual payment");
  });
});

describe("Phase 5 · corrections and disputes", () => {
  it("17. corrections preserve the original payment record", () => {
    expect(allMigrations).toContain("payout_corrections");
    expect(allMigrations).toContain("Payment correction history is immutable");
    expect(allMigrations).toContain("original_payout_id");
    expect(allMigrations).toContain("A reason is required to correct a payment record.");
  });

  it("records when money must still be recovered outside the app", () => {
    expect(allMigrations).toContain("external_action_required");
  });

  it("keeps internal investigation notes away from providers", () => {
    expect(allMigrations).toContain("earning_internal_notes");
    expect(allMigrations).toContain('CREATE POLICY "Admins read internal earning notes"');
  });
});

describe("Phase 5 · office review queue and reconciliation", () => {
  it("exposes the queue only to administrators", () => {
    expect(allMigrations).toContain("admin_earning_review_queue");
    expect(allMigrations).toMatch(/REVOKE ALL ON FUNCTION public\.admin_earning_review_queue\(\) FROM PUBLIC, anon/);
  });

  it("flags every required reconciliation discrepancy", () => {
    for (const issue of [
      "paid_without_payout", "payout_without_earnings", "amount_mismatch", "duplicate_link",
      "incomplete_payment_record", "invalid_earning_linked", "provider_mismatch", "orphan_correction",
    ]) {
      expect(allMigrations).toContain(issue);
    }
  });
});

describe("Phase 5 · statements and exports", () => {
  const rows = [
    { service_date: "2026-09-01", booking_code: "CDT-000500", service: "Standard Home Care", hours: 4,
      rate_cents: 2100, gross_cents: 8400, adjustments_cents: 0, final_cents: 8400,
      earning_status: "paid_manually", paid_at: "2026-09-05T12:00:00Z", payment_method: "e_transfer",
      payment_reference: "ET-1234" },
    { service_date: "2026-09-08", booking_code: "CDT-000501", service: "Doctor Visit", hours: 3,
      rate_cents: 2700, gross_cents: 8100, adjustments_cents: 500, final_cents: 8600,
      earning_status: "pending_office_review", paid_at: null, payment_method: null, payment_reference: null },
  ];
  const meta = { providerName: "Jane Doe", providerIdentifier: "PSW-1042", periodStart: "2026-09-01", periodEnd: "2026-09-30", generatedAt: "2026-09-14" };

  it("20. a provider reads only their own statement", () => {
    expect(allMigrations).toContain("psw_earnings_statement");
    expect(allMigrations).toMatch(/SELECT id INTO v_psw FROM public\.psw_profiles/);
    expect(allMigrations).toMatch(/REVOKE ALL ON FUNCTION public\.psw_earnings_statement\(date, date\) FROM PUBLIC, anon/);
  });

  it("21. statements exclude protected client information", () => {
    const csv = buildStatementCsv(rows, meta);
    expect(containsProtectedField(rows[0])).toBe(false);
    expect(csv.toLowerCase()).not.toContain("address");
    expect(csv.toLowerCase()).not.toContain("care instructions");
    expect(csv.toLowerCase()).not.toContain("diagnosis");
  });

  it("includes every required statement field and the disclaimer", () => {
    const csv = buildStatementCsv(rows, meta);
    for (const needle of ["PSW Direct", "Jane Doe", "PSW-1042", "2026-09-01", "CDT-000500",
      "Total pending", "Total approved", "Total disputed", "Total paid manually", STATEMENT_DISCLAIMER]) {
      expect(csv).toContain(needle);
    }
  });

  it("totals earnings by status", () => {
    const totals = statementTotals(rows);
    expect(totals.paid).toBe(8400);
    expect(totals.pending).toBe(8600);
    expect(formatCents(totals.paid)).toBe("$84.00");
  });

  it("22. admin exports are produced from an admin-only query and neutralise formula injection", () => {
    expect(toCsv(["a"], [["=cmd()"]])).toContain("'=cmd()");
    expect(allMigrations).toContain("admin_manual_payout_reconciliation");
  });
});

describe("Phase 5 · wrong-day, refunds and platform rules", () => {
  it("23. wrong-day voided earnings stay unpayable", () => {
    expect(isValidEarningTransition("voided", "paid_manually")).toBe(false);
    expect(allMigrations).toContain("admin_correct_wrong_day_attendance");
  });

  it("24. a client refund never rewrites provider payment history", () => {
    expect(allMigrations).toContain("COALESCE(b.was_refunded, false) = true");
    expect(allMigrations).toContain("Payment correction history is immutable");
  });

  it("25. automatic provider payouts remain disabled", () => {
    expect(AUTOMATIC_PROVIDER_PAYOUTS_ENABLED).toBe(false);
    expect(allMigrations).toContain("automatic_provider_payouts_enabled");
  });

  it("never describes provider payment as automatic or instant", () => {
    expect(grep("paid (automatically|instantly)|instant(ly)? paid|automatic(ally)? pa(id|yout|yment) to (the )?(psw|provider|nurse)", "src supabase/functions").trim()).toBe("");
  });
});
