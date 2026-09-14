/**
 * Phase 5 — provider earnings statements, admin exports and the client-side
 * mirror of the server's manual-payment rules.
 *
 * Nothing here moves money. PSW Direct records payments that the office has
 * already issued outside the application.
 */

import type { ProviderEarningStatus } from "@/lib/manualPayoutPolicy";

export const STATEMENT_DISCLAIMER =
  "This statement records earnings and payments processed manually by the PSW Direct office. It is not proof of employment or tax advice.";

export const EARNINGS_REVIEW_NOTICE =
  "Earnings are reviewed and paid manually by the PSW Direct office.";

/** Mirror of public.is_valid_earning_transition. */
const TRANSITIONS: Record<ProviderEarningStatus, ProviderEarningStatus[]> = {
  pending_shift_completion: ["pending_care_sheet", "pending_office_review", "voided"],
  pending_care_sheet: ["pending_office_review", "disputed", "voided"],
  pending_office_review: ["approved_for_manual_payment", "disputed", "voided", "pending_care_sheet"],
  approved_for_manual_payment: ["paid_manually", "disputed", "voided", "pending_office_review"],
  disputed: ["pending_office_review", "approved_for_manual_payment", "voided"],
  paid_manually: ["disputed", "pending_office_review"],
  voided: ["pending_office_review"],
};

export const isValidEarningTransition = (
  from: ProviderEarningStatus | null | undefined,
  to: ProviderEarningStatus,
): boolean => {
  if (!from || from === to) return true;
  return (TRANSITIONS[from] ?? []).includes(to);
};

/** Office decisions that always require a written reason. */
export const REASON_REQUIRED_STATUSES: ProviderEarningStatus[] = ["disputed", "voided"];

export const reasonRequiredFor = (
  from: ProviderEarningStatus | null | undefined,
  to: ProviderEarningStatus,
): boolean =>
  REASON_REQUIRED_STATUSES.includes(to) || (from === "voided" && to === "pending_office_review");

/** Statuses that may never be included in a manual payment batch. */
export const UNPAYABLE_STATUSES: ProviderEarningStatus[] = [
  "voided",
  "disputed",
  "paid_manually",
  "pending_shift_completion",
  "pending_care_sheet",
  "pending_office_review",
];

export interface BatchEarning {
  entryId: string;
  providerId: string;
  status: ProviderEarningStatus | null;
  remainingCents: number;
  allocatedCents: number;
}

export interface BatchInput {
  providerId: string;
  earnings: BatchEarning[];
  totalCents: number;
  paidAt?: string | null;
  method?: string | null;
  adminEmail?: string | null;
  adjustmentReason?: string | null;
}

/** Client-side mirror of every manual-payment batch rule. Returns problems. */
export const validateManualPaymentBatch = (input: BatchInput): string[] => {
  const errors: string[] = [];
  if (!input.providerId) errors.push("A provider is required.");
  if (!input.earnings.length) errors.push("Select at least one approved earning.");
  if (!input.paidAt) errors.push("A payment date is required.");
  if (!input.method) errors.push("A payment method is required.");
  if (!input.adminEmail) errors.push("An administrator is required.");
  if (!Number.isInteger(input.totalCents)) errors.push("The amount must be a whole number of cents.");
  if (input.totalCents <= 0) errors.push("A recorded payment must be greater than zero.");

  const seen = new Set<string>();
  let allocated = 0;
  for (const e of input.earnings) {
    if (e.providerId !== input.providerId)
      errors.push("A payment may only include earnings from one provider.");
    if (seen.has(e.entryId)) errors.push("The same earning cannot be included twice.");
    seen.add(e.entryId);
    if (e.status && UNPAYABLE_STATUSES.includes(e.status))
      errors.push(`An earning with status ${e.status} cannot be paid.`);
    if (e.allocatedCents <= 0) errors.push("Each included earning needs an amount above zero.");
    if (e.allocatedCents > e.remainingCents)
      errors.push("An allocation cannot exceed the earning's remaining balance.");
    allocated += e.allocatedCents;
  }

  if (input.totalCents > allocated && !input.adjustmentReason)
    errors.push("A payment above the selected earnings needs a documented adjustment.");
  if (input.totalCents < allocated)
    errors.push("The payment amount is less than the amounts allocated to earnings.");

  return errors;
};

export const formatCents = (cents: number | null | undefined): string =>
  `$${((cents ?? 0) / 100).toFixed(2)}`;

export interface StatementRow {
  service_date: string | null;
  booking_code: string | null;
  service: string | null;
  hours: number | null;
  rate_cents: number | null;
  gross_cents: number | null;
  adjustments_cents: number | null;
  final_cents: number | null;
  earning_status: string | null;
  adjustment_note?: string | null;
  paid_at?: string | null;
  payment_method?: string | null;
  payment_reference?: string | null;
}

export interface StatementMeta {
  providerName: string;
  providerIdentifier: string;
  periodStart: string;
  periodEnd: string;
  generatedAt?: string;
}

export interface StatementTotals {
  pending: number;
  approved: number;
  disputed: number;
  paid: number;
}

