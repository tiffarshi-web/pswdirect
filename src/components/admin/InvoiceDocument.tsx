// Invoice Document Renderer — generates viewable/printable invoice HTML
// Uses stored pricing snapshot data, never recalculates
// Supports: Private Pay, Insurance, VAC (Veterans Affairs Canada)

import { BUSINESS_CONTACT } from "@/lib/contactConfig";

export interface InvoiceData {
  invoiceNumber: string;
  bookingCode: string;
  bookingId: string;
  createdAt: string;
  documentStatus: "paid" | "cancelled" | "partially_refunded" | "refunded" | "invoice-pending";

  // Client
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientAddress?: string;

  // Service
  serviceType: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  pswName?: string;
  serviceItems?: string[];

  // Pricing (from snapshot — never recalculated)
  subtotal: number;
  rushAmount: number;
  surgeAmount: number;
  taxAmount: number;
  total: number;
  currency: string;

  // Payment
  paymentStatus: string;
  stripePaymentIntentId?: string;

  // Refund
  refundAmount?: number;
  refundStatus?: string;
  refundDate?: string;

  // Third-party payer metadata
  payerType?: string;
  payerName?: string;
  thirdPartyPayerMode?: string;
  // VAC
  vacProgramOfChoice?: string;
  vacProviderNumber?: string;
  vacBenefitCode?: string;
  vacServiceType?: string;
  veteranKNumber?: string;
  vacAuthorizationNumber?: string;
  vacStatus?: string;
  // Insurance
  insuranceMemberId?: string;
  insuranceClaimNumber?: string;
  insuranceGroupNumber?: string;
  clientDateOfBirth?: string;
}

const formatTime12 = (t: string): string => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

const statusLabel = (s: string): { text: string; bg: string; color: string } => {
  switch (s) {
    case "paid": return { text: "PAID", bg: "#f0fdf4", color: "#166534" };
    case "cancelled": return { text: "CANCELLED", bg: "#fef2f2", color: "#991b1b" };
    case "partially_refunded": return { text: "PARTIALLY REFUNDED", bg: "#fffbeb", color: "#92400e" };
    case "refunded": return { text: "REFUNDED", bg: "#fef2f2", color: "#991b1b" };
    case "invoice-pending": return { text: "PENDING PAYMENT", bg: "#fffbeb", color: "#92400e" };
    default: return { text: (s || "UNKNOWN").toUpperCase(), bg: "#f3f4f6", color: "#374151" };
  }
};

