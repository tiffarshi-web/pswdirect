// Office review queue for provider earnings (Phase 5).
// The office reviews, approves, disputes, adjusts and voids earnings here.
// No money is ever sent from this screen — payments are issued outside the app
// and only recorded in the Manual Payouts ledger.

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MANUAL_PAYOUT_NOTICE, type ProviderEarningStatus } from "@/lib/manualPayoutPolicy";
import {
  formatCents, isValidEarningTransition, reasonRequiredFor, toCsv, downloadTextFile,
} from "@/lib/earningsStatements";

interface QueueRow {
  entry_id: string;
  psw_id: string | null;
  provider_name: string | null;
  provider_type: string | null;
  booking_code: string | null;
  service: string | null;
  service_date: string | null;
  province: string | null;
  scheduled_minutes: number | null;
  recorded_minutes: number | null;
  location_verified: string | null;
  care_sheet_status: string | null;
  incident: boolean | null;
  wrong_day_review: boolean | null;
  rate_cents: number | null;
  gross_cents: number | null;
  adjustments_cents: number | null;
  final_cents: number | null;
  earning_status: ProviderEarningStatus | null;
  submitted_at: string | null;
  age_days: number | null;
  paid_cents: number | null;
}

const STATUS_LABEL: Record<string, string> = {
  pending_shift_completion: "Pending shift completion",
  pending_care_sheet: "Pending care sheet",
  pending_office_review: "Pending office review",
  approved_for_manual_payment: "Approved for manual payment",
  disputed: "Disputed",
  paid_manually: "Paid manually",
  voided: "Voided",
};

const minutesLabel = (m: number | null) =>
  m == null ? "—" : `${(m / 60).toFixed(2)}h`;

