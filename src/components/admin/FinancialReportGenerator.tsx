import { useRef } from "react";
import { format, parseISO } from "date-fns";
import { FileText, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import logo from "@/assets/logo.png";

interface LedgerEntry {
  id: string;
  date: string;
  bookingCode: string;
  customerName: string;
  pswName: string;
  grossAmount: number;
  taxAmount: number;
  pswPayout: number;
  platformFee: number;
  status: "completed" | "refunded" | "pending";
  refundAmount?: number;
  stripePaymentIntentId?: string;
}

interface FinancialSummary {
  grossRevenue: number;
  totalRefunds: number;
  netRevenue: number;
  taxCollected: number;
  refundedTax: number;
  netTaxCollected: number;
  totalPayouts: number;
  platformProfit: number;
  totalBookings: number;
  refundedCount: number;
}

interface FinancialReportGeneratorProps {
  open: boolean;
  onClose: () => void;
  dateRange: { start: Date; end: Date };
  summary: FinancialSummary;
  ledgerEntries: LedgerEntry[];
  selectedPeriod?: string;
}

export const FinancialReportGenerator = ({
  open,
  onClose,
  dateRange,
  summary,
  ledgerEntries,
  selectedPeriod,
}: FinancialReportGeneratorProps) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = reportRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Financial Report - PSADIRECT.CA</title>
        <style>
          @page { margin: 0.75in; size: letter; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
            padding: 0;
            color: #1a1a1a;
            font-size: 11px;
            line-height: 1.4;
            background: white;
          }
          .report-container { max-width: 100%; }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            border-bottom: 4px solid #1e40af;
            padding-bottom: 24px;
            margin-bottom: 24px;
          }
          .header-left { display: flex; align-items: center; gap: 16px; }
          .logo { height: 56px; }
          .company-name { 
            font-size: 28px; 
            font-weight: 800; 
            color: #1e40af;
            letter-spacing: -0.5px;
          }
          .company-tagline {
            font-size: 11px;
            color: #64748b;
            margin-top: 2px;
          }
          .header-right { text-align: right; }
          .report-title { 
            font-size: 18px; 
            font-weight: 700; 
            color: #1e293b;
          }
          .report-period { 
            font-size: 13px; 
            color: #1e40af; 
            font-weight: 600;
            margin-top: 4px; 
          }
          .report-date { font-size: 10px; color: #94a3b8; margin-top: 4px; }
          
          .summary-section { margin-bottom: 28px; }
          .section-title { 
            font-size: 13px; 
            font-weight: 700; 
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            padding-bottom: 6px;
            border-bottom: 2px solid #e2e8f0;
          }
          
          .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 12px; 
          }
          .summary-card { 
            border: 1px solid #e2e8f0; 
            padding: 14px; 
            border-radius: 8px;
            background: #f8fafc;
          }
          .summary-card.primary { 
            background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); 
            border: none;
            color: white;
          }
          .summary-card.primary .summary-label { color: rgba(255,255,255,0.8); }
          .summary-card.primary .summary-value { color: white; }
          .summary-card.success { 
            background: linear-gradient(135deg, #059669 0%, #10b981 100%); 
            border: none;
            color: white;
          }
          .summary-card.success .summary-label { color: rgba(255,255,255,0.8); }
          .summary-card.success .summary-value { color: white; }
          .summary-label { 
            font-size: 9px; 
            color: #64748b; 
            text-transform: uppercase; 
            font-weight: 600;
            letter-spacing: 0.3px;
          }
          .summary-value { 
            font-size: 22px; 
            font-weight: 800; 
            margin-top: 4px;
            color: #1e293b;
          }
          .summary-note { font-size: 9px; color: #94a3b8; margin-top: 2px; }
          
          .ledger-section { margin-top: 20px; }
          table { 
            width: 100%; 
            border-collapse: collapse;
            font-size: 10px;
          }
          th { 
            background: #1e293b; 
            color: white;
            padding: 10px 8px; 
            text-align: left; 
            font-weight: 600;
            font-size: 9px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          th:first-child { border-radius: 6px 0 0 0; }
          th:last-child { border-radius: 0 6px 0 0; }
          td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #e2e8f0;
          }
          tr:nth-child(even) { background: #f8fafc; }
          tr.refunded { background: #fef2f2; }
          tr:hover { background: #f1f5f9; }
          
          .badge { 
            display: inline-block; 
            padding: 3px 10px; 
            border-radius: 12px; 
            font-size: 9px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.3px;
          }
          .badge-completed { background: #dcfce7; color: #166534; }
          .badge-refunded { background: #fee2e2; color: #991b1b; }
          .badge-pending { background: #f3f4f6; color: #4b5563; }
          
          .text-right { text-align: right; }
          .text-green { color: #059669; }
          .text-blue { color: #2563eb; }
          .text-amber { color: #d97706; }
          .text-red { color: #dc2626; }
          .font-mono { font-family: 'SF Mono', 'Consolas', monospace; font-size: 9px; }
          
          .tax-notes {
            margin-top: 24px;
            padding: 16px;
            background: #fffbeb;
            border: 1px solid #fcd34d;
            border-radius: 8px;
          }
          .tax-notes-title {
            font-weight: 700;
            font-size: 11px;
            color: #92400e;
            margin-bottom: 8px;
          }
          .tax-notes p {
            font-size: 10px;
            color: #78350f;
            margin: 4px 0;
          }
          
          .footer { 
            margin-top: 32px; 
            padding-top: 16px; 
            border-top: 2px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .footer-left { font-size: 10px; color: #64748b; }
          .footer-right { 
            font-size: 9px; 
            color: #94a3b8; 
            font-family: 'SF Mono', 'Consolas', monospace;
          }
          
          @media print {
            body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .no-print { display: none !important; }
            .summary-card.primary, .summary-card.success { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="report-container">
          ${printContent.innerHTML}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const generatedDate = new Date().toISOString();
  const reportId = `RPT-${format(new Date(), "yyyyMMdd-HHmmss")}`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Financial Report Preview
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="brand" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-2" />
              Print / Save PDF
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Report Content */}
        <div ref={reportRef} className="bg-white p-8 text-foreground">
          {/* Header */}
          <div className="header">
            <div className="header-left">
              <img src={logo} alt="PSA Direct Logo" className="logo" style={{ height: "56px" }} />
              <div>
                <div className="company-name">PSADIRECT.CA</div>
                <div className="company-tagline">Personal Support Assistant Services</div>
              </div>
            </div>
            <div className="header-right">
              <div className="report-title">Financial Summary Report</div>
              <div className="report-period">
                {selectedPeriod || `${format(dateRange.start, "MMMM d, yyyy")} – ${format(dateRange.end, "MMMM d, yyyy")}`}
              </div>
              <div className="report-date">Generated: {format(parseISO(generatedDate), "MMMM d, yyyy 'at' h:mm a")}</div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="summary-section">
            <div className="section-title">Financial Overview</div>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-label">Gross Revenue</div>
                <div className="summary-value">${summary.grossRevenue.toFixed(2)}</div>
                <div className="summary-note">{summary.totalBookings} orders</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">Total Refunds</div>
                <div className="summary-value" style={{ color: "#dc2626" }}>-${summary.totalRefunds.toFixed(2)}</div>
                <div className="summary-note">{summary.refundedCount} refunded</div>
              </div>
              <div className="summary-card success">
                <div className="summary-label">Net Revenue</div>
                <div className="summary-value">${summary.netRevenue.toFixed(2)}</div>
                <div className="summary-note">After refunds</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">HST Collected</div>
                <div className="summary-value" style={{ color: "#d97706" }}>${summary.netTaxCollected.toFixed(2)}</div>
                <div className="summary-note">13% Ontario HST</div>
              </div>
            </div>
          </div>

          <div className="summary-section">
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-label">PSA Payouts</div>
                <div className="summary-value" style={{ color: "#2563eb" }}>${summary.totalPayouts.toFixed(2)}</div>
                <div className="summary-note">Staff compensation</div>
              </div>
              <div className="summary-card primary">
                <div className="summary-label">Platform Profit</div>
                <div className="summary-value">${summary.platformProfit.toFixed(2)}</div>
                <div className="summary-note">Net after all costs</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">Avg Order Value</div>
                <div className="summary-value">
                  ${summary.totalBookings > 0 ? (summary.netRevenue / summary.totalBookings).toFixed(2) : "0.00"}
                </div>
              </div>
              <div className="summary-card">
                <div className="summary-label">Total Orders</div>
                <div className="summary-value">{summary.totalBookings}</div>
                <div className="summary-note">Completed orders</div>
              </div>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="ledger-section">
            <div className="section-title">Transaction Ledger</div>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Order ID</th>
                  <th>Customer</th>
                  <th>PSA</th>
                  <th className="text-right">Gross</th>
                  <th className="text-right">HST</th>
                  <th className="text-right">PSA Payout</th>
                  <th className="text-right">Platform</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.slice(0, 50).map((entry) => (
                  <tr key={entry.id} className={entry.status === "refunded" ? "refunded" : ""}>
                    <td>{format(parseISO(entry.date), "MMM d, yyyy")}</td>
                    <td className="font-mono">{entry.bookingCode}</td>
                    <td>{entry.customerName}</td>
                    <td>{entry.pswName}</td>
                    <td className="text-right">${entry.grossAmount.toFixed(2)}</td>
                    <td className="text-right text-amber">${entry.taxAmount.toFixed(2)}</td>
                    <td className="text-right text-blue">${entry.pswPayout.toFixed(2)}</td>
                    <td className="text-right text-green">${entry.platformFee.toFixed(2)}</td>
                    <td>
                      <span className={`badge badge-${entry.status}`}>
                        {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                      </span>
                      {entry.status === "refunded" && entry.refundAmount && (
                        <span style={{ fontSize: "9px", color: "#dc2626", marginLeft: "4px" }}>
                          -${entry.refundAmount.toFixed(2)}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {ledgerEntries.length > 50 && (
              <p style={{ fontSize: "10px", color: "#64748b", marginTop: "12px", textAlign: "center" }}>
                Showing 50 of {ledgerEntries.length} transactions. Export CSV for complete data.
              </p>
            )}
          </div>

          {/* Tax Notes */}
          <div className="tax-notes">
            <div className="tax-notes-title">Tax & Compliance Notes</div>
            <p>• HST (Harmonized Sales Tax) at 13% is included in all transaction totals and remitted to CRA.</p>
            <p>• All PSA payouts are reported as contractor payments and subject to T4A reporting.</p>
            {summary.refundedTax > 0 && (
              <p>• Refunded HST: ${summary.refundedTax.toFixed(2)} has been deducted from tax remittance totals.</p>
            )}
            <p>• Stripe payment references are retained for 5+ years for audit compliance.</p>
          </div>

          {/* Footer */}
          <div className="footer">
            <div className="footer-left">
              <p style={{ fontWeight: 600 }}>PSADIRECT.CA</p>
              <p>For accounting inquiries: accounting@psadirect.ca</p>
            </div>
            <div className="footer-right">
              <p>Report ID: {reportId}</p>
              <p>This is an official financial document</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
