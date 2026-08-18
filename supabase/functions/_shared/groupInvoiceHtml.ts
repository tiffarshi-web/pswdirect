// Grouped multi-day Home Care invoice renderer (server-side).
// Renders ONE invoice covering every visit in a booking group.
// Home Care is never taxable and never carries parking — both lines are
// rendered explicitly so the document is self-evidencing.

const esc = (v: unknown): string =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const money = (n: unknown) => `$${(Math.round((Number(n) || 0) * 100) / 100).toFixed(2)}`;

const time12 = (t: string): string => {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hr = parseInt(h, 10);
  if (isNaN(hr)) return String(t);
  return `${hr % 12 || 12}:${m ?? "00"} ${hr >= 12 ? "PM" : "AM"}`;
};

const longDate = (d: string): string => {
  if (!d) return "";
  const dt = new Date(`${d}T00:00:00`);
  return isNaN(dt.getTime())
    ? d
    : dt.toLocaleDateString("en-CA", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
};

export interface GroupVisitLine {
  bookingCode: string;
  serviceDate: string;
  startTime: string;
  endTime: string;
  hours: number;
  hourlyRate: number;
  subtotal: number;
}

export interface GroupInvoiceData {
  invoiceNumber: string;
  groupCode: string;
  createdAt?: string;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  serviceRecipient?: string;
  serviceAddress?: string;
  visits: GroupVisitLine[];
  totalHours: number;
  subtotal: number;
  total: number;
  amountPaid: number;
  paymentDate?: string;
  paymentIntentId?: string;
  currency?: string;
}

export function generateGroupInvoiceHtml(d: GroupInvoiceData): string {
  const rows = d.visits
    .map(
      (v) => `<tr>
      <td>${esc(longDate(v.serviceDate))}</td>
      <td>${esc(time12(v.startTime))} – ${esc(time12(v.endTime))}</td>
      <td>${Number(v.hours || 0)} hr</td>
      <td>${esc(v.bookingCode)}</td>
      <td style="text-align:right">${money(v.hourlyRate)}/hr</td>
      <td style="text-align:right">${money(v.subtotal)}</td>
    </tr>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8" />
<title>Invoice ${esc(d.invoiceNumber)} — PSW Direct</title>
<style>
  *{box-sizing:border-box} body{margin:0;background:#f4f5f7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1a1a2e}
  .sheet{max-width:820px;margin:24px auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden}
  .head{display:flex;justify-content:space-between;align-items:flex-start;padding:28px 32px;background:#1a1a2e;color:#fff}
  .head h1{margin:0;font-size:22px} .head p{margin:4px 0 0;font-size:12px;color:#a5b4c8}
  .badge{background:#f0fdf4;color:#166534;font-weight:700;font-size:12px;letter-spacing:.06em;padding:6px 12px;border-radius:999px}
  .body{padding:28px 32px}
  .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-bottom:24px}
  .grid label{display:block;font-size:10px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:3px}
  .grid p{margin:0;font-size:13px;font-weight:600}
  .title{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin:24px 0 8px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280;border-bottom:1px solid #e5e7eb;padding:8px 6px}
  td{padding:9px 6px;border-bottom:1px solid #f1f2f4}
  .totals{margin-top:20px;margin-left:auto;width:320px;font-size:13px}
  .totals div{display:flex;justify-content:space-between;padding:7px 0}
  .totals .grand{border-top:2px solid #1a1a2e;margin-top:6px;font-size:17px;font-weight:700}
  .muted{color:#6b7280}
  .foot{padding:20px 32px;background:#fafafa;border-top:1px solid #e5e7eb;font-size:11px;color:#6b7280;text-align:center}
  @media print{body{background:#fff}.sheet{border:none;margin:0}}
</style></head>
<body><div class="sheet">
  <div class="head">
    <div><h1>PSW Direct</h1><p>239 Grove St E, Barrie, ON L4M 2R1 · (249) 288-4787</p></div>
    <div style="text-align:right">
      <div class="badge">PAID</div>
      <p style="margin:10px 0 0;font-size:12px">Invoice <strong>${esc(d.invoiceNumber)}</strong></p>
      <p style="margin:2px 0 0;font-size:12px">Group <strong>${esc(d.groupCode)}</strong></p>
    </div>
  </div>
  <div class="body">
    <div class="grid">
      <div><label>Customer</label><p>${esc(d.clientName)}</p><p class="muted" style="font-weight:400">${esc(d.clientEmail)}</p></div>
      <div><label>Service Recipient</label><p>${esc(d.serviceRecipient || d.clientName)}</p></div>
      <div><label>Service Address</label><p style="font-weight:400">${esc(d.serviceAddress || "—")}</p></div>
      <div><label>Service</label><p>Home Care</p></div>
      <div><label>Visits</label><p>${d.visits.length}</p></div>
      <div><label>Total Hours</label><p>${Number(d.totalHours || 0)} hr</p></div>
    </div>

    <div class="title">Scheduled Visits</div>
    <table>
      <thead><tr><th>Date</th><th>Time</th><th>Duration</th><th>Booking</th><th style="text-align:right">Rate</th><th style="text-align:right">Subtotal</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div><span class="muted">Subtotal (${Number(d.totalHours || 0)} hr)</span><span>${money(d.subtotal)}</span></div>
      <div><span class="muted">HST</span><span>Non-taxable — $0.00</span></div>
      <div><span class="muted">Parking</span><span>Not applicable</span></div>
      <div class="grand"><span>Total (${esc(d.currency || "CAD")})</span><span>${money(d.total)}</span></div>
      <div><span class="muted">Amount paid</span><span>${money(d.amountPaid)}</span></div>
      <div><span class="muted">Payment date</span><span>${esc(
        d.paymentDate ? new Date(d.paymentDate).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : "—",
      )}</span></div>
      ${d.paymentIntentId ? `<div><span class="muted">Payment reference</span><span style="font-size:11px">${esc(d.paymentIntentId)}</span></div>` : ""}
    </div>
  </div>
  <div class="foot">Home Care services are exempt from HST in Ontario. One invoice covers all visits listed above.<br />Thank you for choosing PSW Direct.</div>
</div></body></html>`;
}