const generateVACSection = (data: InvoiceData): string => {
  if (data.thirdPartyPayerMode !== "veterans-affairs") return "";
  return `
  <hr class="divider" />
  <div class="section-title">Veterans Affairs Canada (VIP) Details</div>
  <div class="info-grid">
    <div class="info-block"><label>Payer</label><p>Veterans Affairs Canada</p></div>
    <div class="info-block"><label>Program of Choice</label><p>${data.vacProgramOfChoice || "15"}</p></div>
    <div class="info-block"><label>Provider Number</label><p>${data.vacProviderNumber || "100146"}</p></div>
    <div class="info-block"><label>Veteran K#</label><p>${data.veteranKNumber || "To be provided"}</p></div>
    ${data.vacAuthorizationNumber ? `<div class="info-block"><label>Authorization Number</label><p>${data.vacAuthorizationNumber}</p></div>` : ""}
    ${data.vacBenefitCode ? `<div class="info-block"><label>Benefit Code</label><p>${data.vacBenefitCode}</p></div>` : ""}
    ${data.vacServiceType ? `<div class="info-block"><label>VAC Service Type</label><p>${data.vacServiceType.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}</p></div>` : ""}
    ${data.vacStatus ? `<div class="info-block"><label>VAC Status</label><p style="text-transform:uppercase;font-weight:600;color:${data.vacStatus === "provisional" ? "#92400e" : "#166534"}">${data.vacStatus}</p></div>` : ""}
  </div>`;
};

const generateInsuranceSection = (data: InvoiceData): string => {
  const insuranceModes = ["blue-cross", "sun-life", "canada-life", "other-third-party"];
  if (!data.thirdPartyPayerMode || !insuranceModes.includes(data.thirdPartyPayerMode)) return "";
  return `
  <hr class="divider" />
  <div class="section-title">Insurance / Third-Party Payer Details</div>
  <div class="info-grid">
    <div class="info-block"><label>Payer</label><p>${data.payerName || data.thirdPartyPayerMode}</p></div>
    <div class="info-block"><label>Provider Number</label><p>${data.vacProviderNumber || "100146"}</p></div>
    <div class="info-block"><label>Benefit Code</label><p>${data.vacBenefitCode || "345503"}</p></div>
    <div class="info-block"><label>Veteran K#</label><p>${data.veteranKNumber || "To be provided"}</p></div>
    ${data.insuranceClaimNumber ? `<div class="info-block"><label>Policy / Claim #</label><p>${data.insuranceClaimNumber}</p></div>` : ""}
    ${data.insuranceMemberId ? `<div class="info-block"><label>Member ID</label><p>${data.insuranceMemberId}</p></div>` : ""}
    ${data.insuranceGroupNumber ? `<div class="info-block"><label>Group Number</label><p>${data.insuranceGroupNumber}</p></div>` : ""}
    ${data.clientDateOfBirth ? `<div class="info-block"><label>Client Date of Birth</label><p>${new Date(data.clientDateOfBirth + "T00:00:00").toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p></div>` : ""}
  </div>`;
};

export const generateInvoiceHtml = (data: InvoiceData): string => {
  const status = statusLabel(data.documentStatus);
  const netPaid = data.total - (data.refundAmount || 0);
  const isThirdParty = data.thirdPartyPayerMode && data.thirdPartyPayerMode !== "private-pay";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Invoice ${data.invoiceNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #fff; }
  .invoice { max-width: 680px; margin: 0 auto; padding: 40px 32px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .brand h1 { font-size: 24px; color: #1a1a2e; margin-bottom: 4px; }
  .brand p { font-size: 12px; color: #6b7280; line-height: 1.5; }
  .inv-meta { text-align: right; }
  .inv-meta .inv-num { font-size: 18px; font-weight: 700; color: #1a1a2e; }
  .inv-meta .inv-date { font-size: 12px; color: #6b7280; margin-top: 4px; }
  .status-badge { display: inline-block; padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 700; letter-spacing: 0.5px; background: ${status.bg}; color: ${status.color}; border: 1px solid ${status.color}30; margin-top: 8px; }
  .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .section-title { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #9ca3af; font-weight: 600; margin-bottom: 12px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
  .info-block label { display: block; font-size: 11px; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  .info-block p { font-size: 14px; color: #1f2937; }
  table.pricing { width: 100%; border-collapse: collapse; margin: 16px 0; }
  table.pricing td { padding: 10px 0; font-size: 14px; }
  table.pricing td:last-child { text-align: right; font-variant-numeric: tabular-nums; }
  table.pricing tr.total td { border-top: 2px solid #1a1a2e; font-weight: 700; font-size: 16px; padding-top: 14px; }
  table.pricing tr.refund td { color: #dc2626; }
  table.pricing tr.net td { border-top: 1px solid #e5e7eb; font-weight: 700; color: #166534; }
  .payment-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 24px 0; }
  .payment-box .row { display: flex; justify-content: space-between; font-size: 13px; color: #4b5563; margin-bottom: 4px; }
  .payment-box .row:last-child { margin-bottom: 0; }
  .footer { text-align: center; margin-top: 40px; padding-top: 24px; border-top: 1px solid #e5e7eb; }
  .footer p { font-size: 11px; color: #9ca3af; line-height: 1.6; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } .invoice { padding: 20px; } }
  @media (max-width: 480px) { .header { flex-direction: column; gap: 16px; } .inv-meta { text-align: left; } .info-grid { grid-template-columns: 1fr; } }
</style>
</head>
<body>
<div class="invoice">
  <div class="header">
    <div class="brand">
      <h1>PSW Direct</h1>
      <p>${BUSINESS_CONTACT.address}<br />${BUSINESS_CONTACT.postalCode}<br />${BUSINESS_CONTACT.phone}<br />pswdirect.com</p>
    </div>
    <div class="inv-meta">
      <div class="inv-num">${data.invoiceNumber}</div>
      <div class="inv-date">Issued: ${new Date(data.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</div>
      <div class="status-badge">${status.text}</div>
    </div>
  </div>

  <hr class="divider" />

  <div class="section-title">${isThirdParty ? "Patient / Client Information" : "Client Information"}</div>
  <div class="info-grid">
    <div class="info-block"><label>Name</label><p>${data.clientName}</p></div>
    <div class="info-block"><label>Email</label><p>${data.clientEmail}</p></div>
    ${data.clientPhone ? `<div class="info-block"><label>Phone</label><p>${data.clientPhone}</p></div>` : ""}
    ${data.clientAddress ? `<div class="info-block"><label>Service Address</label><p>${data.clientAddress}</p></div>` : ""}
  </div>

  ${generateVACSection(data)}
  ${generateInsuranceSection(data)}

  <hr class="divider" />

  <div class="section-title">Service Details</div>
  <div class="info-grid">
    <div class="info-block"><label>Order Reference</label><p>${data.bookingCode}</p></div>
    <div class="info-block"><label>Service Type</label><p>${data.serviceType}</p></div>
    <div class="info-block"><label>Service Date</label><p>${new Date(data.serviceDate + "T00:00:00").toLocaleDateString("en-CA", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p></div>
    <div class="info-block"><label>Time</label><p>${formatTime12(data.startTime)} – ${formatTime12(data.endTime)}</p></div>
    <div class="info-block"><label>Duration</label><p>${data.durationHours}h</p></div>
    ${data.pswName ? `<div class="info-block"><label>Caregiver</label><p>${data.pswName}</p></div>` : ""}
  </div>

  <hr class="divider" />

  <div class="section-title">Pricing Breakdown</div>
  <table class="pricing">
    <tr><td>Subtotal</td><td>$${data.subtotal.toFixed(2)}</td></tr>
    ${data.rushAmount > 0 ? `<tr><td>Rush Fee</td><td>$${data.rushAmount.toFixed(2)}</td></tr>` : ""}
    ${data.surgeAmount > 0 ? `<tr><td>Surge Fee</td><td>$${data.surgeAmount.toFixed(2)}</td></tr>` : ""}
    ${data.taxAmount > 0 ? `<tr><td>HST (13%)</td><td>$${data.taxAmount.toFixed(2)}</td></tr>` : ""}
    <tr class="total"><td>Total ${isThirdParty ? "Amount" : "Charged"}</td><td>$${data.total.toFixed(2)} ${data.currency}</td></tr>
    ${data.refundAmount && data.refundAmount > 0 ? `
    <tr class="refund"><td>Refund Applied${data.refundDate ? ` (${new Date(data.refundDate).toLocaleDateString("en-CA")})` : ""}</td><td>-$${data.refundAmount.toFixed(2)}</td></tr>
    <tr class="net"><td>Net Paid</td><td>$${netPaid.toFixed(2)} ${data.currency}</td></tr>
    ` : ""}
  </table>

  <div class="payment-box">
    <div class="row"><span>Payment Status</span><span>${data.paymentStatus === "paid" ? "✅ Paid" : data.paymentStatus === "invoice-pending" ? "⏳ Pending" : data.paymentStatus}</span></div>
    ${data.stripePaymentIntentId ? `<div class="row"><span>Transaction Ref</span><span style="font-size:11px;color:#9ca3af;">${data.stripePaymentIntentId}</span></div>` : ""}
    ${data.refundStatus ? `<div class="row"><span>Refund Status</span><span>${data.refundStatus}</span></div>` : ""}
    ${data.payerName && isThirdParty ? `<div class="row"><span>Billed To</span><span>${data.payerName}</span></div>` : ""}
  </div>

  <div class="footer">
    <p>PSW Direct — Private Home Care, Ontario<br />
    ${BUSINESS_CONTACT.address}, ${BUSINESS_CONTACT.postalCode}<br />
    ${BUSINESS_CONTACT.phone} · pswdirect.com<br />
    Thank you for choosing PSW Direct.</p>
  </div>
</div>
</body>
</html>`;
};

