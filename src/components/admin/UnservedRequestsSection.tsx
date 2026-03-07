import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { AlertTriangle, MapPin, Calendar, BarChart3, Loader2, Phone, Eye, UserPlus, XCircle, Copy, ExternalLink, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isAfter } from "date-fns";
import { toast } from "sonner";

interface UnservedOrder {
  id: string;
  created_at: string;
  service_type: string | null;
  requested_start_time: string | null;
  city: string | null;
  postal_code_raw: string | null;
  postal_fsa: string | null;
  radius_checked_km: number | null;
  psw_count_found: number;
  reason: string;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  status: string;
  pending_expires_at: string | null;
  assigned_psw_id: string | null;
  admin_notes: string | null;
  decline_reason: string | null;
  payment_link_token: string | null;
  payment_intent_id: string | null;
  full_client_payload: Record<string, any> | null;
  booking_id: string | null;
}

interface PSWOption {
  id: string;
  first_name: string;
  last_name: string;
  home_city: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-300",
  PAYMENT_SENT: "bg-blue-100 text-blue-800 border-blue-300",
  PAID: "bg-green-100 text-green-800 border-green-300",
  DECLINED: "bg-red-100 text-red-800 border-red-300",
  EXPIRED: "bg-gray-100 text-gray-600 border-gray-300",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
};