export const EarningReviewQueueSection = () => {
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState("all");
  const [provider, setProvider] = useState("");
  const [providerType, setProviderType] = useState("all");
  const [service, setService] = useState("");
  const [province, setProvince] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [locationReview, setLocationReview] = useState("all");
  const [flagFilter, setFlagFilter] = useState("all");
  const [sortOldest, setSortOldest] = useState(true);

  const [target, setTarget] = useState<QueueRow | null>(null);
  const [nextStatus, setNextStatus] = useState<ProviderEarningStatus>("approved_for_manual_payment");
  const [reason, setReason] = useState("");
  const [adjustment, setAdjustment] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase.rpc as unknown as (
      fn: string,
    ) => Promise<{ data: QueueRow[] | null; error: { message: string } | null }>)(
      "admin_earning_review_queue",
    );
    if (error) toast.error(error.message);
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const list = rows.filter((r) => {
      if (status === "ready" && r.earning_status !== "approved_for_manual_payment") return false;
      if (status === "submitted" && r.earning_status !== "pending_office_review") return false;
      if (status !== "all" && status !== "ready" && status !== "submitted" && r.earning_status !== status) return false;
      if (provider && !(r.provider_name ?? "").toLowerCase().includes(provider.toLowerCase())) return false;
      if (providerType !== "all" && (r.provider_type ?? "psw") !== providerType) return false;
      if (service && !(r.service ?? "").toLowerCase().includes(service.toLowerCase())) return false;
      if (province !== "all" && (r.province ?? "ON") !== province) return false;
      if (fromDate && (r.service_date ?? "") < fromDate) return false;
      if (toDate && (r.service_date ?? "") > toDate) return false;
      if (locationReview === "needs_review" && r.location_verified === "verified") return false;
      if (flagFilter === "incident" && !r.incident) return false;
      if (flagFilter === "wrong_day" && !r.wrong_day_review) return false;
      return true;
    });
    return list.sort((a, b) => {
      const av = a.submitted_at ?? "";
      const bv = b.submitted_at ?? "";
      return sortOldest ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [rows, status, provider, providerType, service, province, fromDate, toDate, locationReview, flagFilter, sortOldest]);

  const exportCsv = () => {
    const csv = toCsv(
      ["Provider", "Type", "Order", "Service", "Service date", "Province", "Scheduled", "Recorded",
        "Location", "Care sheet", "Incident", "Wrong day", "Rate", "Earning", "Adjustments",
        "Total", "Paid", "Status", "Age (days)"],
      filtered.map((r) => [
        r.provider_name, r.provider_type, r.booking_code, r.service, r.service_date, r.province,
        minutesLabel(r.scheduled_minutes), minutesLabel(r.recorded_minutes),
        r.location_verified, r.care_sheet_status, r.incident ? "yes" : "no",
        r.wrong_day_review ? "yes" : "no", formatCents(r.rate_cents), formatCents(r.gross_cents),
        formatCents(r.adjustments_cents), formatCents(r.final_cents), formatCents(r.paid_cents),
        r.earning_status, r.age_days,
      ]),
    );
    downloadTextFile(`psw-direct-earnings-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  };

  const openAction = (row: QueueRow) => {
    setTarget(row);
    setNextStatus(
      row.earning_status === "pending_office_review" ? "approved_for_manual_payment" : "pending_office_review",
    );
    setReason("");
    setAdjustment("");
  };

  const applyDecision = async () => {
    if (!target) return;
    if (!isValidEarningTransition(target.earning_status, nextStatus)) {
      toast.error(`This earning cannot move from ${STATUS_LABEL[target.earning_status ?? ""] ?? "its current status"} to ${STATUS_LABEL[nextStatus]}.`);
      return;
    }
    if (reasonRequiredFor(target.earning_status, nextStatus) && !reason.trim()) {
      toast.error("A reason is required for this decision.");
      return;
    }
    setSaving(true);
    const rpc = supabase.rpc as unknown as (
      fn: string, args: Record<string, unknown>,
    ) => Promise<{ data: { ok?: boolean; message?: string } | null; error: { message: string } | null }>;

    const adjustCents = Math.round((Number(adjustment) || 0) * 100);
    if (adjustCents !== 0) {
      if (!reason.trim()) {
        setSaving(false);
        toast.error("An adjustment needs a reason.");
        return;
      }
      const { data, error } = await rpc("admin_add_earning_adjustment", {
        p_entry_id: target.entry_id, p_amount_cents: adjustCents, p_reason: reason.trim(),
      });
      if (error || data?.ok === false) {
        setSaving(false);
        toast.error(error?.message || data?.message || "The adjustment was not applied.");
        return;
      }
    }

    const { data, error } = await rpc("admin_set_earning_status", {
      p_entry_id: target.entry_id, p_status: nextStatus, p_note: reason.trim() || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    if (data?.ok === false) { toast.error(data.message || "That decision was not allowed."); return; }
    toast.success(`Earning set to "${STATUS_LABEL[nextStatus]}". No money was sent.`);
    setTarget(null);
    load();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Office review queue</CardTitle>
          <CardDescription>{MANUAL_PAYOUT_NOTICE}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="submitted">Submitted for review</SelectItem>
                  <SelectItem value="ready">Ready for manual payment</SelectItem>
                  <SelectItem value="paid_manually">Paid manually</SelectItem>
                  <SelectItem value="disputed">Disputed</SelectItem>
                  <SelectItem value="voided">Voided</SelectItem>
                  <SelectItem value="pending_care_sheet">Pending care sheet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Provider</Label>
              <Input value={provider} onChange={(e) => setProvider(e.target.value)} placeholder="Name" />
            </div>
            <div>
              <Label className="text-xs">Provider type</Label>
              <Select value={providerType} onValueChange={setProviderType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="psw">PSW</SelectItem>
                  <SelectItem value="nurse">Nurse</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Service</Label>
              <Input value={service} onChange={(e) => setService(e.target.value)} placeholder="Home care, escort…" />
            </div>
            <div>
              <Label className="text-xs">Province</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ON">Ontario</SelectItem>
                  <SelectItem value="AB">Alberta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Flags</Label>
              <Select value={flagFilter} onValueChange={setFlagFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="incident">Incident reported</SelectItem>
                  <SelectItem value="wrong_day">Wrong-day correction</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Location check</Label>
              <Select value={locationReview} onValueChange={setLocationReview}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="needs_review">Needs review</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setSortOldest((v) => !v)}>
              {sortOldest ? "Oldest unresolved first" : "Newest first"}
            </Button>
            <Button size="sm" variant="outline" onClick={load}>
              <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </Button>
            <Button size="sm" variant="outline" onClick={exportCsv}>
              <Download className="w-3.5 h-3.5 mr-1" /> Export CSV
            </Button>
            <span className="self-center text-xs text-muted-foreground">{filtered.length} earnings</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading review queue…</p>
          ) : filtered.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">Nothing matches these filters.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead className="text-xs">Provider</TableHead>
                  <TableHead className="text-xs">Order</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Scheduled</TableHead>
                  <TableHead className="text-xs">Recorded</TableHead>
                  <TableHead className="text-xs">Checks</TableHead>
                  <TableHead className="text-xs text-right">Rate</TableHead>
                  <TableHead className="text-xs text-right">Total</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Age</TableHead>
                  <TableHead />
                </TableRow></TableHeader>
                <TableBody>
                  {filtered.slice(0, 200).map((r) => (
                    <TableRow key={r.entry_id}>
                      <TableCell className="text-xs font-medium">
                        {r.provider_name || "Caregiver"}
                        <div className="text-[10px] text-muted-foreground uppercase">{r.provider_type ?? "psw"} · {r.province ?? "ON"}</div>
                      </TableCell>
                      <TableCell className="text-xs">{r.booking_code || "—"}</TableCell>
                      <TableCell className="text-xs">{r.service_date}</TableCell>
                      <TableCell className="text-xs">{minutesLabel(r.scheduled_minutes)}</TableCell>
                      <TableCell className="text-xs">{minutesLabel(r.recorded_minutes)}</TableCell>
                      <TableCell className="text-xs space-x-1">
                        <Badge variant="outline" className="text-[10px]">{r.location_verified}</Badge>
                        <Badge variant="outline" className="text-[10px]">{r.care_sheet_status}</Badge>
                        {r.incident && <Badge variant="destructive" className="text-[10px]">incident</Badge>}
                        {r.wrong_day_review && <Badge variant="destructive" className="text-[10px]">wrong day</Badge>}
                      </TableCell>
                      <TableCell className="text-xs text-right">{formatCents(r.rate_cents)}</TableCell>
                      <TableCell className="text-xs text-right font-medium">
                        {formatCents(r.final_cents)}
                        {(r.adjustments_cents ?? 0) !== 0 && (
                          <div className="text-[10px] text-muted-foreground">adj {formatCents(r.adjustments_cents)}</div>
                        )}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="text-[10px]">{STATUS_LABEL[r.earning_status ?? ""] ?? r.earning_status}</Badge></TableCell>
                      <TableCell className="text-xs">{r.age_days ?? "—"}d</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => openAction(r)}>Review</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!target} onOpenChange={(o) => !o && setTarget(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Office decision</DialogTitle>
            <DialogDescription>
              Recording a decision here never sends money. Payments are issued by the office and
              recorded in the Manual Payouts ledger.
            </DialogDescription>
          </DialogHeader>

          {target && (
            <div className="space-y-3">
              <div className="text-sm">
                <span className="font-medium">{target.provider_name}</span> · {target.booking_code || "no order code"} ·{" "}
                {target.service_date} · {formatCents(target.final_cents)}
              </div>

              <div>
                <Label className="text-xs">New status</Label>
                <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as ProviderEarningStatus)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABEL) as ProviderEarningStatus[])
                      .filter((s) => isValidEarningTransition(target.earning_status, s) && s !== target.earning_status)
                      .map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs">Approved adjustment (dollars, may be negative)</Label>
                <Input value={adjustment} onChange={(e) => setAdjustment(e.target.value)} placeholder="0.00" />
              </div>

              <div>
                <Label className="text-xs">
                  Reason {reasonRequiredFor(target.earning_status, nextStatus) ? "(required)" : "(optional)"}
                </Label>
                <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setTarget(null)}>Cancel</Button>
            <Button onClick={applyDecision} disabled={saving}>
              {saving ? "Saving…" : "Record decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
