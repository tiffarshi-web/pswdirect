// Admin Invoice & Status Panel for a single booking
// Shows invoice status, refund status, payment status, care sheet status, and dispatch info

import { useState, useEffect } from "react";
import { FileText, Download, Copy, RefreshCw, CheckCircle2, Clock, Mail, Receipt, Shield, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildInvoiceDataFromBooking, viewInvoice, downloadInvoicePdf, generateInvoiceHtml } from "./InvoiceDocument";

interface BookingInvoicePanelProps {
  bookingId: string;
  bookingCode: string;
  clientEmail: string;
  paymentStatus: string;
  status: string;
  wasRefunded?: boolean;
  refundAmount?: number;
  refundReason?: string;
  careSheetStatus?: string;
  careSheetSubmittedAt?: string;
}

interface InvoiceRecord {
  id: string;
  invoice_number: string;
  status: string;
  document_status: string;
  total: number;
  tax: number;
  subtotal: number;
  rush_amount: number;
  surge_amount: number;
  refund_amount: number;
  service_type: string | null;
  duration_hours: number | null;
  created_at: string;
  html_snapshot: string | null;
  stripe_payment_intent_id: string | null;
}

interface DispatchRecord {
  id: string;
  matched_psw_ids: string[];
  channels_sent: string[];
  created_at: string;
  notes: string | null;
  claimed_by_psw_id: string | null;
  claimed_at: string | null;
}

