import { useRef } from "react";
import { format, parseISO } from "date-fns";
import { FileText, Printer, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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
}

export const FinancialReportGenerator = ({
  open,
  onClose,
  dateRange,
  summary,
  ledgerEntries,
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
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            padding: 40px;
            color: #1a1a1a;
            font-size: 12px;
            line-height: 1.5;
          }
          .header { 
            display: flex; 
            justify-content: space-between; 
            align-items: flex-start;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo { height: 50px; }
          .company-info { text-align: right; }
          .company-name { font-size: 24px; font-weight: bold; color: #2563eb; }
          .report-title { font-size: 14px; color: #666; margin-top: 4px; }
          .date-range { font-size: 12px; color: #888; margin-top: 4px; }
          .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 16px; 
            margin-bottom: 30px;
          }
          .summary-card { 
            border: 1px solid #e5e5e5; 
            padding: 16px; 
            border-radius: 8px;
            text-align: center;
          }
          .summary-card.highlight { 
            background: #f0f7ff; 
            border-color: #2563eb;
          }
          .summary-label { font-size: 11px; color: #666; text-transform: uppercase; }
          .summary-value { font-size: 20px; font-weight: bold; margin-top: 4px; }
          .summary-value.green { color: #16a34a; }
          .summary-value.blue { color: #2563eb; }
          .summary-value.amber { color: #d97706; }
          .summary-value.red { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { 
            background: #f5f5f5; 
            padding: 10px 8px; 
            text-align: left; 
            font-weight: 600;
            border-bottom: 2px solid #e5e5e5;
            font-size: 11px;
            text-transform: uppercase;
          }
          td { 
            padding: 10px 8px; 
            border-bottom: 1px solid #e5e5e5;
            font-size: 11px;
          }
          tr:nth-child(even) { background: #fafafa; }
          tr.refunded { background: #fef2f2; }
          .badge { 
            display: inline-block; 
            padding: 2px 8px; 
            border-radius: 12px; 
            font-size: 10px;
            font-weight: 600;
          }
          .badge-completed { background: #dcfce7; color: #16a34a; }
          .badge-refunded { background: #fee2e2; color: #dc2626; }
          .badge-pending { background: #f3f4f6; color: #6b7280; }
          .text-right { text-align: right; }
          .text-green { color: #16a34a; }
          .text-blue { color: #2563eb; }
          .text-amber { color: #d97706; }
          .text-red { color: #dc2626; }
          .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #e5e5e5;
            text-align: center;
            color: #888;
            font-size: 10px;
          }
          .section-title { 
            font-size: 14px; 
            font-weight: 600; 
            margin: 30px 0 15px 0;
            color: #1a1a1a;
          }
          .refund-note { 
            font-size: 10px; 
            color: #dc2626; 
            margin-left: 4px;
          }
          @media print {
            body { padding: 20px; }
            .no-print { display: none !important; }
          }
        </style>
      </head>
      <body>
        ${printContent.innerHTML}
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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
        <DialogHeader className="flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Financial Report Preview
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
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
            <div>
              <img src={logo} alt="PSA Direct Logo" className="logo h-12" />
            </div>
            <div className="company-info">
              <div className="company-name">PSADIRECT.CA</div>
              <div className="report-title">Financial Summary Report</div>
              <div className="date-range">
                {format(dateRange.start, "MMMM d, yyyy")} – {format(dateRange.end, "MMMM d, yyyy")}
              </div>
              <div className="date-range">Generated: {format(parseISO(generatedDate), "MMM d, yyyy 'at' h:mm a")}</div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">Gross Revenue</div>
              <div className="summary-value">${summary.grossRevenue.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Refunds</div>
              <div className="summary-value text-red">-${summary.totalRefunds.toFixed(2)}</div>
            </div>
            <div className="summary-card highlight">
              <div className="summary-label">Net Revenue</div>
              <div className="summary-value text-green">${summary.netRevenue.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">HST Collected</div>
              <div className="summary-value text-amber">${summary.netTaxCollected.toFixed(2)}</div>
            </div>
          </div>

          <div className="summary-grid">
            <div className="summary-card">
              <div className="summary-label">PSW Payouts</div>
              <div className="summary-value text-blue">${summary.totalPayouts.toFixed(2)}</div>
            </div>
            <div className="summary-card highlight">
              <div className="summary-label">Platform Profit</div>
              <div className="summary-value text-green">${summary.platformProfit.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Orders</div>
              <div className="summary-value">{summary.totalBookings}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Refunded Orders</div>
              <div className="summary-value text-red">{summary.refundedCount}</div>
            </div>
          </div>

          {/* Transaction Ledger */}
          <div className="section-title">Transaction Ledger</div>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Order ID</th>
                <th>Customer</th>
                <th>PSW</th>
                <th className="text-right">Gross</th>
                <th className="text-right">Tax (HST)</th>
                <th className="text-right">PSW Payout</th>
                <th className="text-right">Platform Fee</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {ledgerEntries.map((entry) => (
                <tr key={entry.id} className={entry.status === "refunded" ? "refunded" : ""}>
                  <td>{format(parseISO(entry.date), "MMM d, yyyy")}</td>
                  <td style={{ fontFamily: "monospace", fontSize: "10px" }}>{entry.bookingCode}</td>
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
                      <span className="refund-note">-${entry.refundAmount.toFixed(2)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tax Notes */}
          <div className="section-title">Tax Notes</div>
          <div style={{ fontSize: "11px", color: "#666", marginBottom: "10px" }}>
            <p>• HST (Harmonized Sales Tax) at 13% is included in all transaction totals</p>
            <p>• Tax amounts shown are extracted from gross totals for reporting purposes</p>
            {summary.refundedTax > 0 && (
              <p style={{ color: "#dc2626" }}>
                • Refunded tax: ${summary.refundedTax.toFixed(2)} has been deducted from total tax collected
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="footer">
            <p>This report was generated automatically by PSADIRECT.CA Accounting System</p>
            <p>For questions, contact accounting@psadirect.ca</p>
            <p style={{ marginTop: "8px" }}>
              Report ID: RPT-{format(parseISO(generatedDate), "yyyyMMdd-HHmmss")}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