/** Open invoice in new window for viewing/printing/PDF download */
export const viewInvoice = (data: InvoiceData) => {
  const html = generateInvoiceHtml(data);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
};

/** Trigger print dialog (browser Save as PDF) */
export const downloadInvoicePdf = (data: InvoiceData) => {
  const html = generateInvoiceHtml(data);
  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
    setTimeout(() => win.print(), 400);
  }
};

/** Build InvoiceData from a booking record + invoice record */
export const buildInvoiceDataFromBooking = (
  booking: any,
  invoice?: any
): InvoiceData => {
  const serviceTypeLabel = (booking.service_type || []).join(", ") || "Home Care";
  
  let documentStatus: InvoiceData["documentStatus"] = "paid";
  if (booking.status === "cancelled") documentStatus = "cancelled";
  else if (booking.payment_status === "invoice-pending") documentStatus = "invoice-pending";
  else if (booking.was_refunded && booking.refund_amount >= booking.total) documentStatus = "refunded";
  else if (booking.was_refunded) documentStatus = "partially_refunded";

  return {
    invoiceNumber: invoice?.invoice_number || booking.booking_code,
    bookingCode: booking.booking_code,
    bookingId: booking.id,
    createdAt: invoice?.created_at || booking.created_at,
    documentStatus,
    clientName: booking.client_name,
    clientEmail: booking.client_email,
    clientPhone: booking.client_phone,
    clientAddress: booking.patient_address || booking.client_address,
    serviceType: invoice?.service_type || serviceTypeLabel,
    serviceDate: booking.scheduled_date,
    startTime: booking.start_time,
    endTime: booking.end_time,
    durationHours: invoice?.duration_hours || booking.hours,
    pswName: booking.psw_first_name || undefined,
    serviceItems: booking.service_type,
    subtotal: invoice?.subtotal ?? booking.subtotal,
    rushAmount: invoice?.rush_amount ?? 0,
    surgeAmount: invoice?.surge_amount ?? (booking.surge_amount || 0),
    taxAmount: invoice?.tax ?? 0,
    total: invoice?.total ?? booking.total,
    currency: invoice?.currency || "CAD",
    paymentStatus: booking.payment_status,
    stripePaymentIntentId: booking.stripe_payment_intent_id,
    refundAmount: booking.refund_amount || 0,
    refundStatus: booking.was_refunded ? (booking.refund_amount >= booking.total ? "Full Refund" : "Partial Refund") : undefined,
    refundDate: booking.refunded_at || undefined,
    // Third-party payer metadata
    payerType: booking.payer_type || undefined,
    payerName: booking.payer_name || undefined,
    thirdPartyPayerMode: booking.third_party_payer_mode || undefined,
    vacProgramOfChoice: booking.vac_program_of_choice || invoice?.vac_program_of_choice || undefined,
    vacProviderNumber: booking.vac_provider_number || invoice?.vac_provider_number || undefined,
    vacBenefitCode: booking.vac_benefit_code || invoice?.vac_benefit_code || undefined,
    vacServiceType: booking.vac_service_type || invoice?.vac_service_type || undefined,
    veteranKNumber: booking.veteran_k_number || undefined,
    vacAuthorizationNumber: booking.vac_authorization_number || undefined,
    vacStatus: booking.vac_status || undefined,
    insuranceMemberId: booking.insurance_member_id || undefined,
    insuranceClaimNumber: booking.insurance_claim_number || undefined,
    insuranceGroupNumber: booking.insurance_group_number || undefined,
    clientDateOfBirth: booking.client_date_of_birth || undefined,
  };
};
