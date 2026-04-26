// Manual Payouts Ledger — admin records real-world payments (e-transfer, cash, etc.)
// Supports partial payments per earning, tracks remaining balance, prevents over- and double-payment.

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, Banknote, Plus, Undo2 } from "lucide-react";
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
  const [paidAt, setPaidAt] = useState<string>(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [method, setMethod] = useState<Method>("e_transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      caregiver_name: `${p.psw_profiles?.first_name ?? ""} ${p.psw_profiles?.last_name ?? ""}`.trim() || "Unknown caregiver",
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

  const allocationTotal = useMemo(() => {
    return Object.values(allocations).reduce((s, v) => s + (Number(v) || 0), 0);
  }, [allocations]);

  const allocationErrors = useMemo(() => {
    const errs: string[] = [];
    for (const e of owingEntries) {
      const amt = Number(allocations[e.entry_id] || 0);
      if (amt < 0) errs.push(`Negative amount for ${e.scheduled_date}`);
      if (amt > e.remaining_amount + 0.005) {
        errs.push(`$${amt.toFixed(2)} exceeds remaining $${e.remaining_amount.toFixed(2)} (${e.scheduled_date})`);
      }
    }
    return errs;
  }, [allocations, owingEntries]);

  const openDialog = () => {
    // Pre-fill: pay the full remaining balance for each owing entry
    const next: Record<string, string> = {};
    owingEntries.forEach(e => { next[e.entry_id] = e.remaining_amount.toFixed(2); });
    setAllocations(next);
    setPaidAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setMethod("e_transfer");
    setReference("");
    setNote("");
    setDialogOpen(true);
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
    const selected = owingEntries
      .map(e => ({ id: e.entry_id, amount: round2(Number(allocations[e.entry_id] || 0)) }))
      .filter(a => a.amount > 0);

    if (selected.length === 0) {
      toast.error("Enter an amount for at least one earning");
      return;
    }
    if (allocationErrors.length > 0) {
      toast.error(allocationErrors[0]);
      return;
    }
    const total = round2(selected.reduce((s, a) => s + a.amount, 0));
    if (total <= 0) {
      toast.error("Total must be greater than zero");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("admin_record_manual_payout", {
      p_psw_id: selectedPswId,
      p_amount: total,
      p_paid_at: new Date(paidAt).toISOString(),
      p_method: method,
      p_entry_ids: selected.map(s => s.id),
      p_entry_amounts: selected.map(s => s.amount),
      p_reference: reference || null,
      p_note: note || null,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Recorded $${total.toFixed(2)} payout`);
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
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[240px]">
              <Label className="text-xs">Caregiver</Label>
              <Select value={selectedPswId} onValueChange={setSelectedPswId}>
                <SelectTrigger><SelectValue placeholder="Select a caregiver…" /></SelectTrigger>
                <SelectContent>
                  {psws.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button disabled={!selectedPswId || owingEntries.length === 0} onClick={openDialog}>
              <Plus className="w-4 h-4 mr-1" /> Record Payout
            </Button>
          </div>

          {selectedPswId && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <DialogTitle>Record Manual Payout</DialogTitle>
            <DialogDescription>
              Enter how much of this payment is applied to each earning. Each entry can only receive up to its remaining balance. Entries lock as paid only when fully covered.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[65vh] overflow-y-auto">
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
                <Label className="text-xs">Note</Label>
                <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional notes…" rows={2} />
              </div>
            </div>

            <div className="border rounded-md">
              <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                <span className="text-xs font-medium">Allocate Payment ({owingEntries.length} earnings owing)</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => {
                    const next: Record<string, string> = {};
                    owingEntries.forEach(e => { next[e.entry_id] = e.remaining_amount.toFixed(2); });
                    setAllocations(next);
                  }}>Pay All Remaining</Button>
                  <Button size="sm" variant="ghost" onClick={() => {
                    const next: Record<string, string> = {};
                    owingEntries.forEach(e => { next[e.entry_id] = "0"; });
                    setAllocations(next);
                  }}>Clear All</Button>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
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
              <div className="p-2 border-t bg-muted/30 flex justify-between text-sm">
                <span className="text-muted-foreground">Payment Total</span>
                <span className="font-bold">${allocationTotal.toFixed(2)}</span>
              </div>
            </div>

            {allocationErrors.length > 0 && (
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
              disabled={submitting || allocationTotal <= 0 || allocationErrors.length > 0}
            >
              {submitting ? "Recording…" : `Record $${allocationTotal.toFixed(2)} Payout`}
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