export const UnservedRequestsSection = () => {
  const [orders, setOrders] = useState<UnservedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("30");
  const [cityFilter, setCityFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");

  // Dialog states
  const [viewOrder, setViewOrder] = useState<UnservedOrder | null>(null);
  const [assignOrder, setAssignOrder] = useState<UnservedOrder | null>(null);
  const [declineOrder, setDeclineOrder] = useState<UnservedOrder | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [pswSearch, setPswSearch] = useState("");
  const [pswOptions, setPswOptions] = useState<PSWOption[]>([]);
  const [loadingPsws, setLoadingPsws] = useState(false);
  const [selectedPsw, setSelectedPsw] = useState<PSWOption | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const since = subDays(new Date(), 90).toISOString();
    const { data, error } = await (supabase as any)
      .from("unserved_orders")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setOrders(data);
    }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  // Load approved PSWs for assignment
  const searchPSWs = async (query: string) => {
    setLoadingPsws(true);
    let q = supabase.from("psw_profiles").select("id, first_name, last_name, home_city").eq("vetting_status", "approved");
    if (query.trim()) {
      q = q.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,home_city.ilike.%${query}%`);
    }
    const { data } = await q.limit(20);
    setPswOptions(data || []);
    setLoadingPsws(false);
  };

  useEffect(() => {
    if (assignOrder) searchPSWs(pswSearch);
  }, [assignOrder, pswSearch]);

  const filteredOrders = useMemo(() => {
    const cutoff = subDays(new Date(), parseInt(dateFilter));
    return orders.filter(o => {
      if (!isAfter(new Date(o.created_at), cutoff)) return false;
      if (cityFilter !== "all" && o.city !== cityFilter) return false;
      if (serviceFilter !== "all" && o.service_type !== serviceFilter) return false;
      if (statusFilter === "active" && ["DECLINED", "EXPIRED", "RESOLVED"].includes(o.status)) return false;
      if (statusFilter !== "active" && statusFilter !== "all" && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, dateFilter, cityFilter, serviceFilter, statusFilter]);

  const last7 = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return orders.filter(o => isAfter(new Date(o.created_at), cutoff)).length;
  }, [orders]);

  const last30 = useMemo(() => {
    const cutoff = subDays(new Date(), 30);
    return orders.filter(o => isAfter(new Date(o.created_at), cutoff)).length;
  }, [orders]);

  const topCity = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { if (o.city) counts[o.city] = (counts[o.city] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1]})` : "—";
  }, [orders]);

  const topFSA = useMemo(() => {
    const counts: Record<string, number> = {};
    orders.forEach(o => { if (o.postal_fsa) counts[o.postal_fsa] = (counts[o.postal_fsa] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted[0] ? `${sorted[0][0]} (${sorted[0][1]})` : "—";
  }, [orders]);

  const uniqueCities = useMemo(() => [...new Set(orders.map(o => o.city).filter(Boolean))] as string[], [orders]);
  const uniqueServices = useMemo(() => [...new Set(orders.map(o => o.service_type).filter(Boolean))] as string[], [orders]);

  // Assign PSW action
  const handleAssignPSW = async () => {
    if (!assignOrder || !selectedPsw) return;
    setProcessing(true);

    const paymentToken = crypto.randomUUID();

    const { error } = await (supabase as any)
      .from("unserved_orders")
      .update({
        assigned_psw_id: selectedPsw.id,
        status: "PAYMENT_SENT",
        payment_link_token: paymentToken,
      })
      .eq("id", assignOrder.id);

    if (error) {
      toast.error("Failed to assign PSW: " + error.message);
    } else {
      const payLink = `${window.location.origin}/pay/${paymentToken}`;
      toast.success("PSW assigned! Payment link generated.", { duration: 8000 });

      // Try to send email notification
      if (assignOrder.client_email) {
        await supabase.functions.invoke("send-email", {
          body: {
            to: assignOrder.client_email,
            subject: "Your Care Request - Complete Your Booking",
            body: `Hi ${assignOrder.client_name || "there"},\n\nGreat news! We found a caregiver willing to travel to your area.\n\nPlease complete your booking by making payment here:\n${payLink}\n\nThis link expires in 24 hours.\n\nThank you,\nPSW Direct Team`,
          },
        });
        toast.info("Email notification sent to client");
      }

      // Show copyable link
      navigator.clipboard.writeText(payLink);
      toast.info("Payment link copied to clipboard", { description: payLink, duration: 10000 });

      await loadData();
    }

    setProcessing(false);
    setAssignOrder(null);
    setSelectedPsw(null);
    setPswSearch("");
  };

  // Decline action
  const handleDecline = async () => {
    if (!declineOrder) return;
    setProcessing(true);

    const { error } = await (supabase as any)
      .from("unserved_orders")
      .update({
        status: "DECLINED",
        decline_reason: declineReason || "No PSWs available in area",
      })
      .eq("id", declineOrder.id);

    if (error) {
      toast.error("Failed to decline: " + error.message);
    } else {
      // Notify client if email available
      if (declineOrder.client_email) {
        await supabase.functions.invoke("send-email", {
          body: {
            to: declineOrder.client_email,
            subject: "Service Request Update",
            body: `Hi ${declineOrder.client_name || "there"},\n\nUnfortunately, we are unable to fill your care request at this time. We currently do not have caregivers available in your area.\n\n${declineReason ? `Reason: ${declineReason}\n\n` : ""}We apologize for the inconvenience. Please try again later or contact us for alternatives.\n\nThank you,\nPSW Direct Team`,
          },
        });
      }
      toast.success("Request declined");
      await loadData();
    }

    setProcessing(false);
    setDeclineOrder(null);
    setDeclineReason("");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />Last 7 Days
            </div>
            <p className="text-2xl font-bold text-destructive">{last7}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />Last 30 Days
            </div>
            <p className="text-2xl font-bold text-foreground">{last30}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <MapPin className="w-4 h-4" />Top City
            </div>
            <p className="text-lg font-semibold text-foreground truncate">{topCity}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <BarChart3 className="w-4 h-4" />Top FSA
            </div>
            <p className="text-lg font-semibold text-foreground truncate">{topFSA}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="PAYMENT_SENT">Payment Sent</SelectItem>
            <SelectItem value="DECLINED">Declined</SelectItem>
            <SelectItem value="RESOLVED">Resolved</SelectItem>
          </SelectContent>
        </Select>
        <Select value={dateFilter} onValueChange={setDateFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cityFilter} onValueChange={setCityFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Cities" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Cities</SelectItem>
            {uniqueCities.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={serviceFilter} onValueChange={setServiceFilter}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Services" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Services</SelectItem>
            {uniqueServices.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Unserved Requests ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                   <TableHead>Date</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Reason</TableHead>
                   <TableHead>Client</TableHead>
                   <TableHead>Phone</TableHead>
                   <TableHead>City</TableHead>
                   <TableHead>Service</TableHead>
                   <TableHead>PSWs</TableHead>
                   <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      No unserved requests in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map(order => (
                    <TableRow key={order.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {format(new Date(order.created_at), "MMM d, HH:mm")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_COLORS[order.status] || ""}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{order.client_name || "—"}</TableCell>
                      <TableCell className="text-sm">
                        {order.client_phone ? (
                          <a href={`tel:${order.client_phone}`} className="text-primary hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" />{order.client_phone}
                          </a>
                        ) : "—"}
                      </TableCell>
                      <TableCell>{order.city || "—"}</TableCell>
                      <TableCell className="text-sm">{order.service_type || "—"}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{order.psw_count_found}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setViewOrder(order)} title="View details">
                            <Eye className="w-4 h-4" />
                          </Button>
                          {order.status === "PENDING" && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => setAssignOrder(order)} title="Assign PSW">
                                <UserPlus className="w-4 h-4 text-primary" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setDeclineOrder(order)} title="Decline">
                                <XCircle className="w-4 h-4 text-destructive" />
                              </Button>
                            </>
                          )}
                          {order.status === "PAYMENT_SENT" && order.payment_link_token && (
                            <Button variant="ghost" size="sm" onClick={() => {
                              const link = `${window.location.origin}/pay/${order.payment_link_token}`;
                              navigator.clipboard.writeText(link);
                              toast.success("Payment link copied!");
                            }} title="Copy payment link">
                              <Copy className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
            <DialogDescription>Full details of the unserved request</DialogDescription>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Status:</strong> <Badge variant="outline" className={STATUS_COLORS[viewOrder.status]}>{viewOrder.status}</Badge></div>
                <div><strong>Created:</strong> {format(new Date(viewOrder.created_at), "MMM d, yyyy h:mm a")}</div>
                <div><strong>Client:</strong> {viewOrder.client_name || "—"}</div>
                <div><strong>Phone:</strong> {viewOrder.client_phone || "—"}</div>
                <div><strong>Email:</strong> {viewOrder.client_email || "—"}</div>
                <div><strong>City:</strong> {viewOrder.city || "—"}</div>
                <div><strong>Postal:</strong> {viewOrder.postal_code_raw || "—"} (FSA: {viewOrder.postal_fsa || "—"})</div>
                <div><strong>Service:</strong> {viewOrder.service_type || "—"}</div>
                <div><strong>Radius:</strong> {viewOrder.radius_checked_km ?? "—"} km</div>
                <div><strong>PSWs Found:</strong> {viewOrder.psw_count_found}</div>
                <div><strong>Reason:</strong> {viewOrder.reason}</div>
                {viewOrder.pending_expires_at && (
                  <div><strong>Expires:</strong> {format(new Date(viewOrder.pending_expires_at), "MMM d, yyyy h:mm a")}</div>
                )}
                {viewOrder.decline_reason && <div className="col-span-2"><strong>Decline Reason:</strong> {viewOrder.decline_reason}</div>}
                {viewOrder.payment_intent_id && <div className="col-span-2"><strong>Payment Intent:</strong> <code className="text-xs">{viewOrder.payment_intent_id}</code></div>}
              </div>
              {viewOrder.full_client_payload && (
                <div>
                  <strong>Full Client Data:</strong>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-40">
                    {JSON.stringify(viewOrder.full_client_payload, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign PSW Dialog */}
      <Dialog open={!!assignOrder} onOpenChange={() => { setAssignOrder(null); setSelectedPsw(null); setPswSearch(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign PSW to Request</DialogTitle>
            <DialogDescription>
              Select an approved PSW. A payment link will be sent to the client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search PSW</Label>
              <Input placeholder="Name or city..." value={pswSearch} onChange={e => setPswSearch(e.target.value)} />
            </div>
            <div className="max-h-48 overflow-y-auto border rounded">
              {loadingPsws ? (
                <div className="p-4 text-center"><Loader2 className="w-4 h-4 animate-spin mx-auto" /></div>
              ) : pswOptions.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">No PSWs found</div>
              ) : (
                pswOptions.map(psw => (
                  <button
                    key={psw.id}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-muted flex justify-between items-center ${selectedPsw?.id === psw.id ? "bg-primary/10 border-l-2 border-primary" : ""}`}
                    onClick={() => setSelectedPsw(psw)}
                  >
                    <span>{psw.first_name} {psw.last_name}</span>
                    <span className="text-xs text-muted-foreground">{psw.home_city || ""}</span>
                  </button>
                ))
              )}
            </div>
            {selectedPsw && (
              <div className="p-2 bg-primary/5 rounded text-sm flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-primary" />
                Selected: <strong>{selectedPsw.first_name} {selectedPsw.last_name}</strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignOrder(null)}>Cancel</Button>
            <Button onClick={handleAssignPSW} disabled={!selectedPsw || processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Assign & Send Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={!!declineOrder} onOpenChange={() => { setDeclineOrder(null); setDeclineReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Request</DialogTitle>
            <DialogDescription>
              {declineOrder?.client_name && `Declining request from ${declineOrder.client_name}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                value={declineReason}
                onChange={e => setDeclineReason(e.target.value)}
                placeholder="No PSWs available in this area..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOrder(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDecline} disabled={processing}>
              {processing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
              Decline Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
