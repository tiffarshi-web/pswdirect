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
import {
  AlertTriangle, MapPin, Calendar, BarChart3, Loader2, Phone, Mail, Eye, UserPlus, XCircle, Copy,
  CheckCircle, ExternalLink, RefreshCw, ClipboardList, ShieldAlert,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, isAfter } from "date-fns";
import { toast } from "sonner";

interface AuditEntry { at: string; by: string; action: string; note?: string | null; }

interface UnservedOrder {
  id: string;
  created_at: string;
  service_type: string | null;
  tasks: string[] | null;
  requested_start_time: string | null;
  city: string | null;
  address: string | null;
  postal_code_raw: string | null;
  postal_fsa: string | null;
  radius_checked_km: number | null;
  psw_count_found: number;
  reason: string;
  severity: string | null;
  source_table: string | null;
  source_event_id: string | null;
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
  payment_status: string | null;
  full_client_payload: Record<string, any> | null;
  booking_id: string | null;
  booking_code: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_action: string | null;
  audit_log: AuditEntry[] | null;
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
  DISMISSED: "bg-gray-100 text-gray-600 border-gray-300",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 border-gray-300",
  medium: "bg-amber-100 text-amber-800 border-amber-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-400 animate-pulse",
};

const REASON_TO_SEVERITY: Record<string, string> = {
  GEOCODE_FAILED: "medium",
  NO_PSW_FOUND: "medium",
  NO_PSW_IN_RADIUS: "medium",
  SCHEDULE_EXPIRED: "medium",
  WEBHOOK_FAILED: "high",
  DISPATCH_NOT_TRIGGERED: "high",
  PAID_BUT_NO_ORDER: "critical",
  PAYMENT_WEBHOOK_REQUIRES_REVIEW: "critical",
};

const sevOf = (o: UnservedOrder) =>
  (o.severity || REASON_TO_SEVERITY[(o.reason || "").toUpperCase()] || "medium").toLowerCase();

