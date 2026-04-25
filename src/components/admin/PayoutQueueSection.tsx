import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, FileDown, CreditCard, Eye } from "lucide-react";
import { useAdminPayoutRequests, type PayrollEntryRow, type AdminPayoutRequest, type PaymentState } from "@/hooks/usePayoutRequests";
import { generateCPA005File, downloadBankFile } from "@/lib/securityStore";
import { toast } from "sonner";

const statusBadge = (status: string) => {
  const map: Record<string, { class: string; label: string }> = {
    requested: { class: "bg-amber-500/20 text-amber-700", label: "Requested" },
    approved: { class: "bg-blue-500/20 text-blue-700", label: "Approved" },
    payout_ready: { class: "bg-purple-500/20 text-purple-700", label: "Payout Ready" },
    cleared: { class: "bg-emerald-500/20 text-emerald-700", label: "Cleared" },
    rejected: { class: "bg-destructive/20 text-destructive", label: "Rejected" },
  };
  const m = map[status] || { class: "", label: status };
  return <Badge className={m.class}>{m.label}</Badge>;
};

const paymentStateBadge = (state: PaymentState) => {
  const map: Record<PaymentState, { class: string; label: string }> = {
    paid: { class: "bg-emerald-500/20 text-emerald-700", label: "Fully Paid" },
    partial: { class: "bg-amber-500/20 text-amber-700", label: "Partially Paid" },
    unpaid: { class: "bg-muted text-muted-foreground", label: "Unpaid" },
  };
  const m = map[state];
  return <Badge className={m.class}>{m.label}</Badge>;
};

