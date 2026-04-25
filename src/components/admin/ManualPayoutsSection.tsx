// Manual Payouts Ledger — admin records real-world payments (e-transfer, cash, etc.)
// Links payment to specific approved earnings, marks them as paid, prevents double-payment.

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
import { AlertTriangle, Banknote, Plus, Undo2, User } from "lucide-react";
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

interface PSWOption {
  id: string;
  name: string;
}

interface EligibleEntry {
  id: string;
  scheduled_date: string;
  task_name: string;
  hours_worked: number;
  hourly_rate: number;
  total_owed: number;
  status: string;
  manual_payout_id: string | null;
  requires_admin_review: boolean;
}

interface PayoutRow {
  id: string;
  psw_id: string;
  psw_name?: string;
  amount_paid: number;
  paid_at: string;
  payment_method: Method;
  reference_number: string | null;
  note: string | null;
  created_by_admin: string;
  voided_at: string | null;
  void_reason: string | null;
}

export const ManualPayoutsSection = () => {
  const [psws, setPsws] = useState<PSWOption[]>([]);
  const [selectedPswId, setSelectedPswId] = useState<string>("");
  const [eligible, setEligible] = useState<EligibleEntry[]>([]);
  const [payouts, setPayouts] = useState<PayoutRow[]>([]);
  const [summary, setSummary] = useState<{ totalPaid: number; outstanding: number; lastPayoutAt: string | null }>({
    totalPaid: 0, outstanding: 0, lastPayoutAt: null,
  });
  const [loading, setLoading] = useState(false);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [paidAt, setPaidAt] = useState<string>(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [method, setMethod] = useState<Method>("e_transfer");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [amountOverride, setAmountOverride] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Void dialog
  const [voidTarget, setVoidTarget] = useState<PayoutRow | null>(null);
  const [voidReason, setVoidReason] = useState("");

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
    })();
  }, []);

  // Load eligible earnings + payout history when PSW changes
  const refresh = async () => {
    if (!selectedPswId) {
      setEligible([]); setPayouts([]); setSummary({ totalPaid: 0, outstanding: 0, lastPayoutAt: null });
      return;
    }
    setLoading(true);
    const [{ data: entries }, { data: hist }, { data: sum }] = await Promise.all([
      supabase
        .from("payroll_entries")
        .select("id, scheduled_date, task_name, hours_worked, hourly_rate, total_owed, status, manual_payout_id, requires_admin_review")
        .eq("psw_id", selectedPswId)
        .neq("status", "cleared")
        .is("manual_payout_id", null)
        .eq("requires_admin_review", false)
        .order("scheduled_date", { ascending: true }),
      supabase
        .from("payouts")
        .select("*")
        .eq("psw_id", selectedPswId)
        .order("paid_at", { ascending: false }),
      supabase.rpc("get_psw_payout_summary", { p_psw_id: selectedPswId }),
    ]);
    setEligible((entries ?? []) as EligibleEntry[]);
    setPayouts((hist ?? []) as PayoutRow[]);
    const s = Array.isArray(sum) ? sum[0] : sum;
    setSummary({
      totalPaid: Number(s?.total_paid ?? 0),
      outstanding: Number(s?.outstanding_balance ?? 0),
      lastPayoutAt: s?.last_payout_at ?? null,
    });
    setLoading(false);
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [selectedPswId]);

  const selectedTotal = useMemo(() => {
    return eligible
      .filter(e => selectedEntries.has(e.id))
      .reduce((s, e) => s + Number(e.total_owed), 0);
  }, [eligible, selectedEntries]);

  const openDialog = (preselectAll: boolean) => {
    const ids = preselectAll ? new Set(eligible.map(e => e.id)) : new Set<string>();
    setSelectedEntries(ids);
    setPaidAt(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    setMethod("e_transfer");
    setReference("");
    setNote("");
    setAmountOverride("");
    setDialogOpen(true);
  };

  const toggleEntry = (id: string) => {
    setSelectedEntries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (selectedEntries.size === 0) {
      toast.error("Select at least one earnings entry");
      return;
    }
    const amount = amountOverride ? Number(amountOverride) : selectedTotal;
    if (!amount || amount <= 0) {
      toast.error("Amount must be greater than zero");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.rpc("admin_record_manual_payout", {
      p_psw_id: selectedPswId,
      p_amount: amount,
      p_paid_at: new Date(paidAt).toISOString(),
      p_method: method,
      p_entry_ids: Array.from(selectedEntries),
      p_reference: reference || null,
      p_note: note || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Recorded $${amount.toFixed(2)} payout`);
    setDialogOpen(false);
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
    toast.success("Payout voided. Earnings unlocked.");
    setVoidTarget(null);
    setVoidReason("");
    refresh();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Banknote className="w-4 h-4" /> Manual Payout Ledger
          </CardTitle>
          <CardDescription>
            Record real-world payments (e-transfer, cash, etc.) against approved earnings. Locks paid entries to prevent double-payment.
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
            <Button disabled={!selectedPswId || eligible.length === 0} onClick={() => openDialog(true)}>
              <Plus className="w-4 h-4 mr-1" /> Record Payout
            </Button>
          </div>

          {selectedPswId && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Card className="p-3"><div className="text-xs text-muted-foreground">Total Paid</div><div className="text-lg font-bold">${summary.totalPaid.toFixed(2)}</div></Card>
              <Card className="p-3"><div className="text-xs text-muted-foreground">Outstanding (approved unpaid)</div><div className="text-lg font-bold text-amber-700">${summary.outstanding.toFixed(2)}</div></Card>
              <Card className="p-3"><div className="text-xs text-muted-foreground">Last Payout</div><div className="text-lg font-bold">{summary.lastPayoutAt ? format(new Date(summary.lastPayoutAt), "MMM d, yyyy") : "—"}</div></Card>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPswId && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Approved & Unpaid Earnings ({eligible.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading…</p>
            ) : eligible.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No approved unpaid earnings for this caregiver.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Task</TableHead>
                    <TableHead className="text-xs">Hours</TableHead>
                    <TableHead className="text-xs">Rate</TableHead>
                    <TableHead className="text-xs text-right">Total</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {eligible.map(e => (
                      <TableRow key={e.id}>
                        <TableCell className="text-xs">{e.scheduled_date}</TableCell>
                        <TableCell className="text-xs">{e.task_name}</TableCell>
                        <TableCell className="text-xs">{Number(e.hours_worked).toFixed(2)}</TableCell>
                        <TableCell className="text-xs">${Number(e.hourly_rate).toFixed(2)}/hr</TableCell>
                        <TableCell className="text-xs text-right font-medium">${Number(e.total_owed).toFixed(2)}</TableCell>
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Record Manual Payout</DialogTitle>
            <DialogDescription>
              Select the earnings this payment covers. Selected entries will be locked as paid.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
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
              <div>
                <Label className="text-xs">Reference # (optional)</Label>
                <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="e.g. confirmation #" />
              </div>
              <div>
                <Label className="text-xs">Amount Paid (override)</Label>
                <Input
                  type="number" step="0.01" value={amountOverride}
                  onChange={e => setAmountOverride(e.target.value)}
                  placeholder={`Default: $${selectedTotal.toFixed(2)}`}
                />
                <p className="text-[10px] text-muted-foreground mt-1">Leave blank to use selected entries total.</p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Note</Label>
              <Textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional notes…" rows={2} />
            </div>

            <div className="border rounded-md">
              <div className="flex items-center justify-between p-2 border-b bg-muted/30">
                <span className="text-xs font-medium">Approved Earnings ({selectedEntries.size}/{eligible.length} selected)</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setSelectedEntries(new Set(eligible.map(e => e.id)))}>All</Button>
                  <Button size="sm" variant="ghost" onClick={() => setSelectedEntries(new Set())}>None</Button>
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto">
                <Table>
                  <TableBody>
                    {eligible.map(e => (
                      <TableRow key={e.id} className="cursor-pointer" onClick={() => toggleEntry(e.id)}>
                        <TableCell className="w-8">
                          <Checkbox checked={selectedEntries.has(e.id)} onCheckedChange={() => toggleEntry(e.id)} />
                        </TableCell>
                        <TableCell className="text-xs">{e.scheduled_date}</TableCell>
                        <TableCell className="text-xs">{e.task_name}</TableCell>
                        <TableCell className="text-xs">{Number(e.hours_worked).toFixed(2)}h</TableCell>
                        <TableCell className="text-xs text-right font-medium">${Number(e.total_owed).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="p-2 border-t bg-muted/30 flex justify-between text-sm">
                <span className="text-muted-foreground">Selected Total</span>
                <span className="font-bold">${selectedTotal.toFixed(2)}</span>
              </div>
            </div>

            {amountOverride && Number(amountOverride) !== selectedTotal && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-700 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-900">
                  Override amount ($${Number(amountOverride).toFixed(2)}) differs from selected total (${selectedTotal.toFixed(2)}).
                  Use this for partial payments — selected entries will still be marked fully paid.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={submitting || selectedEntries.size === 0}>
              {submitting ? "Recording…" : "Mark as Paid"}
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
              This will reverse the payout and unlock the linked earnings back to "approved & unpaid". Use only to correct mistakes.
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
