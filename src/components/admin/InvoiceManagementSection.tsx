// Invoice Management Section — Admin tab for viewing, filtering, and managing invoices
// Last rebuild: 2026-04-02

import { useState, useEffect, useMemo } from "react";
import { FileText, Download, Mail, Search, RefreshCw, Eye, Copy, CheckCircle, DollarSign, Clock, AlertTriangle, Send } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { buildInvoiceDataFromBooking, viewInvoice, downloadInvoicePdf, generateInvoiceHtml } from "./InvoiceDocument";
import { useAuth } from "@/contexts/AuthContext";

interface InvoiceRow {
  id: string;
  invoice_number: string;
  booking_code: string;
  booking_id: string;
  client_email: string;
  client_name: string | null;
  status: string;
  document_status: string;
  subtotal: number;
  tax: number;
  surge_amount: number;
  rush_amount: number;
  total: number;
  refund_amount: number;
  refund_status: string | null;
  service_type: string | null;
  duration_hours: number | null;
  created_at: string;
  html_snapshot: string | null;
  stripe_payment_intent_id: string | null;
  payer_type: string | null;
  payer_name: string | null;
  payment_terms_days: number | null;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  payment_reference: string | null;
  payment_note: string | null;
  manually_marked_paid_by: string | null;
}

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-red-100 text-red-800 border-red-200",
  partially_refunded: "bg-amber-100 text-amber-800 border-amber-200",
  generated: "bg-blue-100 text-blue-800 border-blue-200",
  sent: "bg-green-100 text-green-800 border-green-200",
  email_failed: "bg-red-100 text-red-800 border-red-200",
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  "invoice-pending": "bg-yellow-100 text-yellow-800 border-yellow-200",
  pending_payment: "bg-yellow-100 text-yellow-800 border-yellow-200",
};