export const PayoutQueueSection = () => {
  const {
    requests, loading, approve, markPayoutReady, markCleared, reject,
    getEntriesForRequest, getBankingLast4, getBankingForCPA, refetch,
  } = useAdminPayoutRequests();

  const [selectedRequest, setSelectedRequest] = useState<AdminPayoutRequest | null>(null);
  const [detailEntries, setDetailEntries] = useState<PayrollEntryRow[]>([]);
  const [bankingLast4, setBankingLast4] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showReject, setShowReject] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [filter, setFilter] = useState("pending");

  const filteredRequests = requests.filter(r => {
    if (filter === "pending") return ["requested", "approved", "payout_ready"].includes(r.status);
    if (filter === "cleared") return r.status === "cleared";
    if (filter === "rejected") return r.status === "rejected";
    return true;
  });

  const openDetail = async (req: AdminPayoutRequest) => {
    setSelectedRequest(req);
    const [entries, last4] = await Promise.all([
      getEntriesForRequest(req.id),
      getBankingLast4(req.psw_id),
    ]);
    setDetailEntries(entries);
    setBankingLast4(last4);
    setShowDetail(true);
  };

  const handleAction = async (action: () => Promise<void>, successMsg: string) => {
    setActionLoading(true);
    try {
      await action();
      toast.success(successMsg);
      setShowDetail(false);
    } catch (e: any) {
      toast.error(e.message || "Action failed");
    }
    setActionLoading(false);
  };

  const handleGenerateCPA = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const banking = await getBankingForCPA(selectedRequest.psw_id);
      if (!banking) {
        toast.error("No banking information found for this PSW.");
        setActionLoading(false);
        return;
      }
      const payments = [{
        pswId: selectedRequest.psw_id,
        legalName: selectedRequest.psw_name || "PSW",
        transitNumber: banking.transit_number,
        institutionNumber: banking.institution_number,
        accountNumber: banking.account_number,
        amount: selectedRequest.total_amount,
        referenceNumber: `PAYOUT-${selectedRequest.id.slice(0, 8).toUpperCase()}`,
      }];
      const fileContent = generateCPA005File(payments, "0000000001", "PSW DIRECT PAYROLL", "0001");
      downloadBankFile(fileContent, `payout-${selectedRequest.id.slice(0, 8)}.txt`, "cpa005");

      await markPayoutReady(selectedRequest.id);
      toast.success("CPA-005 file downloaded. Request marked as Payout Ready.");
      setShowDetail(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to generate CPA file");
    }
    setActionLoading(false);
  };

  const handleReject = async () => {
    if (!selectedRequest || !rejectNotes.trim()) {
      toast.error("Please provide a reason for rejection.");
      return;
    }
    await handleAction(() => reject(selectedRequest.id, rejectNotes), "Payout request rejected.");
    setShowReject(false);
    setRejectNotes("");
  };

  if (loading) return <div className="text-center py-12 text-muted-foreground">Loading payout queue...</div>;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{requests.filter(r => r.status === "requested").length}</p>
            <p className="text-xs text-muted-foreground">Awaiting Approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{requests.filter(r => r.status === "approved").length}</p>
            <p className="text-xs text-muted-foreground">Approved</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">{requests.filter(r => r.status === "payout_ready").length}</p>
            <p className="text-xs text-muted-foreground">Payout Ready</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{requests.filter(r => r.status === "cleared").length}</p>
            <p className="text-xs text-muted-foreground">Cleared</p>
          </CardContent>
        </Card>
      </div>

      {/* Queue */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Payout Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending</TabsTrigger>
              <TabsTrigger value="cleared">Cleared</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>

          {filteredRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">No payout requests in this category.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PSW</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Shifts</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.psw_name}</TableCell>
                    <TableCell className="text-sm">{r.period_start} – {r.period_end}</TableCell>
                    <TableCell className="font-medium">${r.total_amount.toFixed(2)}</TableCell>
                    <TableCell>{r.entry_count}</TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-sm">{new Date(r.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payout Request Details</DialogTitle>
            <DialogDescription>
              {selectedRequest?.psw_name} · {selectedRequest?.period_start} – {selectedRequest?.period_end}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-lg font-bold">${selectedRequest?.total_amount.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Shifts</p>
                <p className="text-lg font-bold">{selectedRequest?.entry_count}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Banking</p>
                <p className="text-lg font-bold">****{bankingLast4 || "N/A"}</p>
              </div>
            </div>

            {selectedRequest?.admin_notes && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Admin Notes</p>
                <p className="text-sm">{selectedRequest.admin_notes}</p>
              </div>
            )}

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Task</TableHead>
                  <TableHead className="text-xs">Hours</TableHead>
                  <TableHead className="text-xs">Rate</TableHead>
                  <TableHead className="text-xs">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detailEntries.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs">{e.earned_date || e.scheduled_date}</TableCell>
                    <TableCell className="text-xs">{e.task_name}</TableCell>
                    <TableCell className="text-xs">{e.hours_worked.toFixed(1)}h</TableCell>
                    <TableCell className="text-xs">${e.hourly_rate}/hr</TableCell>
                    <TableCell className="text-xs font-medium">${e.total_owed.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            {selectedRequest?.status === "requested" && (
              <>
                <Button onClick={() => handleAction(() => approve(selectedRequest.id), "Approved.")} disabled={actionLoading}>
                  <CheckCircle className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button variant="destructive" onClick={() => { setShowReject(true); setShowDetail(false); }} disabled={actionLoading}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
                </Button>
              </>
            )}
            {selectedRequest?.status === "approved" && (
              <Button onClick={handleGenerateCPA} disabled={actionLoading}>
                <FileDown className="w-4 h-4 mr-1" /> Generate CPA-005
              </Button>
            )}
            {selectedRequest?.status === "payout_ready" && (
              <Button onClick={() => handleAction(() => markCleared(selectedRequest.id), "Marked as paid.")} disabled={actionLoading}>
                <CreditCard className="w-4 h-4 mr-1" /> Mark Paid
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showReject} onOpenChange={setShowReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout Request</DialogTitle>
            <DialogDescription>Entries will be unlinked so the PSW can request again later.</DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for rejection (required)"
            value={rejectNotes}
            onChange={e => setRejectNotes(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading || !rejectNotes.trim()}>
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
