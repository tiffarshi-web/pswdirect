// Admin "Worked Hours" review tab — read-only.
// Computes final payable hours at display-time. NEVER writes to bookings,
// payroll_entries, payouts, invoices, or Stripe. Paid shifts are read-only.
// To record a payment, admin uses the existing Manual Payouts tab.

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertTriangle, CheckCircle2, Clock, Lock, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useWorkedHoursReview, type WorkedHoursRow } from "@/hooks/useWorkedHoursReview";

type StateFilter = "all" | "approved" | "needs_review" | "paid" | "unpaid";

const fmtDt = (s: string | null) => (s ? format(new Date(s), "MMM d, h:mm a") : "—");
const fmtT = (s: string | null) => (s ? s.slice(0, 5) : "—");
const fmtH = (n: number | null) => (n == null ? "—" : `${n.toFixed(2)}h`);

const StateBadge = ({ row }: { row: WorkedHoursRow }) => {
  if (row.state === "paid")
    return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-300 gap-1"><Lock className="w-3 h-3" />Paid</Badge>;
  if (row.state === "needs_review")
    return <Badge className="bg-amber-500/15 text-amber-800 border-amber-300 gap-1"><AlertTriangle className="w-3 h-3" />Needs Review</Badge>;
  return <Badge className="bg-blue-500/15 text-blue-700 border-blue-300 gap-1"><CheckCircle2 className="w-3 h-3" />Approved</Badge>;
};

const VerificationBadge = ({ row }: { row: WorkedHoursRow }) => {
  if (row.admin_overrode_times) return <Badge variant="outline" className="text-xs">Admin override</Badge>;
  if (row.gps_check_in_failed || row.check_in_outside_radius)
    return <Badge variant="outline" className="text-xs bg-amber-500/10 border-amber-300 text-amber-800">GPS soft-fail</Badge>;
  if (row.verification_status) return <Badge variant="outline" className="text-xs">{row.verification_status}</Badge>;
  if (row.actual_check_in && row.actual_sign_out) return <Badge variant="outline" className="text-xs bg-emerald-500/10 border-emerald-300 text-emerald-700">GPS verified</Badge>;
  return <Badge variant="outline" className="text-xs text-muted-foreground">—</Badge>;
};