export const UnservedRequestsSection = () => {
  const [orders, setOrders] = useState<UnservedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState("30");
  const [cityFilter, setCityFilter] = useState("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("active");
  const [severityFilter, setSeverityFilter] = useState("all");

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
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

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
      if (severityFilter !== "all" && sevOf(o) !== severityFilter) return false;
      if (statusFilter === "active" && ["DECLINED", "EXPIRED", "RESOLVED", "DISMISSED"].includes(o.status)) return false;
      if (statusFilter !== "active" && statusFilter !== "all" && o.status !== statusFilter) return false;
      return true;
    });
  }, [orders, dateFilter, cityFilter, serviceFilter, statusFilter, severityFilter]);

  const last7 = useMemo(() => {
    const cutoff = subDays(new Date(), 7);
    return orders.filter(o => isAfter(new Date(o.created_at), cutoff)).length;
  }, [orders]);
  const criticalOpen = useMemo(
    () => orders.filter(o => sevOf(o) === "critical" && !["RESOLVED", "DISMISSED", "PAID"].includes(o.status)).length,
    [orders]
  );
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

  const logAction = async (
    id: string,
    action: string,
    note?: string,
    opts?: { resolve?: boolean; newStatus?: string }
  ) => {
    const { error } = await (supabase as any).rpc("admin_log_unserved_action", {
      p_id: id,
      p_action: action,
      p_note: note ?? null,
      p_resolve: !!opts?.resolve,
      p_new_status: opts?.newStatus ?? null,
    });
    if (error) toast.error("Failed to log action: " + error.message);
    return !error;
  };

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
      await logAction(assignOrder.id, "assigned_psw", `${selectedPsw.first_name} ${selectedPsw.last_name}`);
      if (assignOrder.client_email) {
        await supabase.functions.invoke("send-email", {
          body: {
            to: assignOrder.client_email,
            subject: "Your Care Request - Complete Your Booking",
            body: `Hi ${assignOrder.client_name || "there"},\n\nGreat news! We found a caregiver willing to travel to your area.\n\nPlease complete your booking by making payment here:\n${payLink}\n\nThis link expires in 24 hours.\n\nThank you,\nPSW Direct Team`,
          },
        });
      }
      navigator.clipboard.writeText(payLink);
      toast.success("PSW assigned. Payment link copied to clipboard.");
      await loadData();
    }
    setProcessing(false);
    setAssignOrder(null);
    setSelectedPsw(null);
    setPswSearch("");
  };

  const handleDecline = async () => {
    if (!declineOrder) return;
    setProcessing(true);
    const { error } = await (supabase as any)
      .from("unserved_orders")
      .update({ status: "DECLINED", decline_reason: declineReason || "No PSWs available in area" })
      .eq("id", declineOrder.id);

    if (error) {
      toast.error("Failed to decline: " + error.message);
    } else {
      await logAction(declineOrder.id, "declined", declineReason || null, { resolve: true, newStatus: "DECLINED" });
      if (declineOrder.client_email) {
        await supabase.functions.invoke("send-email", {
          body: {
            to: declineOrder.client_email,
            subject: "Service Request Update",
            body: `Hi ${declineOrder.client_name || "there"},\n\nUnfortunately, we are unable to fill your care request at this time.${declineReason ? `\n\nReason: ${declineReason}` : ""}\n\nThank you,\nPSW Direct Team`,
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

  const handleMarkResolved = async (o: UnservedOrder) => {
    const ok = await logAction(o.id, "marked_resolved", null, { resolve: true, newStatus: "RESOLVED" });
    if (ok) { toast.success("Marked as resolved"); await loadData(); setViewOrder(null); }
  };
  const handleDismissDuplicate = async (o: UnservedOrder) => {
    const ok = await logAction(o.id, "dismissed_duplicate", null, { resolve: true, newStatus: "DISMISSED" });
    if (ok) { toast.success("Dismissed as duplicate"); await loadData(); setViewOrder(null); }
  };
  const handleRetryDispatch = async (o: UnservedOrder) => {
    const { error } = await supabase.functions.invoke("notify-psws", {
      body: { booking_id: o.booking_id, unserved_id: o.id },
    });
    if (error) { toast.error("Retry dispatch failed: " + error.message); return; }
    await logAction(o.id, "retry_dispatch");
    toast.success("Dispatch retry triggered");
    await loadData();
  };
  const handleRetryGeocode = async (o: UnservedOrder) => {
    await logAction(o.id, "retry_geocode_requested",
      `Postal: ${o.postal_code_raw || "—"} · Address: ${o.address || "—"}`);
    toast.info("Geocode retry logged. Run the geocoder against this postal/address.");
    await loadData();
  };
  const copyPaymentLink = (o: UnservedOrder) => {
    if (!o.payment_link_token) return;
    const link = `${window.location.origin}/pay/${o.payment_link_token}`;
    navigator.clipboard.writeText(link);
    toast.success("Payment link copied");
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
              <ShieldAlert className="w-4 h-4 text-destructive" />Critical Open
            </div>
            <p className="text-2xl font-bold text-destructive">{criticalOpen}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <AlertTriangle className="w-4 h-4" />Last 7 Days
            </div>
            <p className="text-2xl font-bold text-foreground">{last7}</p>
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
            <SelectItem value="DISMISSED">Dismissed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Severity" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
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
          <CardTitle className="text-base">Unserved & Recovery ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      No unserved or recovery items in this period
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map(order => {
                    const sev = sevOf(order);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(order.created_at), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={SEVERITY_COLORS[sev]}>
                            {sev.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[order.status] || ""}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs font-mono">
                            {order.reason?.replace(/_/g, " ") || "—"}
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
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setViewOrder(order)} title="View details">
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!["RESOLVED", "DISMISSED", "DECLINED"].includes(order.status) && (
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
                              <Button variant="ghost" size="sm" onClick={() => copyPaymentLink(order)} title="Copy payment link">
                                <Copy className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View / Recovery Dialog */}
      <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Recovery Details
              {viewOrder && (
                <Badge variant="outline" className={SEVERITY_COLORS[sevOf(viewOrder)]}>
                  {sevOf(viewOrder).toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Admin-only view. Client phone, email and address are not visible to PSWs.
            </DialogDescription>
          </DialogHeader>
          {viewOrder && (
            <div className="space-y-4 text-sm">
              {/* Client contact */}
              <div className="rounded-md border p-3 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Client</div>
                <div><strong>Name:</strong> {viewOrder.client_name || "—"}</div>
                <div className="flex items-center gap-2">
                  <strong>Phone:</strong> {viewOrder.client_phone || "—"}
                  {viewOrder.client_phone && (
                    <Button asChild size="sm" variant="outline" className="h-7">
                      <a href={`tel:${viewOrder.client_phone}`}><Phone className="w-3 h-3 mr-1" />Call</a>
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <strong>Email:</strong> {viewOrder.client_email || "—"}
                  {viewOrder.client_email && (
                    <Button asChild size="sm" variant="outline" className="h-7">
                      <a href={`mailto:${viewOrder.client_email}`}><Mail className="w-3 h-3 mr-1" />Email</a>
                    </Button>
                  )}
                </div>
                <div><strong>Address:</strong> {viewOrder.address || "—"}</div>
                <div><strong>City:</strong> {viewOrder.city || "—"}</div>
                <div><strong>Postal:</strong> {viewOrder.postal_code_raw || "—"} (FSA: {viewOrder.postal_fsa || "—"})</div>
              </div>

              {/* Service */}
              <div className="rounded-md border p-3 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Service</div>
                <div><strong>Service type:</strong> {viewOrder.service_type || "—"}</div>
                <div><strong>Tasks:</strong> {viewOrder.tasks?.length ? viewOrder.tasks.join(", ") : "—"}</div>
                <div><strong>Requested time:</strong> {viewOrder.requested_start_time
                  ? format(new Date(viewOrder.requested_start_time), "MMM d, yyyy h:mm a") : "—"}</div>
                <div><strong>Radius checked:</strong> {viewOrder.radius_checked_km ?? "—"} km</div>
                <div><strong>PSWs found:</strong> {viewOrder.psw_count_found}</div>
              </div>

              {/* Payment / Order refs */}
              <div className="rounded-md border p-3 space-y-1">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Payment & Order</div>
                <div><strong>Payment status:</strong> {viewOrder.payment_status || "—"}</div>
                <div className="break-all">
                  <strong>Stripe PI:</strong>{" "}
                  {viewOrder.payment_intent_id ? (
                    <code className="text-xs">{viewOrder.payment_intent_id}</code>
                  ) : "—"}
                </div>
                <div><strong>Booking ID:</strong> {viewOrder.booking_id || "—"}</div>
                <div><strong>Booking Code:</strong> {viewOrder.booking_code || "—"}</div>
                <div><strong>Source:</strong> {viewOrder.source_table || "—"}{viewOrder.source_event_id ? ` · ${viewOrder.source_event_id}` : ""}</div>
                <div><strong>Reason:</strong> {viewOrder.reason}</div>
              </div>

              {/* Recovery actions */}
              <div className="rounded-md border p-3 space-y-2">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Recovery actions</div>
                <div className="flex flex-wrap gap-2">
                  {viewOrder.client_phone && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`tel:${viewOrder.client_phone}`} onClick={() => logAction(viewOrder.id, "called_client")}>
                        <Phone className="w-3 h-3 mr-1" />Call client
                      </a>
                    </Button>
                  )}
                  {viewOrder.client_email && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`mailto:${viewOrder.client_email}`} onClick={() => logAction(viewOrder.id, "emailed_client")}>
                        <Mail className="w-3 h-3 mr-1" />Email client
                      </a>
                    </Button>
                  )}
                  {viewOrder.booking_id && (
                    <Button asChild size="sm" variant="outline">
                      <a href={`/admin?booking=${viewOrder.booking_id}`} target="_blank" rel="noreferrer">
                        <ExternalLink className="w-3 h-3 mr-1" />View booking
                      </a>
                    </Button>
                  )}
                  {viewOrder.payment_intent_id && (
                    <Button size="sm" variant="outline" onClick={() => {
                      navigator.clipboard.writeText(viewOrder.payment_intent_id!);
                      toast.success("Payment intent ID copied");
                      logAction(viewOrder.id, "copied_payment_intent");
                    }}>
                      <Copy className="w-3 h-3 mr-1" />Copy Stripe ref
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => handleRetryGeocode(viewOrder)}>
                    <RefreshCw className="w-3 h-3 mr-1" />Retry geocode
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleRetryDispatch(viewOrder)}>
                    <RefreshCw className="w-3 h-3 mr-1" />Retry dispatch
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setAssignOrder(viewOrder); setViewOrder(null); }}>
                    <UserPlus className="w-3 h-3 mr-1" />Assign PSW
                  </Button>
                  <Button size="sm" variant="default" onClick={() => handleMarkResolved(viewOrder)}>
                    <CheckCircle className="w-3 h-3 mr-1" />Mark resolved
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDismissDuplicate(viewOrder)}>
                    <XCircle className="w-3 h-3 mr-1" />Dismiss duplicate
                  </Button>
                </div>
              </div>

              {/* Audit log */}
              <div className="rounded-md border p-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
                  <ClipboardList className="w-3 h-3" /> Audit log
                </div>
                <div className="text-xs space-y-1">
                  <div><strong>Created:</strong> {format(new Date(viewOrder.created_at), "MMM d, yyyy h:mm a")}</div>
                  {viewOrder.resolved_at && (
                    <div>
                      <strong>Resolved:</strong> {format(new Date(viewOrder.resolved_at), "MMM d, yyyy h:mm a")}
                      {viewOrder.resolved_by ? ` by ${viewOrder.resolved_by}` : ""}
                      {viewOrder.resolved_action ? ` (${viewOrder.resolved_action})` : ""}
                    </div>
                  )}
                  {(viewOrder.audit_log || []).length === 0 ? (
                    <div className="text-muted-foreground">No admin actions yet.</div>
                  ) : (
                    <ul className="divide-y">
                      {(viewOrder.audit_log || []).map((e, i) => (
                        <li key={i} className="py-1">
                          <span className="font-mono">{e.at}</span> · {e.by} · <strong>{e.action}</strong>
                          {e.note ? ` — ${e.note}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {viewOrder.full_client_payload && (
                <details>
                  <summary className="cursor-pointer text-xs text-muted-foreground">Raw client payload</summary>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto max-h-48">
{JSON.stringify(viewOrder.full_client_payload, null, 2)}
                  </pre>
                </details>
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
