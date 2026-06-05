// Admin Invoice & Status Panel for a single booking
// Shows invoice status, refund status, payment status, care sheet status, dispatch info, and completion docs

import { useState, useEffect } from "react";
import { FileText, Download, Copy, RefreshCw, CheckCircle2, Clock, Mail, Receipt, Shield, Eye, Send, AlertCircle, CreditCard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { buildInvoiceDataFromBooking, viewInvoice, downloadInvoicePdf, generateInvoiceHtml } from "./InvoiceDocument";
import { AdminCreateAndChargeDialog } from "./AdminCreateAndChargeDialog";

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

interface CompletionEmailLog {
  status: string;
  created_at: string;
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
  const [sendingDocs, setSendingDocs] = useState(false);
  const [completionEmail, setCompletionEmail] = useState<CompletionEmailLog | null>(null);
  const [bookingPay, setBookingPay] = useState<{
    total: number;
    stripe_customer_id: string | null;
    stripe_payment_method_id: string | null;
    stripe_payment_intent_id: string | null;
  } | null>(null);
  const [charging, setCharging] = useState(false);
  const [chargeDialogOpen, setChargeDialogOpen] = useState(false);
  const [clientInfo, setClientInfo] = useState<{ name?: string; email?: string }>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [invoiceRes, dispatchRes, emailLogRes] = await Promise.all([
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
        supabase
          .from("email_logs")
          .select("status, created_at")
          .eq("recipient_email", clientEmail)
          .eq("template_name", "completion-docs")
          .like("subject", `%${bookingCode}%`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (invoiceRes.error) {
        console.error("Invoice fetch error:", invoiceRes.error.message);
      } else if (invoiceRes.data) {
        setInvoice({
          ...invoiceRes.data,
          subtotal: Number(invoiceRes.data.subtotal) || 0,
          tax: Number(invoiceRes.data.tax) || 0,
          surge_amount: Number(invoiceRes.data.surge_amount) || 0,
          rush_amount: Number(invoiceRes.data.rush_amount) || 0,
          total: Number(invoiceRes.data.total) || 0,
          refund_amount: Number(invoiceRes.data.refund_amount) || 0,
        } as any);
      }
      if (dispatchRes.data) setDispatch(dispatchRes.data as any);
      if (emailLogRes.data) setCompletionEmail(emailLogRes.data as any);
      // Pull payment fields for "Charge saved card" affordance
      const { data: bookingPayRow } = await supabase
        .from("bookings")
        .select("total, stripe_customer_id, stripe_payment_method_id, stripe_payment_intent_id, client_name, client_first_name, client_last_name, client_email")
        .eq("id", bookingId)
        .maybeSingle();
      if (bookingPayRow) {
        setBookingPay({
          total: Number((bookingPayRow as any).total) || 0,
          stripe_customer_id: (bookingPayRow as any).stripe_customer_id ?? null,
          stripe_payment_method_id: (bookingPayRow as any).stripe_payment_method_id ?? null,
          stripe_payment_intent_id: (bookingPayRow as any).stripe_payment_intent_id ?? null,
        });
        const row: any = bookingPayRow;
        setClientInfo({
          name: row.client_name || [row.client_first_name, row.client_last_name].filter(Boolean).join(" ") || undefined,
          email: row.client_email || clientEmail,
        });
      }
      setLoading(false);
    };
    fetchData();
  }, [bookingId, bookingCode, clientEmail]);

  const handleChargeSavedCard = async () => {
    if (!bookingPay) return;
    if (!confirm(`Charge $${bookingPay.total.toFixed(2)} to the saved card on file for ${bookingCode}?`)) return;
    setCharging(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-charge-existing-booking", {
        body: { bookingId },
      });
      if (error) throw error;
      if (data?.error) {
        toast.error(data.message || data.error);
      } else {
        toast.success(`Charged $${data.amount?.toFixed?.(2) ?? bookingPay.total.toFixed(2)} — ${data.payment_status}`);
        setBookingPay({ ...bookingPay, stripe_payment_intent_id: data.payment_intent_id });
      }
    } catch (e: any) {
      toast.error(e.message || "Charge failed");
    }
    setCharging(false);
  };

  const handleViewInvoice = async () => {
    const { data: booking } = await supabase
      .from("bookings").select("*").eq("id", bookingId).maybeSingle();
    if (booking) {
      viewInvoice(buildInvoiceDataFromBooking(booking, invoice));
    } else if (invoice?.html_snapshot) {
      const win = window.open("", "_blank");
      if (win) { win.document.write(invoice.html_snapshot); win.document.close(); }
    }
  };

  const handleDownloadInvoice = async () => {
    const { data: booking } = await supabase
      .from("bookings").select("*").eq("id", bookingId).maybeSingle();
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
        .from("bookings").select("*").eq("id", bookingId).maybeSingle();
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

  const handleSendCompletionDocs = async () => {
    setSendingDocs(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-completion-docs", {
        body: { booking_code: bookingCode },
      });
      if (error) throw error;
      if (data?.error) {
        if (data.error === "care_sheet_missing") {
          toast.error("Cannot send: Care sheet is missing. Please add one first.");
        } else if (data.error === "invoice_missing") {
          toast.error("Cannot send: Invoice is missing for this order.");
        } else {
          toast.error(data.message || "Failed to send documents");
        }
        setSendingDocs(false);
        return;
      }
      toast.success(`Invoice & Care Summary sent to ${data.email_sent_to}`);
      setCompletionEmail({ status: "sent", created_at: new Date().toISOString() });
    } catch (e: any) {
      toast.error(`Failed to send: ${e.message || "Unknown error"}`);
    }
    setSendingDocs(false);
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

  const isCompleted = status === "completed";
  const hasCareSheet = careSheetStatus === "submitted" || !!careSheetSubmittedAt;
  const hasInvoice = !!invoice;
  const canSendDocs = isCompleted && hasCareSheet && hasInvoice;

  return (
    <div className="space-y-4">
      {/* Completion Documents Status — only for completed orders */}
      {isCompleted && (
        <>
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              Completion Documents
            </h4>

            {/* Status checklist */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center gap-2">
                {hasInvoice ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className={hasInvoice ? "text-green-700" : "text-amber-600"}>
                  Invoice: {hasInvoice ? `✓ ${invoice!.invoice_number}` : "Missing"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {hasCareSheet ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                )}
                <span className={hasCareSheet ? "text-green-700" : "text-amber-600"}>
                  Care Sheet: {hasCareSheet ? "✓ Submitted" : "Missing — add before sending"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {completionEmail?.status === "sent" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                ) : completionEmail?.status === "failed" ? (
                  <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <span className={
                  completionEmail?.status === "sent" ? "text-green-700" :
                  completionEmail?.status === "failed" ? "text-red-600" :
                  "text-muted-foreground"
                }>
                  Email: {completionEmail?.status === "sent"
                    ? `✓ Sent ${new Date(completionEmail.created_at).toLocaleString()}`
                    : completionEmail?.status === "failed"
                    ? "✗ Failed — retry below"
                    : "Not sent"}
                </span>
              </div>
            </div>

            {/* Send / Resend button */}
            <div className="flex gap-2 mt-2">
              <Button
                variant={canSendDocs ? "default" : "outline"}
                size="sm"
                onClick={handleSendCompletionDocs}
                disabled={sendingDocs || !canSendDocs}
                className="gap-1.5 text-xs"
              >
                <Send className="w-3 h-3" />
                {sendingDocs ? "Sending..." : completionEmail?.status === "sent" ? "Resend Documents" : "Send Documents"}
              </Button>
            </div>

            {!canSendDocs && (
              <p className="text-xs text-amber-600 mt-1">
                {!hasInvoice && !hasCareSheet
                  ? "Both invoice and care sheet are required before sending."
                  : !hasInvoice
                  ? "Generate an invoice before sending documents."
                  : "Add a care sheet before sending documents."}
              </p>
            )}
          </div>
          <Separator />
        </>
      )}

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
              {resending ? "Sending..." : "Resend Invoice"}
            </Button>
          </div>
        )}

        {/* Charge saved card (admin off-session) */}
        {bookingPay && paymentStatus !== "paid" && !bookingPay.stripe_payment_intent_id && bookingPay.stripe_customer_id && bookingPay.stripe_payment_method_id && bookingPay.total > 0 && (
          <div className="mt-3 p-2 rounded border border-dashed border-amber-300 bg-amber-50 flex items-center justify-between gap-2">
            <div className="text-xs text-amber-800">
              No Stripe charge yet. Saved card on file — ${bookingPay.total.toFixed(2)} due.
            </div>
            <Button
              size="sm"
              onClick={handleChargeSavedCard}
              disabled={charging}
              className="gap-1 text-xs"
            >
              <CreditCard className="w-3 h-3" />
              {charging ? "Charging..." : `Charge $${bookingPay.total.toFixed(2)}`}
            </Button>
          </div>
        )}
        {/* Charge with a NEW card (admin manual entry) — shown whenever payment is not yet captured */}
        {bookingPay && paymentStatus !== "paid" && !bookingPay.stripe_payment_method_id && bookingPay.total > 0 && (
          <div className="mt-3 p-2 rounded border border-dashed border-blue-300 bg-blue-50 flex items-center justify-between gap-2">
            <div className="text-xs text-blue-900">
              {bookingPay.stripe_payment_intent_id
                ? `Client never completed Stripe checkout. Enter a card manually to charge $${bookingPay.total.toFixed(2)}.`
                : `No saved card. Enter a card manually to charge $${bookingPay.total.toFixed(2)}.`}
            </div>
            <Button
              size="sm"
              onClick={() => setChargeDialogOpen(true)}
              className="gap-1 text-xs"
            >
              <CreditCard className="w-3 h-3" />
              Create & Charge
            </Button>
          </div>
        )}
        {bookingPay?.stripe_payment_intent_id && (
          <div className="mt-2 text-xs text-muted-foreground font-mono">
            PI: {bookingPay.stripe_payment_intent_id}
          </div>
        )}
        <AdminCreateAndChargeDialog
          open={chargeDialogOpen}
          onOpenChange={setChargeDialogOpen}
          bookingId={bookingId}
          bookingCode={bookingCode}
          amount={bookingPay?.total || 0}
          clientName={clientInfo.name}
          clientEmail={clientInfo.email}
          onSuccess={(piId) => {
            if (bookingPay) setBookingPay({ ...bookingPay, stripe_payment_intent_id: piId });
          }}
        />
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
            <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 bg-amber-50">
              <AlertCircle className="w-3 h-3 mr-1" />
              {isCompleted ? "⚠ Missing — required for completion" : "Not submitted"}
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
