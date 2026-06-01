// Manual Payouts Ledger — admin records real-world payments (e-transfer, cash, etc.)
// Supports partial payments per earning, tracks remaining balance, prevents over- and double-payment.

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Banknote, Plus, Undo2, UserPlus } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

type Method = "e_transfer" | "bank_transfer" | "cash" | "other";

const METHOD_LABEL: Record<Method, string> = {
  e_transfer: "E-Transfer",
  bank_transfer: "Bank Transfer",
  cash: "Cash",
  other: "Other",
};

interface PSWOption { id: string; name: string }

interface EntryStatus {
  entry_id: string;
  scheduled_date: string;
  task_name: string;
  hours_worked: number;
  hourly_rate: number;
  total_owed: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  requires_admin_review: boolean;
}

interface PayoutRow {
  id: string;
  psw_id: string;
  amount_paid: number;
  paid_at: string;
  payment_method: Method;
  reference_number: string | null;
  note: string | null;
  created_by_admin: string;
  voided_at: string | null;
  void_reason: string | null;
}

interface PayoutHistoryRow extends PayoutRow {
  caregiver_name: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export const ManualPayoutsSection = () => {
  const [psws, setPsws] = useState<PSWOption[]>([]);
  const [selectedPswId, setSelectedPswId] = useState<string>("");
  const [entries, setEntries] = useState<EntryStatus[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [allPayouts, setAllPayouts] = useState<PayoutHistoryRow[]>([]);
  const [summary, setSummary] = useState({
    totalEarned: 0, totalPaid: 0, outstanding: 0, lastPayoutAt: null as string | null,
  });
  const [loading, setLoading] = useState(false);

  // Dialog state — per-entry amount allocation
  const [dialogOpen, setDialogOpen] = useState(false);
  const [allocations, setAllocations] = useState<Record<string, string>>({}); // entryId -> amount string
  const [totalAmount, setTotalAmount] = useState<string>(""); // editable total payout amount
  const [paidAt, setPaidAt] = useState<string>(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [method, setMethod] = useState<Method>("e_transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // External payee mode — for one-off contractors not in the PSW system
  const [externalMode, setExternalMode] = useState(false);
  const [externalName, setExternalName] = useState("");

  const [voidTarget, setVoidTarget] = useState<PayoutRow | null>(null);
  const [voidReason, setVoidReason] = useState("");

  const loadAllPayouts = async () => {
    const { data, error } = await supabase
      .from("payouts")
      .select("*, psw_profiles(first_name, last_name)")
      .order("paid_at", { ascending: false });

    if (error) {
      console.error("[ManualPayouts] payout ledger load failed", error);
      return;
    }

    setAllPayouts(((data ?? []) as any[]).map((p) => ({
      ...p,
      amount_paid: Number(p.amount_paid),
      caregiver_name:
        `${p.psw_profiles?.first_name ?? ""} ${p.psw_profiles?.last_name ?? ""}`.trim() ||
        (p.external_payee_name ? `${p.external_payee_name} (external)` : "Unknown caregiver"),
    })));
  };

  // Load PSW list
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("psw_profiles")
        .select("id, first_name, last_name")
        .order("first_name");
      setPsws((data ?? []).map((p: any) => ({
        id: p.id, name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() || "Unknown",
      })));
      loadAllPayouts();
    })();
  }, []);

  const refresh = async () => {
    if (!selectedPswId) {
      setEntries([]); setPayouts([]);
      setSummary({ totalEarned: 0, totalPaid: 0, outstanding: 0, lastPayoutAt: null });
      return;
    }
    setLoading(true);
    const [{ data: entryData, error: entryErr }, { data: hist }, { data: sum }] = await Promise.all([
      supabase.rpc("get_psw_entry_payment_status", { p_psw_id: selectedPswId }),
      supabase.from("payouts").select("*").eq("psw_id", selectedPswId).order("paid_at", { ascending: false }),
      supabase.rpc("get_psw_payout_summary", { p_psw_id: selectedPswId }),
    ]);
    if (entryErr) console.error("[ManualPayouts] entry status load failed", entryErr);
    setEntries(((entryData ?? []) as any[]).map(e => ({
      ...e,
      total_owed: Number(e.total_owed),
      paid_amount: Number(e.paid_amount),
      remaining_amount: Number(e.remaining_amount),
      hours_worked: Number(e.hours_worked),
      hourly_rate: Number(e.hourly_rate),
    })));
    setPayouts((hist ?? []) as PayoutRow[]);
    const s = Array.isArray(sum) ? sum[0] : sum;
    setSummary({
      totalEarned: Number(s?.total_earned ?? 0),
      totalPaid: Number(s?.total_paid ?? 0),
      outstanding: Number(s?.outstanding_balance ?? 0),
      lastPayoutAt: s?.last_payout_at ?? null,
    });
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [selectedPswId]);

