// Invoice Management Section — Admin tab for viewing, filtering, and managing invoices

import { useState, useEffect, useMemo } from "react";
import { FileText, Download, Mail, Search, Filter, RefreshCw, Eye, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { buildInvoiceDataFromBooking, viewInvoice, downloadInvoicePdf, generateInvoiceHtml } from "./InvoiceDocument";
import type { InvoiceData } from "./InvoiceDocument";

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
}

const statusColors: Record<string, string> = {
  paid: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
  refunded: "bg-red-100 text-red-800 border-red-200",
  partially_refunded: "bg-amber-100 text-amber-800 border-amber-200",
  generated: "bg-blue-100 text-blue-800 border-blue-200",
  sent: "bg-green-100 text-green-800 border-green-200",
  email_failed: "bg-red-100 text-red-800 border-red-200",
};

export const InvoiceManagementSection = () => {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [resending, setResending] = useState<string | null>(null);

  const fetchInvoices = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("id, invoice_number, booking_code, booking_id, client_email, client_name, status, document_status, subtotal, tax, surge_amount, rush_amount, total, refund_amount, refund_status, service_type, duration_hours, created_at, html_snapshot, stripe_payment_intent_id")
      .eq("invoice_type", "client_invoice")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("Error fetching invoices:", error.message, error.code, error.details);
      toast.error(`Failed to load invoices: ${error.message || "Unknown error"}`);
    } else {
      // Defensive: ensure numeric fields default to 0 for legacy rows
      const safe = (data || []).map((row: any) => ({
        ...row,
        subtotal: Number(row.subtotal) || 0,
        tax: Number(row.tax) || 0,
        surge_amount: Number(row.surge_amount) || 0,
        rush_amount: Number(row.rush_amount) || 0,
        total: Number(row.total) || 0,
        refund_amount: Number(row.refund_amount) || 0,
      }));
      setInvoices(safe as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchInvoices(); }, []);

  const filtered = useMemo(() => {
    let result = invoices;
    if (statusFilter !== "all") {
      result = result.filter(inv => inv.document_status === statusFilter || inv.status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(inv =>
        inv.invoice_number?.toLowerCase().includes(q) ||
        inv.booking_code?.toLowerCase().includes(q) ||
        inv.client_name?.toLowerCase().includes(q) ||
        inv.client_email?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [invoices, statusFilter, search]);

  const handleView = async (inv: InvoiceRow) => {
    // Try to fetch full booking data for rich invoice
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
      // Generate fresh HTML from booking data
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

      // Update status
      await supabase.from("invoices").update({ status: "sent" }).eq("id", inv.id);
      setInvoices(prev => prev.map(i => i.id === inv.id ? { ...i, status: "sent" } : i));
    } catch (e: any) {
      toast.error(`Resend failed: ${e.message || "Unknown error"}`);
    }
    setResending(null);
  };

  const handleCopyLink = (inv: InvoiceRow) => {
    navigator.clipboard.writeText(`Invoice: ${inv.invoice_number} | Booking: ${inv.booking_code} | Total: $${inv.total.toFixed(2)}`);
    toast.success("Invoice reference copied");
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Invoices & Receipts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          View, download, and resend client invoices. All totals match Stripe and order records.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoice #, booking code, client..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="refunded">Refunded</SelectItem>
            <SelectItem value="partially_refunded">Partially Refunded</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={fetchInvoices} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-foreground">{invoices.length}</p>
          <p className="text-xs text-muted-foreground">Total Invoices</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-green-700">${invoices.filter(i => i.document_status === "paid").reduce((s, i) => s + i.total, 0).toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">Paid Revenue</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-amber-700">{invoices.filter(i => i.document_status === "partially_refunded" || i.document_status === "refunded").length}</p>
          <p className="text-xs text-muted-foreground">Refunds</p>
        </CardContent></Card>
        <Card><CardContent className="p-4 text-center">
          <p className="text-2xl font-bold text-red-700">{invoices.filter(i => i.document_status === "cancelled").length}</p>
          <p className="text-xs text-muted-foreground">Cancelled</p>
        </CardContent></Card>
      </div>

      {/* Invoice table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading invoices...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No invoices found</TableCell></TableRow>
              ) : filtered.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono text-xs">{inv.invoice_number}</TableCell>
                  <TableCell className="font-mono text-xs">{inv.booking_code}</TableCell>
                  <TableCell>
                    <div className="text-sm">{inv.client_name || "—"}</div>
                    <div className="text-xs text-muted-foreground">{inv.client_email}</div>
                  </TableCell>
                  <TableCell className="text-sm">{inv.service_type || "—"}</TableCell>
                  <TableCell className="text-right font-medium">
                    ${inv.total.toFixed(2)}
                    {inv.refund_amount > 0 && (
                      <div className="text-xs text-destructive">-${inv.refund_amount.toFixed(2)} refund</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={`text-xs ${statusColors[inv.document_status] || statusColors[inv.status] || "bg-muted text-muted-foreground"}`}>
                      {inv.document_status || inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(inv.created_at), "MMM d, yyyy")}
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
