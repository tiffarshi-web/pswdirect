import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DollarSign, Clock, CheckCircle, AlertCircle, Banknote } from "lucide-react";
import { usePayoutRequests, isThursday, type PayrollEntryRow, type PayoutRequest } from "@/hooks/usePayoutRequests";
import { useAuth } from "@/contexts/AuthContext";
import { getPSWProfileByEmailFromDB } from "@/lib/pswDatabaseStore";
import { toast } from "sonner";


const statusBadge = (entry: PayrollEntryRow) => {
  if (entry.status === "cleared") return <Badge className="bg-emerald-500/20 text-emerald-700">Paid</Badge>;
  if (entry.payout_request_id) return <Badge variant="secondary">In Payout Request</Badge>;
  return <Badge variant="outline">Available</Badge>;
};

const requestStatusBadge = (status: string) => {
  const map: Record<string, { class: string; label: string }> = {
    requested: { class: "bg-amber-500/20 text-amber-700", label: "Requested" },
    approved: { class: "bg-blue-500/20 text-blue-700", label: "Approved" },
    payout_ready: { class: "bg-purple-500/20 text-purple-700", label: "Payout Ready" },
    cleared: { class: "bg-emerald-500/20 text-emerald-700", label: "Paid" },
    rejected: { class: "bg-destructive/20 text-destructive", label: "Rejected" },
  };
  const m = map[status] || { class: "", label: status };
  return <Badge className={m.class}>{m.label}</Badge>;
};

export const PSWEarningsTab = () => {
  const { user } = useAuth();
  const [pswId, setPswId] = useState<string | undefined>(undefined);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Resolve PSW profile ID from email
  useEffect(() => {
    const resolve = async () => {
      if (!user?.email) return;
      const profile = await getPSWProfileByEmailFromDB(user.email);
      if (profile?.id) setPswId(profile.id);
    };
    resolve();
  }, [user?.email]);

  const {
    entries, payoutRequests, loading, eligibleEntries, pendingPayoutEntries,
    clearedEntries, hasOpenRequest, paidThisMonth, paidYTD,
    getDisabledReason, requestPayout, refetch,
  } = usePayoutRequests(pswId);

  const disabledReason = getDisabledReason();
  const eligibleTotal = eligibleEntries.reduce((s, e) => s + e.total_owed, 0);
  const pendingTotal = pendingPayoutEntries.reduce((s, e) => s + e.total_owed, 0);

  const handleRequestPayout = async () => {
    setSubmitting(true);
    const result = await requestPayout();
    setSubmitting(false);
    setShowConfirm(false);
    if (result.success) {
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  if (loading) {
    return <div className="text-center text-muted-foreground py-12">Loading earnings...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-medium text-emerald-700">Available to Request</span>
            </div>
            <p className="text-xl font-bold text-emerald-800">${eligibleTotal.toFixed(2)}</p>
            <p className="text-xs text-emerald-600">{eligibleEntries.length} shifts</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">Pending Payout</span>
            </div>
            <p className="text-xl font-bold text-amber-800">${pendingTotal.toFixed(2)}</p>
            <p className="text-xs text-amber-600">{pendingPayoutEntries.length} shifts</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-700">Paid This Month</span>
            </div>
            <p className="text-xl font-bold text-blue-800">${paidThisMonth.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Banknote className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-medium text-purple-700">Paid YTD</span>
            </div>
            <p className="text-xl font-bold text-purple-800">${paidYTD.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Request Payout Button */}
      <Card>
        <CardContent className="p-4">
          <Button
            className="w-full"
            disabled={!!disabledReason || submitting}
            onClick={() => setShowConfirm(true)}
          >
            {submitting ? "Submitting..." : "Request Payout"}
          </Button>
          {disabledReason && (
            <div className="flex items-start gap-2 mt-3 p-3 rounded-lg bg-muted">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-sm text-muted-foreground">{disabledReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Earnings Line Items */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Earnings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {entries.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No earnings yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs">Hours</TableHead>
                    <TableHead className="text-xs">Rate</TableHead>
                    <TableHead className="text-xs">Total</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.slice(0, 50).map(e => (
                    <TableRow key={e.id}>
                      <TableCell className="text-xs">{e.earned_date || e.scheduled_date}</TableCell>
                      <TableCell className="text-xs">{e.hours_worked.toFixed(1)}h</TableCell>
                      <TableCell className="text-xs">${e.hourly_rate}/hr</TableCell>
                      <TableCell className="text-xs font-medium">${e.total_owed.toFixed(2)}</TableCell>
                      <TableCell>{statusBadge(e)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payout History */}
      {payoutRequests.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Payout History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Period</TableHead>
                    <TableHead className="text-xs">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Paid</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payoutRequests.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">{r.period_start} – {r.period_end}</TableCell>
                      <TableCell className="text-xs font-medium">${r.total_amount.toFixed(2)}</TableCell>
                      <TableCell>{requestStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs">
                        {r.cleared_at ? new Date(r.cleared_at).toLocaleDateString() : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payout Request</DialogTitle>
            <DialogDescription>Review the payout details below before submitting.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Amount</span>
              <span className="font-bold text-lg">${eligibleTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Number of Shifts</span>
              <span className="font-medium">{eligibleEntries.length}</span>
            </div>
            {eligibleEntries.length > 0 && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Period</span>
                <span className="text-sm">
                  {eligibleEntries.map(e => e.earned_date || e.scheduled_date).sort()[0]} – {eligibleEntries.map(e => e.earned_date || e.scheduled_date).sort().reverse()[0]}
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirm(false)}>Cancel</Button>
            <Button onClick={handleRequestPayout} disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