  // Earnings still owing money (remaining > 0 and approved)
  const owingEntries = useMemo(
    () => entries.filter(e => !e.requires_admin_review && e.remaining_amount > 0.005),
    [entries]
  );

  const outstandingTotal = useMemo(
    () => owingEntries.reduce((s, e) => s + e.remaining_amount, 0),
    [owingEntries]
  );

  const creditBalance = useMemo(
    () => round2(Math.max(summary.totalPaid - summary.totalEarned, 0)),
    [summary.totalPaid, summary.totalEarned]
  );

  const payableBalance = useMemo(
    () => round2(Math.max(Math.min(outstandingTotal, summary.outstanding), 0)),
    [outstandingTotal, summary.outstanding]
  );

  const allocationTotal = useMemo(() => {
    return Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0);
  }, [allocations]);

  const totalAmountNum = useMemo(() => Number(totalAmount) || 0, [totalAmount]);
  const surplusAmount = useMemo(
    () => round2(Math.max(totalAmountNum - allocationTotal, 0)),
    [totalAmountNum, allocationTotal]
  );

  const allocationErrors = useMemo(() => {
    const errs: string[] = [];
    for (const e of owingEntries) {
      const amt = Number(allocations[e.entry_id] || 0);
      if (amt < 0) errs.push(`Negative amount for ${e.scheduled_date}`);
      if (amt > e.remaining_amount + 0.005) {
        errs.push(`Allocation $${amt.toFixed(2)} exceeds remaining $${e.remaining_amount.toFixed(2)} (${e.scheduled_date})`);
      }
    }
    if (totalAmountNum <= 0) {
      errs.push("Enter a payout amount greater than zero");
    } else if (totalAmountNum + 0.005 < allocationTotal) {
      errs.push(`Payout amount $${totalAmountNum.toFixed(2)} is less than allocated $${allocationTotal.toFixed(2)}`);
    }
    return errs;
  }, [allocations, owingEntries, totalAmountNum, allocationTotal]);

  // Auto-distribute an amount FIFO (oldest first) across owing entries, capped per-entry
  const distributeAcrossEntries = (amount: number): Record<string, string> => {
    let remaining = round2(amount);
    const next: Record<string, string> = {};
    const sorted = [...owingEntries].sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date));
    for (const e of sorted) {
      if (remaining <= 0.005) { next[e.entry_id] = "0"; continue; }
      const apply = Math.min(e.remaining_amount, remaining);
      next[e.entry_id] = apply.toFixed(2);
      remaining = round2(remaining - apply);
    }
    return next;
  };

  const openDialog = () => {
    const prefill = externalMode ? 0 : round2(payableBalance);
    setTotalAmount(prefill.toFixed(2));
    setAllocations(externalMode ? {} : distributeAcrossEntries(prefill));
    setPaidAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setMethod("e_transfer");
    setReference("");
    setNote("");
    setDialogOpen(true);
  };

  const handleTotalChange = (value: string) => {
    const normalized = value.replace(/[$,\s]/g, "");
    if (!/^\d*\.?\d{0,2}$/.test(normalized)) return;

    setTotalAmount(normalized);
    const num = Number(normalized) || 0;
    // Auto-distribute up to the true payable balance; any surplus stays as caregiver credit/advance.
    const distributable = Math.min(num, payableBalance);
    setAllocations(distributeAcrossEntries(distributable));
  };

  const setEntryAmount = (id: string, value: string) => {
    setAllocations(prev => ({ ...prev, [id]: value }));
  };

  const clearEntry = (id: string) => {
    setAllocations(prev => ({ ...prev, [id]: "0" }));
  };

  const fillRemaining = (id: string) => {
    const e = owingEntries.find(x => x.entry_id === id);
    if (e) setEntryAmount(id, e.remaining_amount.toFixed(2));
  };

  const handleSubmit = async () => {
    if (totalAmountNum <= 0) {
      toast.error("Enter a payout amount greater than zero");
      return;
    }

    setSubmitting(true);

    if (externalMode) {
      if (!externalName.trim()) {
        toast.error("Enter the payee's name");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.rpc("admin_record_external_payout" as any, {
        p_payee_name: externalName.trim(),
        p_amount: round2(totalAmountNum),
        p_paid_at: new Date(paidAt).toISOString(),
        p_method: method,
        p_reference: reference || null,
        p_note: note || null,
      });
      setSubmitting(false);
      if (error) { toast.error(error.message); return; }
      toast.success(`Recorded $${totalAmountNum.toFixed(2)} payout for ${externalName.trim()}`);
      setDialogOpen(false);
      setExternalName("");
      loadAllPayouts();
      return;
    }

    const selected = owingEntries
      .map(e => ({ id: e.entry_id, amount: round2(Number(allocations[e.entry_id] || 0)) }))
      .filter(a => a.amount > 0);

    if (allocationErrors.length > 0) {
      toast.error(allocationErrors[0]);
      setSubmitting(false);
      return;
    }
    const { error } = await supabase.rpc("admin_record_manual_payout", {
      p_psw_id: selectedPswId,
      p_amount: round2(totalAmountNum),
      p_paid_at: new Date(paidAt).toISOString(),
      p_method: method,
      p_entry_ids: selected.map(s => s.id),
      p_entry_amounts: selected.length > 0 ? selected.map(s => s.amount) : null,
      p_reference: reference || null,
      p_note: note || null,
      p_allow_surplus: true,
    } as any);
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    const advanceMsg = surplusAmount > 0 ? ` (incl. $${surplusAmount.toFixed(2)} advance/surplus)` : "";
    toast.success(`Recorded $${totalAmountNum.toFixed(2)} payout${advanceMsg}`);
    setDialogOpen(false);
    loadAllPayouts();
    refresh();
  };

  const handleVoid = async () => {
    if (!voidTarget) return;
    if (!voidReason.trim()) { toast.error("Reason required"); return; }
    const { error } = await supabase.rpc("admin_void_manual_payout", {
      p_payout_id: voidTarget.id,
      p_reason: voidReason,
    });
    if (error) { toast.error(error.message); return; }
    toast.success("Payout voided. Earnings restored.");
    setVoidTarget(null);
    setVoidReason("");
    loadAllPayouts();
    refresh();
  };

  const renderStatusBadge = (e: EntryStatus) => {
    if (e.requires_admin_review) return <Badge variant="outline">Needs review</Badge>;
    if (e.remaining_amount <= 0.005) return <Badge className="bg-emerald-500/20 text-emerald-700">Fully paid</Badge>;
    if (e.paid_amount > 0.005) return <Badge className="bg-blue-500/20 text-blue-700">Partial</Badge>;
    return <Badge className="bg-amber-500/20 text-amber-700">Unpaid</Badge>;
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="w-4 h-4" /> Manual Payout Ledger
          </CardTitle>
          <CardDescription>
            Record real-world payments (e-transfer, cash, etc.) against approved earnings. Supports partial payments — entries lock only when fully paid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-2 rounded-md bg-muted/30 border">
            <Switch
              id="external-mode"
              checked={externalMode}
              onCheckedChange={(v) => { setExternalMode(v); if (v) setSelectedPswId(""); }}
            />
            <Label htmlFor="external-mode" className="text-xs flex items-center gap-1.5 cursor-pointer">
              <UserPlus className="w-3.5 h-3.5" />
              External payee (not in the system)
            </Label>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {externalMode ? (
              <div className="flex-1 min-w-[240px]">
                <Label className="text-xs">Payee Name *</Label>
                <Input
                  value={externalName}
                  onChange={(e) => setExternalName(e.target.value)}
                  placeholder="e.g. Rachael Smith"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  No earnings will be allocated. Use for one-off contractors or external payments.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-w-[240px]">
                <Label className="text-xs">Caregiver</Label>
                <Select value={selectedPswId} onValueChange={setSelectedPswId}>
                  <SelectTrigger><SelectValue placeholder="Select a caregiver…" /></SelectTrigger>
                  <SelectContent>
                    {psws.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              disabled={externalMode ? !externalName.trim() : !selectedPswId}
              onClick={openDialog}
            >
              <Plus className="w-4 h-4 mr-1" /> Record Payout
            </Button>
          </div>

          {selectedPswId && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Total Earned</div>
                <div className="text-lg font-bold">${summary.totalEarned.toFixed(2)}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Total Paid</div>
                <div className="text-lg font-bold text-emerald-700">${summary.totalPaid.toFixed(2)}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Outstanding</div>
                <div className="text-lg font-bold text-amber-700">${summary.outstanding.toFixed(2)}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Caregiver Credit</div>
                <div className="text-lg font-bold text-blue-700">${creditBalance.toFixed(2)}</div>
              </Card>
              <Card className="p-3">
                <div className="text-xs text-muted-foreground">Last Payout</div>
                <div className="text-lg font-bold">{summary.lastPayoutAt ? format(new Date(summary.lastPayoutAt), "MMM d, yyyy") : "—"}</div>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">All Manual Payouts ({allPayouts.length})</CardTitle>
          <CardDescription>Every manual payment recorded in the ledger.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {allPayouts.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No manual payouts recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Caregiver</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {allPayouts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-medium">{p.caregiver_name}</TableCell>
                      <TableCell className="text-xs">{format(new Date(p.paid_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-xs">{METHOD_LABEL[p.payment_method]}</TableCell>
                      <TableCell className="text-xs">{p.reference_number || "—"}</TableCell>
                      <TableCell className="text-xs text-right font-medium">${Number(p.amount_paid).toFixed(2)}</TableCell>
                      <TableCell>
                        {p.voided_at
                          ? <Badge variant="destructive">Voided</Badge>
                          : <Badge className="bg-emerald-500/20 text-emerald-700">Paid</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {!p.voided_at && (
                          <Button size="sm" variant="ghost" onClick={() => setVoidTarget(p)}>
                            <Undo2 className="w-3 h-3 mr-1" /> Void
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPswId && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Earnings Breakdown ({entries.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : entries.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No earnings on file for this caregiver.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Task</TableHead>
                    <TableHead className="text-xs">Hours</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">Paid</TableHead>
                    <TableHead className="text-xs text-right">Remaining</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {entries.map(e => (
                      <TableRow key={e.entry_id}>
                        <TableCell className="text-xs">{e.scheduled_date}</TableCell>
                        <TableCell className="text-xs">{e.task_name}</TableCell>
                        <TableCell className="text-xs">{e.hours_worked.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right font-medium">${e.total_owed.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right text-emerald-700">${e.paid_amount.toFixed(2)}</TableCell>
                        <TableCell className="text-xs text-right font-medium text-amber-700">${e.remaining_amount.toFixed(2)}</TableCell>
                        <TableCell>{renderStatusBadge(e)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {selectedPswId && payouts.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Payout History</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Method</TableHead>
                  <TableHead className="text-xs">Reference</TableHead>
                  <TableHead className="text-xs text-right">Amount</TableHead>
                  <TableHead className="text-xs">Recorded By</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs"></TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {payouts.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs">{format(new Date(p.paid_at), "MMM d, yyyy")}</TableCell>
                      <TableCell className="text-xs">{METHOD_LABEL[p.payment_method]}</TableCell>
                      <TableCell className="text-xs">{p.reference_number || "—"}</TableCell>
                      <TableCell className="text-xs text-right font-medium">${Number(p.amount_paid).toFixed(2)}</TableCell>
                      <TableCell className="text-xs">{p.created_by_admin}</TableCell>
                      <TableCell>
                        {p.voided_at
                          ? <Badge variant="destructive">Voided</Badge>
                          : <Badge className="bg-emerald-500/20 text-emerald-700">Paid</Badge>}
                      </TableCell>
                      <TableCell className="text-right">
                        {!p.voided_at && (
                          <Button size="sm" variant="ghost" onClick={() => setVoidTarget(p)}>
                            <Undo2 className="w-3 h-3 mr-1" /> Void
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Record Payout Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {externalMode ? `Record Payout — ${externalName || "External Payee"}` : "Record Manual Payout"}
            </DialogTitle>
            <DialogDescription>
              {externalMode
                ? "Logging a payout for an external payee not in the caregiver system. No earnings will be allocated."
                : "Enter the actual amount paid. Allocations auto-fill across owing earnings (oldest first); enable Override for partial, advance, hold-back, or adjustment payouts."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
            {/* Earned balance summary — hidden in external mode */}
            {!externalMode && (
              <div className="grid grid-cols-3 gap-2 p-3 rounded-md bg-muted/40 border">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Available Earned Balance</div>
                  <div className="text-lg font-bold">${payableBalance.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Manual Payout Entered</div>
                  <div className="text-lg font-bold text-primary">${totalAmountNum.toFixed(2)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
                    {surplusAmount > 0 ? "Advance / Surplus" : "Remaining After Payout"}
                  </div>
                  <div className={`text-lg font-bold ${surplusAmount > 0 ? "text-blue-700" : "text-amber-700"}`}>
                    ${surplusAmount > 0
                      ? surplusAmount.toFixed(2)
                      : Math.max(payableBalance - allocationTotal, 0).toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* Manual payout amount — fully editable */}
            <div className="grid grid-cols-1 gap-3 items-end">
              <div>
                <Label className="text-xs">Manual Payout Amount *</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={totalAmount}
                  onChange={(e) => handleTotalChange(e.target.value)}
                  className="font-semibold text-base"
                  placeholder="0.00"
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  Enter any positive amount. Credits, advances, partials, and hold-backs are allowed automatically.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Payment Date</Label>
                <Input type="datetime-local" value={paidAt} onChange={e => setPaidAt(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">Payment Method</Label>
                <Select value={method} onValueChange={(v) => setMethod(v as Method)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="e_transfer">E-Transfer</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Reference # (optional)</Label>
                <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. e-transfer confirmation #" />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Admin Note</Label>
                <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Partial payout, Advance, Hours still under review, Waiting client payment…" rows={2} />
              </div>
            </div>

            {!externalMode && (
            <div className="border rounded-md">
              <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                <span className="text-xs font-medium">Per-Earning Allocation ({owingEntries.length} owing)</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => {
                    const prefill = round2(payableBalance);
                    setTotalAmount(prefill.toFixed(2));
                    setAllocations(distributeAcrossEntries(prefill));
                  }}>Pay All Remaining</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    const next: Record<string, string> = {};
                    owingEntries.forEach(e => { next[e.entry_id] = "0"; });
                    setAllocations(next);
                  }}>Clear All</Button>
                </div>
              </div>
              <div className="max-h-60 overflow-y-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Task</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                    <TableHead className="text-xs text-right">Paid</TableHead>
                    <TableHead className="text-xs text-right">Remaining</TableHead>
                    <TableHead className="text-xs text-right w-44">Apply</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {owingEntries.map(e => {
                      const amt = Number(allocations[e.entry_id] || 0);
                      const over = amt > e.remaining_amount + 0.005;
                      return (
                        <TableRow key={e.entry_id} className={over ? "bg-destructive/5" : ""}>
                          <TableCell className="text-xs">{e.scheduled_date}</TableCell>
                          <TableCell className="text-xs">{e.task_name}</TableCell>
                          <TableCell className="text-xs text-right">${e.total_owed.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right text-emerald-700">${e.paid_amount.toFixed(2)}</TableCell>
                          <TableCell className="text-xs text-right font-medium text-amber-700">${e.remaining_amount.toFixed(2)}</TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <Input
                                type="number" step="0.01" min="0" max={e.remaining_amount}
                                value={allocations[e.entry_id] ?? ""}
                                onChange={ev => setEntryAmount(e.entry_id, ev.target.value)}
                                className={`h-7 w-24 text-xs text-right ${over ? "border-destructive" : ""}`}
                              />
                              <Button type="button" size="sm" variant="ghost" className="h-7 px-1 text-[10px]"
                                onClick={() => fillRemaining(e.entry_id)} title="Pay full remaining">All</Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 px-1 text-[10px]"
                                onClick={() => clearEntry(e.entry_id)} title="Clear">0</Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              <div className="p-2 border-t bg-muted/30 grid grid-cols-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Allocated to earnings</span>
                  <div className="font-bold">${allocationTotal.toFixed(2)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Advance / Surplus</span>
                  <div className={`font-bold ${surplusAmount > 0 ? "text-blue-700" : ""}`}>${surplusAmount.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <span className="text-muted-foreground">Payout Total</span>
                  <div className="font-bold text-base">${totalAmountNum.toFixed(2)}</div>
                </div>
              </div>
            </div>
            )}

            {!externalMode && allocationErrors.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-destructive/10 border border-destructive/30">
                <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <div className="text-xs text-destructive space-y-0.5">
                  {allocationErrors.slice(0, 3).map((e, i) => <p key={i}>{e}</p>)}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || totalAmountNum <= 0 || (!externalMode && allocationErrors.length > 0) || (externalMode && !externalName.trim())}
            >
              {submitting ? "Recording…" : `Record $${totalAmountNum.toFixed(2)} Payout`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Void confirmation */}
      <Dialog open={!!voidTarget} onOpenChange={(o) => !o && setVoidTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Void Payout</DialogTitle>
            <DialogDescription>
              This reverses the payout. Linked earnings reopen as unpaid (or partial if other payouts still cover them). Use only to correct mistakes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Reason (required)</Label>
            <Textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleVoid}>Void Payout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