export const statementTotals = (rows: StatementRow[]): StatementTotals =>
  rows.reduce<StatementTotals>(
    (t, r) => {
      const amount = r.final_cents ?? 0;
      if (r.earning_status === "paid_manually") t.paid += amount;
      else if (r.earning_status === "disputed") t.disputed += amount;
      else if (r.earning_status === "approved_for_manual_payment") t.approved += amount;
      else t.pending += amount;
      return t;
    },
    { pending: 0, approved: 0, disputed: 0, paid: 0 },
  );

const csvCell = (value: unknown): string => {
  const s = value == null ? "" : String(value);
  // Neutralise spreadsheet formula injection.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return `"${safe.replace(/"/g, '""')}"`;
};

export const toCsv = (headers: string[], rows: (unknown[])[]): string =>
  [headers.map(csvCell).join(","), ...rows.map((r) => r.map(csvCell).join(","))].join("\r\n");

export const buildStatementCsv = (rows: StatementRow[], meta: StatementMeta): string => {
  const totals = statementTotals(rows);
  const generated = meta.generatedAt ?? new Date().toISOString().slice(0, 10);
  const head = [
    ["PSW Direct"],
    ["Provider", meta.providerName],
    ["Provider ID", meta.providerIdentifier],
    ["Statement period", `${meta.periodStart} to ${meta.periodEnd}`],
    ["Generated", generated],
    [],
  ]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");

  const table = toCsv(
    [
      "Service date",
      "Booking reference",
      "Service",
      "Hours",
      "Rate",
      "Earning",
      "Adjustments",
      "Total",
      "Status",
      "Payment recorded",
      "Payment method",
      "Payment reference",
    ],
    rows.map((r) => [
      r.service_date ?? "",
      r.booking_code ?? "",
      r.service ?? "",
      r.hours ?? "",
      formatCents(r.rate_cents),
      formatCents(r.gross_cents),
      formatCents(r.adjustments_cents),
      formatCents(r.final_cents),
      r.earning_status ?? "",
      r.paid_at ? String(r.paid_at).slice(0, 10) : "",
      r.payment_method ?? "",
      r.payment_reference ?? "",
    ]),
  );

  const foot = [
    [],
    ["Total pending", formatCents(totals.pending)],
    ["Total approved", formatCents(totals.approved)],
    ["Total disputed", formatCents(totals.disputed)],
    ["Total paid manually", formatCents(totals.paid)],
    [],
    [STATEMENT_DISCLAIMER],
  ]
    .map((r) => r.map(csvCell).join(","))
    .join("\r\n");

  return `${head}\r\n${table}\r\n${foot}\r\n`;
};

export const downloadTextFile = (filename: string, content: string, mime = "text/csv") => {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/** Builds and downloads the PDF statement. Kept out of the test path. */
export const downloadStatementPdf = async (rows: StatementRow[], meta: StatementMeta) => {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const totals = statementTotals(rows);
  const generated = meta.generatedAt ?? new Date().toISOString().slice(0, 10);
  let y = 48;

  doc.setFontSize(16);
  doc.text("PSW Direct", 48, y);
  y += 22;
  doc.setFontSize(11);
  doc.text(`Provider: ${meta.providerName} (${meta.providerIdentifier})`, 48, y);
  y += 16;
  doc.text(`Statement period: ${meta.periodStart} to ${meta.periodEnd}`, 48, y);
  y += 16;
  doc.text(`Generated: ${generated}`, 48, y);
  y += 24;

  doc.setFontSize(9);
  doc.text("Date", 48, y);
  doc.text("Reference", 115, y);
  doc.text("Service", 200, y);
  doc.text("Hrs", 350, y);
  doc.text("Total", 390, y);
  doc.text("Status", 450, y);
  y += 12;

  rows.forEach((r) => {
    if (y > 720) {
      doc.addPage();
      y = 48;
    }
    doc.text(String(r.service_date ?? ""), 48, y);
    doc.text(String(r.booking_code ?? "—"), 115, y);
    doc.text(String(r.service ?? "").slice(0, 34), 200, y);
    doc.text(String(r.hours ?? ""), 350, y);
    doc.text(formatCents(r.final_cents), 390, y);
    doc.text(String(r.earning_status ?? "").replace(/_/g, " "), 450, y);
    y += 13;
  });

  y += 14;
  doc.setFontSize(10);
  doc.text(`Total pending: ${formatCents(totals.pending)}`, 48, y); y += 14;
  doc.text(`Total approved: ${formatCents(totals.approved)}`, 48, y); y += 14;
  doc.text(`Total disputed: ${formatCents(totals.disputed)}`, 48, y); y += 14;
  doc.text(`Total paid manually: ${formatCents(totals.paid)}`, 48, y); y += 22;

  doc.setFontSize(8);
  doc.splitTextToSize(STATEMENT_DISCLAIMER, 500).forEach((line: string) => {
    doc.text(line, 48, y);
    y += 11;
  });

  doc.save(`psw-direct-statement-${meta.periodStart}-${meta.periodEnd}.pdf`);
};

/** Fields that must never appear in a provider statement or an admin export. */
export const PROTECTED_STATEMENT_FIELDS = [
  "client_address",
  "address",
  "care_instructions",
  "care_sheet",
  "diagnosis",
  "health_conditions",
  "photos",
  "client_phone",
  "client_email",
  "bank_account",
  "transit_number",
  "institution_number",
];

export const containsProtectedField = (row: Record<string, unknown>): boolean =>
  Object.keys(row).some((k) => PROTECTED_STATEMENT_FIELDS.includes(k.toLowerCase()));