const PAYMENT_METHODS = [
  { value: "stripe", label: "Stripe" },
  { value: "insurance_direct", label: "Insurance Direct" },
  { value: "cheque", label: "Cheque" },
  { value: "e_transfer", label: "E-Transfer" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

const paymentMethodLabel = (method: string | null) => {
  if (!method) return null;
  const found = PAYMENT_METHODS.find(m => m.value === method);
  return found ? found.label : method;
};

export const InvoiceManagementSection = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [resending, setResending] = useState<string | null>(null);
  const [backfilling, setBackfilling] = useState(false);
  const [activeSubtab, setActiveSubtab] = useState("all");
  
  // Bulk resend state
  const [bulkResendOpen, setBulkResendOpen] = useState(false);
  const [bulkResending, setBulkResending] = useState(false);
  const [bulkResendProgress, setBulkResendProgress] = useState({ sent: 0, total: 0, skipped: 0 });

  // Mark-as-paid dialog state
  const [markPaidInvoice, setMarkPaidInvoice] = useState<InvoiceRow | null>(null);
  const [markPaidMethod, setMarkPaidMethod] = useState("cheque");
  const [markPaidDate, setMarkPaidDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [markPaidReference, setMarkPaidReference] = useState("");
  const [markPaidNote, setMarkPaidNote] = useState("");
  const [markPaidSaving, setMarkPaidSaving] = useState(false);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, booking_code, booking_id, client_email, client_name, status, document_status, subtotal, tax, surge_amount, rush_amount, total, refund_amount, refund_status, service_type, duration_hours, created_at, html_snapshot, stripe_payment_intent_id, payer_type, payer_name, payment_terms_days, due_date, paid_at, payment_method, payment_reference, payment_note, manually_marked_paid_by")
      .eq("invoice_type", "client_invoice")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error fetching invoices:", error.message, error.code, error.details);
      toast.error(`Failed to load invoices: ${error.message || "Unknown error"}`);
    } else {
      const safe = (data || []).map((row: any) => ({
        ...row,
        subtotal: Number(row.subtotal) || 0,
        tax: Number(row.tax) || 0,
        surge_amount: Number(row.surge_amount) || 0,
        rush_amount: Number(row.rush_amount) || 0,
        total: Number(row.total) || 0,
        refund_amount: Number(row.refund_amount) || 0,
      }));
      setInvoices(safe as InvoiceRow[]);
    }
    setLoading(false);
  };

  // Backfill invoices for ALL bookings that don't have one (completed, active, pending, cancelled, archived)
  const backfillInvoices = async () => {
    setBackfilling(true);
    try {
      const { data: bookings, error: bError } = await supabase
        .from("bookings")
        .select("id, booking_code, client_email, client_name, subtotal, total, surge_amount, hours, service_type, stripe_payment_intent_id, payment_status, status, payer_type, payer_name, payment_terms_days, due_date, is_taxable, hst_amount")
        .not("status", "eq", "refunded");

      if (bError) throw bError;
      if (!bookings || bookings.length === 0) {
        toast.info("No bookings to backfill.");
        setBackfilling(false);
        return;
      }

      const { data: existingInvoices } = await supabase
        .from("invoices")
        .select("booking_id")
        .eq("invoice_type", "client_invoice");

      const existingIds = new Set((existingInvoices || []).map((i: any) => i.booking_id));
      const missing = bookings.filter((b: any) => !existingIds.has(b.id));

      if (missing.length === 0) {
        toast.info("All bookings already have invoices.");
        setBackfilling(false);
        return;
      }

      let created = 0;
      for (const b of missing) {
        const surgeAmount = Number(b.surge_amount) || 0;
        const TAXABLE_KW = ["doctor", "escort", "appointment", "hospital", "discharge", "pick-up", "pickup"];
        const isTaxable = b.is_taxable === true || (b.is_taxable == null && Array.isArray(b.service_type) && b.service_type.some((st: string) => TAXABLE_KW.some(kw => st.toLowerCase().includes(kw))));
        const hstAmount = (b.hst_amount != null && b.hst_amount > 0)
          ? Number(b.hst_amount)
          : (isTaxable ? Number(((b.total || 0) - ((b.total || 0) / 1.13)).toFixed(2)) : 0);
        const invoiceNumber = `PSW-INV-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}${created}`;

        // Determine document_status based on booking payment state
        let docStatus = "pending_payment";
        if (b.payment_status === "paid") {
          docStatus = "paid";
        } else if (b.status === "cancelled") {
          docStatus = "cancelled";
        }

        const { error: insertErr } = await supabase
          .from("invoices")
          .upsert({
            booking_id: b.id,
            invoice_number: invoiceNumber,
            booking_code: b.booking_code,
            client_email: b.client_email,
            client_name: b.client_name,
            invoice_type: "client_invoice",
            subtotal: b.subtotal || 0,
            tax: hstAmount,
            surge_amount: surgeAmount,
            rush_amount: 0,
            total: b.total || 0,
            currency: "CAD",
            status: "generated",
            document_status: docStatus,
            service_type: Array.isArray(b.service_type) ? b.service_type.join(", ") : (b.service_type || "Home Care"),
            duration_hours: b.hours,
            stripe_payment_intent_id: b.stripe_payment_intent_id,
            payer_type: b.payer_type || "client",
            payer_name: b.payer_name,
            payment_terms_days: b.payment_terms_days,
            due_date: b.due_date,
            paid_at: b.payment_status === "paid" ? new Date().toISOString() : null,
            payment_method: b.stripe_payment_intent_id ? "stripe" : null,
          }, { onConflict: "booking_id,invoice_type" });

        if (!insertErr) created++;
      }

      toast.success(`Backfilled ${created} invoice(s) from bookings.`);
      await fetchInvoices();
    } catch (e: any) {
      toast.error(`Backfill failed: ${e.message || "Unknown error"}`);
    }
    setBackfilling(false);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const isPending = (inv: InvoiceRow) =>
    ["pending", "invoice-pending", "pending_payment"].includes(inv.document_status) ||
    (inv.document_status !== "paid" && inv.document_status !== "cancelled" && inv.document_status !== "refunded" && inv.document_status !== "partially_refunded");

  const isPaid = (inv: InvoiceRow) => inv.document_status === "paid";

  const isStripePaid = (inv: InvoiceRow) =>
    isPaid(inv) && !!inv.stripe_payment_intent_id && (inv.payment_method === "stripe" || !inv.payment_method);

  const canManuallyMarkPaid = (inv: InvoiceRow) => isPending(inv);

  // Filter by search
  const searchFilter = (list: InvoiceRow[]) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(inv =>
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.booking_code?.toLowerCase().includes(q) ||
      inv.client_name?.toLowerCase().includes(q) ||
      inv.client_email?.toLowerCase().includes(q) ||
      inv.payer_name?.toLowerCase().includes(q)
    );
  };

  const pendingInvoices = useMemo(() => searchFilter(invoices.filter(isPending)), [invoices, search]);
  const paidInvoices = useMemo(() => searchFilter(invoices.filter(isPaid)), [invoices, search]);
  const allInvoices = useMemo(() => searchFilter(invoices), [invoices, search]);

  const handleView = async (inv: InvoiceRow) => {
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", inv.booking_id)
      .maybeSingle();

    if (booking) {
      const invoiceData = buildInvoiceDataFromBooking(booking, inv);
      viewInvoice(invoiceData);
    } else if (inv.html_snapshot) {
      const win = window.open("", "_blank");
      if (win) { win.document.write(inv.html_snapshot); win.document.close(); }
    } else {
      toast.error("No invoice data available");
    }
  };

  const handleDownload = async (inv: InvoiceRow) => {
    const { data: booking } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", inv.booking_id)
      .maybeSingle();

    if (booking) {
      const invoiceData = buildInvoiceDataFromBooking(booking, inv);
      downloadInvoicePdf(invoiceData);
    } else if (inv.html_snapshot) {
      const win = window.open("", "_blank");
      if (win) {
        win.document.write(inv.html_snapshot);
        win.document.close();
        setTimeout(() => win.print(), 400);
      }
    } else {
      toast.error("No invoice data available");
    }
  };

  const handleResend = async (inv: InvoiceRow) => {
    setResending(inv.id);
    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", inv.booking_id)
        .maybeSingle();

      const html = booking
        ? generateInvoiceHtml(buildInvoiceDataFromBooking(booking, inv))
        : inv.html_snapshot;

      if (!html) { toast.error("No invoice HTML available"); setResending(null); return; }

      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          to: inv.client_email,
          subject: `Invoice ${inv.invoice_number} — PSW Direct`,
          body: html,
          htmlBody: html,
          template_key: "psa-client-invoice",
        },
      });
      if (error) throw error;
      toast.success(`Invoice resent to ${inv.client_email}`);

      await supabase.from("invoices").update({ status: "sent" }).eq("id", inv.id);
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "sent" } : i));
    } catch (e: any) {
      toast.error(`Resend failed: ${e.message || "Unknown error"}`);
    }
    setResending(null);
  };

  const openMarkPaidDialog = (inv: InvoiceRow) => {
    setMarkPaidInvoice(inv);
    setMarkPaidMethod("cheque");
    setMarkPaidDate(format(new Date(), "yyyy-MM-dd"));
    setMarkPaidReference("");
    setMarkPaidNote("");
  };

  const handleMarkAsPaidSubmit = async () => {
    if (!markPaidInvoice || !markPaidMethod) return;
    setMarkPaidSaving(true);
    try {
      const paidAt = new Date(markPaidDate + "T12:00:00").toISOString();
      const adminIdentity = user?.email || "admin";

      await supabase.from("invoices").update({
        document_status: "paid",
        paid_at: paidAt,
        payment_method: markPaidMethod,
        payment_reference: markPaidReference.trim() || null,
        payment_note: markPaidNote.trim() || null,
        manually_marked_paid_by: adminIdentity,
      } as any).eq("id", markPaidInvoice.id);

      // Also update booking payment_status
      await supabase.from("bookings").update({
        payment_status: "paid",
      }).eq("id", markPaidInvoice.booking_id);

      setInvoices(prev => prev.map(i => i.id === markPaidInvoice.id ? {
        ...i,
        document_status: "paid",
        paid_at: paidAt,
        payment_method: markPaidMethod,
        payment_reference: markPaidReference.trim() || null,
        payment_note: markPaidNote.trim() || null,
        manually_marked_paid_by: adminIdentity,
      } : i));

      toast.success(`Invoice ${markPaidInvoice.invoice_number} marked as paid via ${paymentMethodLabel(markPaidMethod)}`);
      setMarkPaidInvoice(null);
    } catch (e: any) {
      toast.error(`Failed: ${e.message || "Unknown error"}`);
    }
    setMarkPaidSaving(false);
  };

  // Bulk resend corrected invoices
  const handleBulkResendCorrected = async () => {
    setBulkResending(true);
    try {
      // Get already-resent invoice IDs from app_settings
      const { data: settingRow } = await supabase
        .from("app_settings")
        .select("setting_value")
        .eq("setting_key", "address_correction_resent_ids")
        .maybeSingle();

      const alreadyResent: string[] = settingRow?.setting_value 
        ? JSON.parse(settingRow.setting_value) 
        : [];
      const alreadyResentSet = new Set(alreadyResent);

      // Get all non-cancelled invoices
      const eligible = invoices.filter(
        inv => !["cancelled"].includes(inv.document_status) && !alreadyResentSet.has(inv.id)
      );

      setBulkResendProgress({ sent: 0, total: eligible.length, skipped: 0 });

      if (eligible.length === 0) {
        toast.info("All invoices have already been resent with the corrected address.");
        setBulkResending(false);
        setBulkResendOpen(false);
        return;
      }

      const newlyResent: string[] = [];
      let skipped = 0;

      for (let i = 0; i < eligible.length; i++) {
        const inv = eligible[i];
        try {
          // Fetch booking to regenerate HTML with updated address
          const { data: booking } = await supabase
            .from("bookings")
            .select("*")
            .eq("id", inv.booking_id)
            .maybeSingle();

          const html = booking
            ? generateInvoiceHtml(buildInvoiceDataFromBooking(booking, inv))
            : null;

          if (!html) {
            skipped++;
            setBulkResendProgress(p => ({ ...p, skipped: skipped }));
            continue;
          }

          // Send email
          const { error } = await supabase.functions.invoke("send-email", {
            body: {
              to: inv.client_email,
              subject: `Updated Invoice – Address Correction (No Action Required)`,
              body: html,
              htmlBody: `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 680px; margin: 0 auto; padding: 20px;">
                  <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                    This is an updated copy of your invoice with corrected provider address information.<br /><br />
                    No changes have been made to services, amounts, or payment status.
                  </p>
                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />
                  ${html}
                </div>`,
              template_key: "invoice-address-correction",
            },
          });

          if (error) {
            console.error(`Failed to resend invoice ${inv.invoice_number}:`, error);
            skipped++;
          } else {
            newlyResent.push(inv.id);
          }
        } catch (e) {
          console.error(`Error resending invoice ${inv.invoice_number}:`, e);
          skipped++;
        }
        setBulkResendProgress({ sent: newlyResent.length, total: eligible.length, skipped });
      }

      // Save resent IDs to prevent duplicates
      const allResent = [...alreadyResent, ...newlyResent];
      await supabase.from("app_settings").upsert({
        setting_key: "address_correction_resent_ids",
        setting_value: JSON.stringify(allResent),
      }, { onConflict: "setting_key" });

      // Log the action
      await supabase.from("app_settings").upsert({
        setting_key: "address_correction_resent_at",
        setting_value: JSON.stringify({
          resent_at: new Date().toISOString(),
          resent_reason: "address_correction",
          total_sent: newlyResent.length,
          total_skipped: skipped,
          admin: user?.email || "admin",
        }),
      }, { onConflict: "setting_key" });

      toast.success(`Resent ${newlyResent.length} corrected invoice(s)${skipped > 0 ? `, ${skipped} skipped` : ""}`);
      setBulkResendOpen(false);
    } catch (e: any) {
      toast.error(`Bulk resend failed: ${e.message || "Unknown error"}`);
    }
    setBulkResending(false);
  };

  const handleCopyLink = (inv: InvoiceRow) => {
    const lines = [
      `Invoice: ${inv.invoice_number}`,
      `Order: ${inv.booking_code}`,
      `Client: ${inv.client_name || "—"} (${inv.client_email})`,
      inv.payer_type === "insurance" && inv.payer_name ? `Payer: ${inv.payer_name} (Insurance)` : null,
      inv.service_type ? `Service: ${inv.service_type}` : null,
      inv.duration_hours ? `Duration: ${inv.duration_hours}h` : null,
      `Subtotal: $${inv.subtotal.toFixed(2)}`,
      inv.surge_amount > 0 ? `Surge: $${inv.surge_amount.toFixed(2)}` : null,
      inv.rush_amount > 0 ? `Rush: $${inv.rush_amount.toFixed(2)}` : null,
      inv.tax > 0 ? `HST: $${inv.tax.toFixed(2)}` : null,
      `Total: $${inv.total.toFixed(2)} CAD`,
      inv.refund_amount > 0 ? `Refund: -$${inv.refund_amount.toFixed(2)}${inv.refund_status ? ` (${inv.refund_status})` : ""}` : null,
      `Status: ${inv.document_status || inv.status}`,
      inv.payment_method ? `Payment Method: ${paymentMethodLabel(inv.payment_method)}` : null,
      inv.payment_reference ? `Reference: ${inv.payment_reference}` : null,
      inv.paid_at ? `Paid: ${format(new Date(inv.paid_at), "MMM d, yyyy")}` : null,
      inv.due_date ? `Due: ${format(new Date(inv.due_date), "MMM d, yyyy")}` : null,
      inv.payment_note ? `Note: ${inv.payment_note}` : null,
      `Issued: ${format(new Date(inv.created_at), "MMM d, yyyy")}`,
      inv.stripe_payment_intent_id ? `Stripe Ref: ${inv.stripe_payment_intent_id}` : null,
      "",
      "— PSW Direct",
    ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(lines);
    toast.success("Invoice details copied to clipboard");
  };

  const renderInvoiceRow = (inv: InvoiceRow) => (
    <TableRow key={inv.id}>
      <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
      <TableCell className="font-mono text-xs">{inv.booking_code}</TableCell>
      <TableCell>
        <div className="text-sm">{inv.client_name || "—"}</div>
        <div className="text-xs text-muted-foreground">{inv.client_email}</div>
        {inv.payer_type && (
          <Badge variant="outline" className="text-xs mt-0.5 capitalize">
            {inv.payer_type === "insurance" && inv.payer_name ? inv.payer_name : inv.payer_type}
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right font-medium">
        ${inv.total.toFixed(2)}
        {inv.refund_amount > 0 && (
          <div className="text-xs text-destructive">-${inv.refund_amount.toFixed(2)} refund</div>
        )}
      </TableCell>
      <TableCell>
        <Badge className={`text-xs ${statusColors[inv.document_status] || "bg-muted text-muted-foreground"}`}>
          {inv.document_status === "invoice-pending" ? "Pending" : inv.document_status === "pending_payment" ? "Pending" : inv.document_status}
        </Badge>
      </TableCell>
      <TableCell className="text-xs">
        {inv.payment_method ? (
          <span className="text-foreground font-medium">{paymentMethodLabel(inv.payment_method)}</span>
        ) : inv.stripe_payment_intent_id && isPaid(inv) ? (
          <span className="text-foreground font-medium">Stripe</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">
        {inv.paid_at ? format(new Date(inv.paid_at), "MMM d, yyyy") : inv.due_date ? (
          <span className="text-yellow-700">Due {format(new Date(inv.due_date), "MMM d")}</span>
        ) : "—"}
      </TableCell>
      <TableCell>
        <div className="flex gap-1 justify-end">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleView(inv)} title="View Invoice">
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDownload(inv)} title="Download PDF">
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleResend(inv)} disabled={resending === inv.id} title="Resend Email">
            <Mail className={`w-4 h-4 ${resending === inv.id ? "animate-spin" : ""}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleCopyLink(inv)} title="Copy Reference">
            <Copy className="w-4 h-4" />
          </Button>
          {canManuallyMarkPaid(inv) && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:text-green-700"
              onClick={() => openMarkPaidDialog(inv)}
              title="Mark as Paid"
            >
              <CheckCircle className="w-4 h-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  const renderTable = (data: InvoiceRow[]) => (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Invoice #</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Client / Payer</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Paid / Due</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading invoices...</TableCell></TableRow>
            ) : data.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
            ) : data.map(renderInvoiceRow)}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Invoices & Receivables</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Track pending payments, insurance billing, and completed invoices.
        </p>
      </div>

      {/* Stats summary — excludes cancelled and test invoices from financial metrics */}
      {(() => {
        const TEST_NAMES = ["test admin", "test user", "test"];
        const isTestInvoice = (inv: InvoiceRow) =>
          TEST_NAMES.includes((inv.client_name || "").toLowerCase().trim());
        const isCancelled = (inv: InvoiceRow) => inv.document_status === "cancelled";
        const validInvoices = invoices.filter(i => !isCancelled(i) && !isTestInvoice(i));
        const validPaid = validInvoices.filter(isPaid);
        const validPending = validInvoices.filter(isPending);
        const cancelledInvoices = invoices.filter(isCancelled);

        return (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-foreground">{validInvoices.length}</p>
              <p className="text-xs text-muted-foreground">Total Invoices</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-emerald-700">${validPaid.reduce((s, i) => s + i.total, 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Paid Revenue</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-yellow-700">${validPending.reduce((s, i) => s + i.total, 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pending Amount ({validPending.length})</p>
            </CardContent></Card>
            <Card><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-700">{validInvoices.filter(i => i.payer_type === "insurance").length}</p>
              <p className="text-xs text-muted-foreground">Insurance</p>
            </CardContent></Card>
            <Card className="border-dashed"><CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{cancelledInvoices.length}</p>
              <p className="text-xs text-muted-foreground">Cancelled</p>
            </CardContent></Card>
          </div>
        );
      })()}

      {/* Search + Actions */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice #, booking, client, payer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        <Button variant="outline" size="sm" onClick={backfillInvoices} disabled={backfilling} title="Generate invoice records for all bookings missing invoices">
          {backfilling ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          Backfill Missing
        </Button>
        <Button variant="outline" size="sm" onClick={() => setBulkResendOpen(true)} className="text-amber-700 border-amber-300 hover:bg-amber-50">
          <Send className="w-4 h-4 mr-2" />
          Resend Corrected Invoices
        </Button>
      </div>

      {/* Primary invoice state controls */}
      <div className="flex items-center gap-1 rounded-lg bg-muted p-1 w-fit">
        {[
          { key: "all", label: "All", icon: FileText, count: allInvoices.length },
          { key: "pending", label: "Pending", icon: Clock, count: pendingInvoices.length },
          { key: "paid", label: "Paid", icon: DollarSign, count: paidInvoices.length },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveSubtab(key)}
            className={`inline-flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition-all ${
              activeSubtab === key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label} ({count})
          </button>
        ))}
      </div>

      {/* Invoice table for active filter */}
      <div className="mt-3">
        {activeSubtab === "all" && renderTable(allInvoices)}
        {activeSubtab === "pending" && renderTable(pendingInvoices)}
        {activeSubtab === "paid" && renderTable(paidInvoices)}
      </div>

      {/* Mark as Paid Dialog */}
      <Dialog open={!!markPaidInvoice} onOpenChange={(open) => !open && setMarkPaidInvoice(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
          </DialogHeader>
          {markPaidInvoice && (
            <div className="space-y-4">
              <div className="rounded-md bg-muted p-3 text-sm space-y-1">
                <div><span className="font-medium">Invoice:</span> {markPaidInvoice.invoice_number}</div>
                <div><span className="font-medium">Order:</span> {markPaidInvoice.booking_code}</div>
                <div><span className="font-medium">Client:</span> {markPaidInvoice.client_name || markPaidInvoice.client_email}</div>
                <div><span className="font-medium">Total:</span> ${markPaidInvoice.total.toFixed(2)} CAD</div>
                {markPaidInvoice.payer_type === "insurance" && markPaidInvoice.payer_name && (
                  <div><span className="font-medium">Payer:</span> {markPaidInvoice.payer_name} (Insurance)</div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-method">Payment Method *</Label>
                <Select value={markPaidMethod} onValueChange={setMarkPaidMethod}>
                  <SelectTrigger id="payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map(m => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paid-date">Paid Date</Label>
                <Input
                  id="paid-date"
                  type="date"
                  value={markPaidDate}
                  onChange={e => setMarkPaidDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-ref">Payment Reference <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  id="payment-ref"
                  placeholder="e.g. Cheque #1234, Transfer ref..."
                  value={markPaidReference}
                  onChange={e => setMarkPaidReference(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-note">Note <span className="text-muted-foreground">(optional)</span></Label>
                <Textarea
                  id="payment-note"
                  placeholder="Any additional notes..."
                  value={markPaidNote}
                  onChange={e => setMarkPaidNote(e.target.value)}
                  rows={2}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setMarkPaidInvoice(null)} disabled={markPaidSaving}>
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaidSubmit} disabled={markPaidSaving || !markPaidMethod}>
              {markPaidSaving ? "Saving..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