export const WorkedHoursSection = () => {
  const { rows, summaryByPsw, loading, error, refetch } = useWorkedHoursReview();
  const [stateFilter, setStateFilter] = useState<StateFilter>("unpaid");
  const [pswFilter, setPswFilter] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState("");

  const pswOptions = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach(r => m.set(r.psw_id, r.psw_name));
    return Array.from(m.entries()).map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter(r => {
      if (pswFilter !== "all" && r.psw_id !== pswFilter) return false;
      if (stateFilter === "unpaid" && r.is_paid) return false;
      if (stateFilter === "paid" && r.state !== "paid") return false;
      if (stateFilter === "approved" && r.state !== "approved") return false;
      if (stateFilter === "needs_review" && r.state !== "needs_review") return false;
      if (from && r.scheduled_date < from) return false;
      if (to && r.scheduled_date > to) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${r.psw_name} ${r.client_name ?? ""} ${r.booking_code ?? ""} ${r.service_label}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, pswFilter, stateFilter, from, to, search]);

  const grouped = useMemo(() => ({
    approved: filtered.filter(r => r.state === "approved"),
    needs_review: filtered.filter(r => r.state === "needs_review"),
    paid: filtered.filter(r => r.state === "paid"),
  }), [filtered]);

  const totals = useMemo(() => ({
    approvedHours: grouped.approved.reduce((s, r) => s + (r.final_payable_hours ?? 0), 0),
    approvedAmount: grouped.approved.reduce((s, r) => s + r.remaining_amount, 0),
    needsReviewCount: grouped.needs_review.length,
    paidCount: grouped.paid.length,
  }), [grouped]);

  const renderRow = (r: WorkedHoursRow) => {
    const rowBg =
      r.state === "paid" ? "bg-muted/40 text-muted-foreground" :
      r.state === "needs_review" ? "bg-amber-500/5" : "";
    return (
      <TableRow key={r.entry_id} className={rowBg}>
        <TableCell className="text-xs">
          <div className="font-medium">{r.psw_name}</div>
          <div className="text-muted-foreground">{r.booking_code ?? "—"}</div>
        </TableCell>
        <TableCell className="text-xs">
          <div>{r.client_name ?? "—"}</div>
          <div className="text-muted-foreground">{r.service_label}</div>
        </TableCell>
        <TableCell className="text-xs">
          <div>{r.scheduled_date}</div>
          <div className="text-muted-foreground">{fmtT(r.scheduled_start)} – {fmtT(r.scheduled_end)}</div>
        </TableCell>
        <TableCell className="text-xs">
          <div>In: {fmtDt(r.actual_check_in)}</div>
          <div>Out: {fmtDt(r.actual_sign_out)}</div>
          {r.admin_overrode_times && (
            <div className="text-[10px] text-muted-foreground mt-1">
              Original in: {fmtDt(r.original_check_in)}<br />
              Original out: {fmtDt(r.original_sign_out)}
            </div>
          )}
        </TableCell>
        <TableCell className="text-xs">
          <div className="font-medium">{fmtH(r.final_payable_hours)}</div>
          <div className="text-[10px] text-muted-foreground">
            booked {fmtH(r.booked_hours)} · actual {fmtH(r.actual_hours)}
            {r.override_hours != null && <> · override {fmtH(r.override_hours)}</>}
          </div>
        </TableCell>
        <TableCell className="text-xs"><VerificationBadge row={r} /></TableCell>
        <TableCell className="text-xs"><StateBadge row={r} /></TableCell>
        <TableCell className="text-xs text-right">
          <div className="font-medium">${r.total_owed.toFixed(2)}</div>
          {r.paid_amount > 0.005 && (
            <div className="text-[10px] text-emerald-700">paid ${r.paid_amount.toFixed(2)}</div>
          )}
          {r.remaining_amount > 0.005 && !r.is_paid && (
            <div className="text-[10px] text-amber-700">remaining ${r.remaining_amount.toFixed(2)}</div>
          )}
        </TableCell>
        <TableCell className="text-xs max-w-[220px]">
          {r.needs_review_reasons.length > 0 && (
            <ul className="list-disc list-inside text-amber-800">
              {r.needs_review_reasons.slice(0, 3).map((x, i) => <li key={i} className="truncate">{x}</li>)}
            </ul>
          )}
          {r.payroll_review_note && <div className="text-muted-foreground italic mt-1">{r.payroll_review_note}</div>}
        </TableCell>
      </TableRow>
    );
  };

  const renderTable = (data: WorkedHoursRow[], emptyText: string) => (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-xs">PSW / Ref</TableHead>
            <TableHead className="text-xs">Client / Service</TableHead>
            <TableHead className="text-xs">Scheduled</TableHead>
            <TableHead className="text-xs">Actual</TableHead>
            <TableHead className="text-xs">Payable hours</TableHead>
            <TableHead className="text-xs">Verification</TableHead>
            <TableHead className="text-xs">Status</TableHead>
            <TableHead className="text-xs text-right">Pay</TableHead>
            <TableHead className="text-xs">Notes</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0
            ? <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-6">{emptyText}</TableCell></TableRow>
            : data.map(renderRow)}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" />Worked Hours Review</CardTitle>
              <CardDescription>
                Read-only view of every shift's worked hours. Payouts stay individual via the Manual Payouts tab.
                Paid shifts are locked. No bulk payouts.
              </CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={refetch}><RefreshCw className="w-3 h-3 mr-1" />Refresh</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Approved unpaid hours</div>
              <div className="text-lg font-bold text-blue-700">{totals.approvedHours.toFixed(2)}h</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Approved unpaid $</div>
              <div className="text-lg font-bold text-blue-700">${totals.approvedAmount.toFixed(2)}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Needs review</div>
              <div className="text-lg font-bold text-amber-700">{totals.needsReviewCount}</div>
            </Card>
            <Card className="p-3">
              <div className="text-xs text-muted-foreground">Paid (locked)</div>
              <div className="text-lg font-bold text-emerald-700">{totals.paidCount}</div>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            <div>
              <Label className="text-xs">Show</Label>
              <Select value={stateFilter} onValueChange={(v) => setStateFilter(v as StateFilter)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unpaid">Unpaid only</SelectItem>
                  <SelectItem value="approved">Approved payable</SelectItem>
                  <SelectItem value="needs_review">Needs review</SelectItem>
                  <SelectItem value="paid">Paid (locked)</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Caregiver</Label>
              <Select value={pswFilter} onValueChange={setPswFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All caregivers</SelectItem>
                  {pswOptions.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-3 h-3 text-muted-foreground" />
                <Input className="pl-7" placeholder="PSW, client, CDT-…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Summary by Caregiver</CardTitle>
          <CardDescription>Approved unpaid only — record payouts in the Manual Payouts tab.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="text-xs">Caregiver</TableHead>
                <TableHead className="text-xs text-right">Unpaid hours</TableHead>
                <TableHead className="text-xs text-right">Unpaid shifts</TableHead>
                <TableHead className="text-xs text-right">Estimated $</TableHead>
                <TableHead className="text-xs text-right">Needs review</TableHead>
                <TableHead className="text-xs text-right">Paid shifts</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {summaryByPsw.length === 0
                  ? <TableRow><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-4">No caregiver activity yet.</TableCell></TableRow>
                  : summaryByPsw.map(s => (
                    <TableRow key={s.psw_id}>
                      <TableCell className="text-xs font-medium">{s.psw_name}</TableCell>
                      <TableCell className="text-xs text-right">{s.unpaidApprovedHours.toFixed(2)}h</TableCell>
                      <TableCell className="text-xs text-right">{s.unpaidShifts}</TableCell>
                      <TableCell className="text-xs text-right font-medium text-blue-700">${s.unpaidApprovedAmount.toFixed(2)}</TableCell>
                      <TableCell className="text-xs text-right text-amber-700">{s.needsReviewShifts}</TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">{s.paidShifts}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="approved" className="w-full">
            <TabsList className="m-3">
              <TabsTrigger value="approved" className="gap-1.5"><CheckCircle2 className="w-3 h-3" />Approved <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{grouped.approved.length}</Badge></TabsTrigger>
              <TabsTrigger value="needs_review" className="gap-1.5"><AlertTriangle className="w-3 h-3" />Needs Review <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{grouped.needs_review.length}</Badge></TabsTrigger>
              <TabsTrigger value="paid" className="gap-1.5"><Lock className="w-3 h-3" />Paid <Badge variant="outline" className="ml-1 h-4 px-1 text-[10px]">{grouped.paid.length}</Badge></TabsTrigger>
            </TabsList>
            <TabsContent value="approved" className="mt-0">{renderTable(grouped.approved, loading ? "Loading…" : "No approved unpaid shifts.")}</TabsContent>
            <TabsContent value="needs_review" className="mt-0">{renderTable(grouped.needs_review, loading ? "Loading…" : "Nothing needs review.")}</TabsContent>
            <TabsContent value="paid" className="mt-0">{renderTable(grouped.paid, loading ? "Loading…" : "No paid shifts in this filter.")}</TabsContent>
          </Tabs>
          {error && <div className="p-3 text-xs text-destructive">Error: {error}</div>}
        </CardContent>
      </Card>
    </div>
  );
};