export const BookingInvoicePanel = ({
  bookingId,
  bookingCode,
  clientEmail,
  paymentStatus,
  status,
  wasRefunded,
  refundAmount,
  refundReason,
  careSheetStatus,
  careSheetSubmittedAt,
}: BookingInvoicePanelProps) => {
  const [invoice, setInvoice] = useState<InvoiceRecord | null>(null);
  const [dispatch, setDispatch] = useState<DispatchRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [invoiceRes, dispatchRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("id, invoice_number, status, document_status, total, tax, subtotal, rush_amount, surge_amount, refund_amount, service_type, duration_hours, created_at, html_snapshot, stripe_payment_intent_id")
          .eq("booking_id", bookingId)
          .eq("invoice_type", "client_invoice")
          .maybeSingle(),
        supabase
          .from("dispatch_logs")
          .select("id, matched_psw_ids, channels_sent, created_at, notes, claimed_by_psw_id, claimed_at")
          .eq("booking_code", bookingCode)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (invoiceRes.data) setInvoice(invoiceRes.data as any);
      if (dispatchRes.data) setDispatch(dispatchRes.data as any);
      setLoading(false);
    };
    fetchData();
  }, [bookingId, bookingCode]);

  const handleViewInvoice = async () => {
    // Fetch booking for rich invoice rendering
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (booking) {
      viewInvoice(buildInvoiceDataFromBooking(booking, invoice));
    } else if (invoice?.html_snapshot) {
      const win = window.open("", "_blank");
      if (win) { win.document.write(invoice.html_snapshot); win.document.close(); }
    }
  };

  const handleDownloadInvoice = async () => {
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (booking) {
      downloadInvoicePdf(buildInvoiceDataFromBooking(booking, invoice));
    } else if (invoice?.html_snapshot) {
      const win = window.open("", "_blank");
      if (win) { win.document.write(invoice.html_snapshot); win.document.close(); setTimeout(() => win.print(), 400); }
    }
  };

  const handleResendInvoice = async () => {
    setResending(true);
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      const html = booking
        ? generateInvoiceHtml(buildInvoiceDataFromBooking(booking, invoice))
        : invoice?.html_snapshot;

      if (!html) { toast.error("No invoice HTML available to resend"); setResending(false); return; }

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: clientEmail,
          subject: `Invoice ${invoice?.invoice_number || bookingCode} — PSW Direct`,
          body: html,
          htmlBody: html,
          template_key: "psa-client-invoice",
        },
      });
      if (error) throw error;
      toast.success(`Invoice resent to ${clientEmail}`);
    } catch (e: any) {
      toast.error(`Failed to resend: ${e.message || "Unknown error"}`);
    }
    setResending(false);
  };

  const handleCopyInvoiceRef = () => {
    const ref = invoice
      ? `Invoice: ${invoice.invoice_number} | Booking: ${bookingCode} | Total: $${invoice.total.toFixed(2)}`
      : `Booking: ${bookingCode}`;
    navigator.clipboard.writeText(ref);
    toast.success("Invoice reference copied to clipboard");
  };

  if (loading) {
    return <div className="text-sm text-muted-foreground py-2">Loading details...</div>;
  }

  return (
    <div className="space-y-4">
      {/* Payment & Invoice Status */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Receipt className="w-4 h-4 text-primary" />
          Payment & Invoice
        </h4>
        <div className="flex flex-wrap gap-2">
          <Badge variant={paymentStatus === "paid" ? "default" : "secondary"} className="text-xs">
            Payment: {paymentStatus}
          </Badge>
          {invoice ? (
            <>
              <Badge
                variant={invoice.document_status === "paid" ? "default" : invoice.document_status === "refunded" ? "destructive" : "secondary"}
                className="text-xs"
              >
                {invoice.document_status || invoice.status}
              </Badge>
              <Badge variant="outline" className="text-xs font-mono">
                {invoice.invoice_number}
              </Badge>
            </>
          ) : (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              No invoice record
            </Badge>
          )}
        </div>

        {invoice && (
          <div className="flex flex-wrap gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={handleViewInvoice} className="gap-1 text-xs">
              <Eye className="w-3 h-3" />
              View
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadInvoice} className="gap-1 text-xs">
              <Download className="w-3 h-3" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopyInvoiceRef} className="gap-1 text-xs">
              <Copy className="w-3 h-3" />
              Copy Ref
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendInvoice}
              disabled={resending}
              className="gap-1 text-xs"
            >
              <Mail className="w-3 h-3" />
              {resending ? "Sending..." : "Resend"}
            </Button>
          </div>
        )}
      </div>

      <Separator />

      {/* Refund Status */}
      {(wasRefunded || status === "cancelled") && (
        <>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield className="w-4 h-4 text-destructive" />
              Refund / Cancellation
            </h4>
            <div className="flex flex-wrap gap-2">
              {wasRefunded && (
                <Badge variant="destructive" className="text-xs">
                  Refunded{refundAmount ? `: $${Number(refundAmount).toFixed(2)}` : ""}
                </Badge>
              )}
              {status === "cancelled" && (
                <Badge variant="outline" className="text-xs border-destructive text-destructive">
                  Cancelled
                </Badge>
              )}
            </div>
            {refundReason && (
              <p className="text-xs text-muted-foreground">Reason: {refundReason}</p>
            )}
          </div>
          <Separator />
        </>
      )}

      {/* Care Sheet Status */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Care Sheet
        </h4>
        <div className="flex items-center gap-2">
          {careSheetStatus === "submitted" || careSheetSubmittedAt ? (
            <Badge className="text-xs bg-green-100 text-green-800 border-green-200">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Submitted
            </Badge>
          ) : careSheetStatus === "missing" ? (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              <Clock className="w-3 h-3 mr-1" />
              Not submitted
            </Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">
              {careSheetStatus || "Unknown"}
            </Badge>
          )}
          {careSheetSubmittedAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(careSheetSubmittedAt).toLocaleString()}
            </span>
          )}
        </div>
      </div>

      <Separator />

      {/* Dispatch Status */}
      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <RefreshCw className="w-4 h-4 text-primary" />
          Dispatch
        </h4>
        {dispatch ? (
          <div className="space-y-1">
            <div className="flex flex-wrap gap-1">
              {(dispatch.channels_sent || []).map((ch, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {ch}
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Sent to {(dispatch.matched_psw_ids || []).length} PSWs •{" "}
              {new Date(dispatch.created_at).toLocaleString()}
            </p>
            {dispatch.claimed_by_psw_id && (
              <p className="text-xs text-green-700 font-medium">
                ✅ Claimed{dispatch.claimed_at ? ` at ${new Date(dispatch.claimed_at).toLocaleString()}` : ""}
              </p>
            )}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No dispatch record found</p>
        )}
      </div>
    </div>
  );
};
