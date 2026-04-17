// Billing Adjustments — admin-only sub-tab inside Invoices.
// Lists bookings with billing_adjustment_required = true OR an adjustment record.
// Provides a modal to set final_billable_hours, charge saved card off-session,
// send an adjustment invoice, mark no-charge, or mark handled manually.

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  AlertTriangle, CheckCircle, CreditCard, Send, XCircle, RefreshCw, Search, Receipt,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";

export interface AdjustmentRow {
  id: string;
  booking_code: string;
  client_name: string;
  client_email: string;
  scheduled_date: string;
  service_type: string[];
  hours: number;                     // booked
  hourly_rate: number;
  is_taxable: boolean;
  final_billable_hours: number | null;
  suggested_billable_hours: number | null;
  adjustment_amount: number | null;
  adjustment_status: string | null;
  billing_adjustment_required: boolean;
  billing_note: string | null;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  stripe_adjustment_payment_intent_id: string | null;
  stripe_adjustment_status: string | null;
  adjustment_invoice_id: string | null;
  adjustment_failure_reason: string | null;
  adjustment_charged_at: string | null;
  adjustment_charged_by: string | null;
}

const STATUS_LABEL: Record<string, { label: string; cls: string }> = {
  needs_action:     { label: "Needs Action",     cls: "bg-amber-100 text-amber-800 border-amber-200" },
  charged:          { label: "Charged",          cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  failed:           { label: "Failed",           cls: "bg-red-100 text-red-800 border-red-200" },
  sent_invoice:    { label: "Sent Invoice",     cls: "bg-blue-100 text-blue-800 border-blue-200" },
  no_charge:        { label: "No Charge",        cls: "bg-muted text-muted-foreground border" },
  handled_manually: { label: "Handled Manually", cls: "bg-muted text-muted-foreground border" },
};

const statusBadge = (s: string | null) => {
  const key = (s || "needs_action").toLowerCase();
  const cfg = STATUS_LABEL[key] || STATUS_LABEL.needs_action;
  return <Badge variant="outline" className={`text-xs ${cfg.cls}`}>{cfg.label}</Badge>;
};

const round2 = (n: number) => +(Math.round(n * 100) / 100).toFixed(2);

export const BillingAdjustmentsSection = () => {
  const [rows, setRows] = useState<AdjustmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<AdjustmentRow | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(`
        id, booking_code, client_name, client_email, scheduled_date, service_type,
        hours, hourly_rate, is_taxable,
        final_billable_hours, suggested_billable_hours,
        adjustment_amount, adjustment_status, billing_adjustment_required, billing_note,
        stripe_customer_id, stripe_payment_method_id,
        stripe_adjustment_payment_intent_id, stripe_adjustment_status,
        adjustment_invoice_id, adjustment_failure_reason,
        adjustment_charged_at, adjustment_charged_by
      `)
      .or("billing_adjustment_required.eq.true,adjustment_status.not.is.null,suggested_billable_hours.not.is.null")
      .order("scheduled_date", { ascending: false })
      .limit(300);

    if (error) {
      console.error("fetch billing adjustments failed", error);
      toast.error(`Failed to load adjustments: ${error.message}`);
      setRows([]);
    } else {
      setRows((data || []) as any);
    }
    setLoading(false);
  };

  useEffect(() => { fetchRows(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.booking_code?.toLowerCase().includes(q) ||
      r.client_name?.toLowerCase().includes(q) ||
      r.client_email?.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const needsActionCount = rows.filter(r => r.billing_adjustment_required).length;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-base font-semibold text-foreground">Adjustment Charges</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Bill clients for additional approved time. Original payment is never modified.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {needsActionCount > 0 && (
            <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">
              {needsActionCount} needs action
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by order, client, or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Service Date</TableHead>
                <TableHead className="text-right">Booked</TableHead>
                <TableHead className="text-right">Billable</TableHead>
                <TableHead className="text-right">Variance</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={9} className="text-center py-8 text-muted-foreground">No billing adjustments.</TableCell></TableRow>
              ) : filtered.map(r => {
                const booked = Number(r.hours) || 0;
                const billable = r.final_billable_hours != null ? Number(r.final_billable_hours) : booked;
                const variance = round2(billable - booked);
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.booking_code}</TableCell>
                    <TableCell>
                      <div className="text-sm">{r.client_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.client_email}</div>
                    </TableCell>
                    <TableCell className="text-xs">{r.scheduled_date ? format(new Date(r.scheduled_date), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-right text-sm">{booked.toFixed(2)}h</TableCell>
                    <TableCell className="text-right text-sm">
                      {billable.toFixed(2)}h
                      {r.suggested_billable_hours != null && r.final_billable_hours == null && (
                        <div className="text-[10px] text-amber-700">suggested {Number(r.suggested_billable_hours).toFixed(2)}h</div>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      <span className={variance > 0 ? "text-amber-700 font-medium" : "text-muted-foreground"}>
                        {variance > 0 ? "+" : ""}{variance.toFixed(2)}h
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      ${(Number(r.adjustment_amount) || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{statusBadge(r.adjustment_status)}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => setActive(r)}>
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <BillingAdjustmentModal
        row={active}
        onClose={() => setActive(null)}
        onChanged={() => { setActive(null); fetchRows(); }}
      />
    </div>
  );
};

// ----------------- Modal -----------------

interface ModalProps {
  row: AdjustmentRow | null;
  onClose: () => void;
  onChanged: () => void;
}

export const BillingAdjustmentModal = ({ row, onClose, onChanged }: ModalProps) => {
  const [billable, setBillable] = useState<string>("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    const initial = row.final_billable_hours != null
      ? Number(row.final_billable_hours)
      : (row.suggested_billable_hours != null
          ? Number(row.suggested_billable_hours)
          : Number(row.hours) || 0);
    setBillable(initial.toFixed(2));
    setNote(row.billing_note || "");
  }, [row?.id]);

  if (!row) return null;

  const booked = Number(row.hours) || 0;
  const rate = Number(row.hourly_rate) || 0;
  const billableNum = Number(billable) || 0;
  const variance = round2(billableNum - booked);
  const subtotal = round2(Math.max(variance, 0) * rate);
  const tax = row.is_taxable ? round2(subtotal * 0.13) : 0;
  const total = round2(subtotal + tax);

  const hasSavedCard = !!(row.stripe_customer_id && row.stripe_payment_method_id);
  const stripeStatus = (row.stripe_adjustment_status || "").toLowerCase();
  const adjStatus = (row.adjustment_status || "").toLowerCase();
  const alreadyCharged = stripeStatus === "succeeded" || adjStatus === "charged";
  const chargeProcessing = stripeStatus === "processing";
  const isClosed = ["charged","sent_invoice","no_charge","handled_manually"].includes(adjStatus);
  const canCharge = variance > 0.05 && total > 0 && hasSavedCard && !isClosed && !alreadyCharged && !chargeProcessing;

  const saveBillable = async () => {
    setBusy("save");
    const { data, error } = await supabase.rpc("admin_set_billable_hours", {
      p_booking_id: row.id,
      p_billable_hours: billableNum,
      p_note: note || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Billable hours saved");
    onChanged();
  };

  const chargeCard = async () => {
    // Client-side guards against double-submit
    if (busy) return;
    if (alreadyCharged) {
      toast.error("This adjustment has already been charged.");
      return;
    }
    if (chargeProcessing) {
      toast.error("A charge is already processing for this adjustment.");
      return;
    }
    setBusy("charge");
    try {
      // Persist billable hours first so server has source of truth
      await supabase.rpc("admin_set_billable_hours", {
        p_booking_id: row.id,
        p_billable_hours: billableNum,
        p_note: note || null,
      });
      const { data, error } = await supabase.functions.invoke("charge-billing-adjustment", {
        body: { bookingId: row.id },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(`Charged $${data.amount.toFixed(2)} to saved card`);
        onChanged();
      } else if (data?.error === "already_charged") {
        toast.error("This adjustment was already charged.");
        onChanged();
      } else {
        toast.error(`Charge failed: ${data?.error || "Unknown error"}`);
        onChanged();
      }
    } catch (e: any) {
      toast.error(`Charge error: ${e?.message || "Unknown"}`);
    }
    setBusy(null);
  };

  const sendInvoice = async () => {
    if (variance <= 0.05) {
      toast.error("No positive variance — nothing to invoice.");
      return;
    }
    setBusy("invoice");
    try {
      // Save billable first
      await supabase.rpc("admin_set_billable_hours", {
        p_booking_id: row.id,
        p_billable_hours: billableNum,
        p_note: note || null,
      });

      const invoiceNumber = `PSW-INV-ADJ-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const { data: inv, error: insErr } = await supabase
        .from("invoices")
        .insert({
          booking_id: row.id,
          booking_code: row.booking_code,
          invoice_number: invoiceNumber,
          client_email: row.client_email,
          client_name: row.client_name,
          invoice_type: "client_adjustment",
          subtotal, tax, surge_amount: 0, rush_amount: 0, total,
          currency: "CAD",
          status: "generated",
          document_status: "pending_payment",
          service_type: "Billing Adjustment",
          duration_hours: variance,
        })
        .select("id").single();

      if (insErr) throw insErr;

      await supabase.rpc("admin_record_adjustment_invoice_sent", {
        p_booking_id: row.id,
        p_adjustment_invoice_id: inv.id,
        p_amount: total,
      });

      toast.success("Adjustment invoice created");
      onChanged();
    } catch (e: any) {
      toast.error(`Failed: ${e?.message || "Unknown"}`);
    }
    setBusy(null);
  };

  const markNoCharge = async () => {
    setBusy("no_charge");
    const { error } = await supabase.rpc("admin_mark_billing_no_charge", {
      p_booking_id: row.id, p_note: note || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as No Charge");
    onChanged();
  };

  const markHandled = async () => {
    setBusy("handled");
    const { error } = await supabase.rpc("admin_mark_billing_handled_v2", {
      p_booking_id: row.id, p_note: note || null,
    });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success("Marked as Handled");
    onChanged();
  };

  return (
    <Dialog open={!!row} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5" /> Billing Adjustment — {row.booking_code}
          </DialogTitle>
          <DialogDescription>
            Adjust client billing only. PSW payroll is unaffected by this action.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <div><span className="font-medium">Client:</span> {row.client_name || "—"} ({row.client_email})</div>
            <div><span className="font-medium">Service:</span> {(row.service_type || []).join(", ") || "—"}</div>
            <div><span className="font-medium">Date:</span> {row.scheduled_date ? format(new Date(row.scheduled_date), "MMM d, yyyy") : "—"}</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium">Status:</span> {statusBadge(row.adjustment_status)}
              {alreadyCharged && (
                <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-200 text-[10px]">
                  <CheckCircle className="w-3 h-3 mr-1" /> Already Charged
                </Badge>
              )}
              {chargeProcessing && (
                <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-200 text-[10px]">
                  Processing…
                </Badge>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Booked Hours</Label>
              <Input value={booked.toFixed(2)} readOnly className="bg-muted" />
            </div>
            <div>
              <Label className="text-xs">Final Billable Hours (editable)</Label>
              <Input
                type="number" step="0.25" min="0"
                value={billable}
                onChange={e => setBillable(e.target.value)}
                disabled={isClosed}
              />
              {row.suggested_billable_hours != null && row.final_billable_hours == null && (
                <p className="text-[11px] text-amber-700 mt-1">
                  Suggested from payroll: {Number(row.suggested_billable_hours).toFixed(2)}h
                </p>
              )}
            </div>
          </div>

          <div className="rounded-md border p-3 text-sm space-y-1 bg-background">
            <div className="flex justify-between"><span>Client rate</span><span>${rate.toFixed(2)}/h</span></div>
            <div className="flex justify-between"><span>Variance</span><span className={variance > 0 ? "text-amber-700 font-medium" : ""}>{variance > 0 ? "+" : ""}{variance.toFixed(2)}h</span></div>
            <div className="flex justify-between"><span>Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>HST {row.is_taxable ? "(13%)" : "(none)"}</span><span>${tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-semibold border-t pt-1 mt-1"><span>Adjustment Total</span><span>${total.toFixed(2)}</span></div>
          </div>

          <div className="text-xs text-muted-foreground">
            Saved card: {hasSavedCard ? <span className="text-emerald-700 font-medium">Available</span> : <span className="text-amber-700">Not on file</span>}
          </div>

          <div>
            <Label className="text-xs">Billing Note (optional)</Label>
            <Textarea rows={2} value={note} onChange={e => setNote(e.target.value)} disabled={isClosed} />
          </div>

          {row.adjustment_failure_reason && (
            <div className="rounded-md bg-red-50 border border-red-200 p-2 text-xs text-red-800">
              <div className="font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Last failure</div>
              <div>{row.adjustment_failure_reason}</div>
            </div>
          )}
          {row.adjustment_charged_at && (
            <div className="text-[11px] text-muted-foreground">
              Last charge: {format(new Date(row.adjustment_charged_at), "MMM d, yyyy HH:mm")} by {row.adjustment_charged_by || "admin"}
              {row.stripe_adjustment_payment_intent_id && <> — PI {row.stripe_adjustment_payment_intent_id}</>}
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-wrap gap-2 sm:justify-between">
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={markNoCharge} disabled={!!busy || isClosed}>
              <XCircle className="w-4 h-4 mr-1" /> No Charge
            </Button>
            <Button variant="outline" size="sm" onClick={markHandled} disabled={!!busy || isClosed}>
              <CheckCircle className="w-4 h-4 mr-1" /> Mark Handled
            </Button>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={saveBillable} disabled={!!busy || isClosed}>
              {busy === "save" ? "Saving..." : "Save Hours"}
            </Button>
            <Button variant="outline" size="sm" onClick={sendInvoice} disabled={!!busy || isClosed || variance <= 0.05}>
              <Send className="w-4 h-4 mr-1" /> {busy === "invoice" ? "Sending..." : "Send Invoice"}
            </Button>
            <Button
              size="sm"
              onClick={chargeCard}
              disabled={!!busy || !canCharge}
              title={
                alreadyCharged ? "Already charged" :
                chargeProcessing ? "Charge in progress" :
                !hasSavedCard ? "No saved card on file" : ""
              }
            >
              <CreditCard className="w-4 h-4 mr-1" />
              {busy === "charge"
                ? "Charging..."
                : alreadyCharged
                  ? "Already Charged"
                  : chargeProcessing
                    ? "Processing…"
                    : `Charge $${total.toFixed(2)}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
