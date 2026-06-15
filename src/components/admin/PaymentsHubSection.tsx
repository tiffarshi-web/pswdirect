// Admin → Payments dashboard
// Three tabs (Successful, Failed, Webhook Events) + Sync Stripe Payments.
// Read-only views over bookings, payment_failure_logs, stripe_webhook_events.
// Action buttons call existing edge functions (send-payment-link,
// admin-stripe-tools). Never mutates booking/invoice math.

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  RefreshCw, Loader2, ExternalLink, Send, AlertTriangle, CheckCircle2,
  XCircle, Search, CreditCard, FileText, Activity, DownloadCloud, RotateCw,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────
interface SuccessRow {
  id: string;
  booking_code: string;
  client_name: string | null;
  service_type: string[] | null;
  total: number | null;
  stripe_payment_intent_id: string | null;
  payment_status: string | null;
  status: string | null;
  created_at: string;
  invoice?: { id: string; invoice_number: string; status: string | null } | null;
}

interface FailureRow {
  id: string;
  booking_id: string | null;
  booking_code: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  service_type: string | null;
  amount: number | null;
  decline_code: string | null;
  failure_code: string | null;
  error_message: string | null;
  payment_intent_id: string | null;
  source_event_type: string | null;
  created_at: string;
}

interface WebhookRow {
  event_id: string;
  event_type: string;
  status: string;
  error_message: string | null;
  received_at: string;
  processed_at: string | null;
  payload: any;
}

const fmtMoney = (n: number | null | undefined) =>
  n == null ? "—" : `$${Number(n).toFixed(2)}`;

const stripeDashUrl = (mode: "live" | "test", path: string) =>
  `https://dashboard.stripe.com/${mode === "test" ? "test/" : ""}${path}`;

export const PaymentsHubSection = () => {
  const [tab, setTab] = useState<"success" | "failed" | "events">("success");
  const [stripeMode, setStripeMode] = useState<"live" | "test">("live");

  // Sync result
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);

  // Detect mode (best effort from app_settings)
  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "stripe_mode")
          .maybeSingle();
        if (data?.value === "test") setStripeMode("test");
      } catch { /* ignore */ }
    })();
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("admin-stripe-tools", {
        body: { action: "sync_payments", days: 7 },
      });
      if (error) throw error;
      setSyncResult(data);
      if (data?.enqueued > 0) {
        toast.success(`${data.enqueued} orphan payment(s) added to Recovery Queue`);
      } else {
        toast.success(`Scanned ${data?.scanned ?? 0} Stripe payments — all reconciled ✓`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payments
          </CardTitle>
          <CardDescription>
            Stripe payment health: successful payments, failed cards, and webhook events.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={runSync} disabled={syncing} variant="default" size="sm">
            {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <DownloadCloud className="h-4 w-4 mr-2" />}
            Sync Stripe Payments
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {syncResult && (
          <div className="mb-4 rounded-md border bg-muted/30 p-3 text-sm">
            <div className="font-medium mb-1 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              Sync complete
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <Stat label="Scanned" value={syncResult.scanned} />
              <Stat label="Succeeded" value={syncResult.succeeded} />
              <Stat label="Matched" value={syncResult.matched} />
              <Stat label="Already queued" value={syncResult.already_in_queue} />
              <Stat label="Enqueued" value={syncResult.enqueued} highlight={syncResult.enqueued > 0} />
            </div>
            {syncResult.errors?.length > 0 && (
              <div className="mt-2 text-xs text-destructive">
                {syncResult.errors.length} error(s). Check edge function logs.
              </div>
            )}
          </div>
        )}

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="success">
              <CheckCircle2 className="h-4 w-4 mr-1.5" /> Successful
            </TabsTrigger>
            <TabsTrigger value="failed">
              <XCircle className="h-4 w-4 mr-1.5" /> Failed
            </TabsTrigger>
            <TabsTrigger value="events">
              <Activity className="h-4 w-4 mr-1.5" /> Webhook Events
            </TabsTrigger>
          </TabsList>

          <TabsContent value="success" className="mt-4">
            <SuccessfulTab stripeMode={stripeMode} />
          </TabsContent>
          <TabsContent value="failed" className="mt-4">
            <FailedTab stripeMode={stripeMode} />
          </TabsContent>
          <TabsContent value="events" className="mt-4">
            <WebhookEventsTab stripeMode={stripeMode} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const Stat = ({ label, value, highlight }: { label: string; value: any; highlight?: boolean }) => (
  <div className="rounded bg-background border px-2 py-1.5">
    <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
    <div className={`text-base font-semibold ${highlight ? "text-amber-600" : ""}`}>{value ?? 0}</div>
  </div>
);

// ─── Successful Payments ─────────────────────────────────────────────────
const SuccessfulTab = ({ stripeMode }: { stripeMode: "live" | "test" }) => {
  const [rows, setRows] = useState<SuccessRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, booking_code, client_name, service_type, total, stripe_payment_intent_id, payment_status, status, created_at")
        .eq("payment_status", "paid")
        .not("stripe_payment_intent_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;

      const ids = (data || []).map((r: any) => r.id);
      let invoiceMap: Record<string, any> = {};
      if (ids.length) {
        const { data: invs } = await supabase
          .from("invoices")
          .select("id, invoice_number, status, booking_id")
          .in("booking_id", ids);
        (invs || []).forEach((i: any) => { invoiceMap[i.booking_id] = i; });
      }
      setRows((data || []).map((r: any) => ({ ...r, invoice: invoiceMap[r.id] || null })));
    } catch (e: any) {
      toast.error(e?.message || "Failed to load successful payments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.booking_code, r.client_name, r.stripe_payment_intent_id, r.invoice?.invoice_number]
        .filter(Boolean)
        .some((s) => String(s).toLowerCase().includes(q)),
    );
  }, [rows, search]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-8" placeholder="Search code, client, PI, invoice…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <ScrollArea className="h-[60vh]">
        <div className="space-y-2 pr-3">
          {loading && <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 mr-2 animate-spin" />Loading…</div>}
          {!loading && filtered.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No successful payments found.</div>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-semibold">{r.booking_code}</span>
                  <Badge variant="secondary">{(r.service_type || []).join(", ") || "—"}</Badge>
                  <span className="text-muted-foreground">{r.client_name || "—"}</span>
                </div>
                <div className="font-semibold">{fmtMoney(r.total)}</div>
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span>{format(new Date(r.created_at), "MMM d, yyyy h:mm a")}</span>
                {r.stripe_payment_intent_id && (
                  <a
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                    href={stripeDashUrl(stripeMode, `payments/${r.stripe_payment_intent_id}`)}
                    target="_blank" rel="noreferrer"
                  >
                    {r.stripe_payment_intent_id} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {r.invoice ? (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> {r.invoice.invoice_number}
                    <Badge variant="outline" className="ml-1">{r.invoice.status || "—"}</Badge>
                  </span>
                ) : (
                  <Badge variant="destructive">No invoice</Badge>
                )}
                <Badge variant="outline">order: {r.status || "—"}</Badge>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// ─── Failed Payments ─────────────────────────────────────────────────────
const FailedTab = ({ stripeMode }: { stripeMode: "live" | "test" }) => {
  const [rows, setRows] = useState<FailureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("payment_failure_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows((data as any) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendLink = async (r: FailureRow) => {
    if (!r.booking_id) {
      toast.error("This failure has no linked booking — cannot send payment link.");
      return;
    }
    setBusy(r.id);
    try {
      const { data, error } = await supabase.functions.invoke("send-payment-link", {
        body: { booking_id: r.booking_id },
      });
      if (error) throw error;
      toast.success(`Payment link sent for ${r.booking_code || r.booking_id}`);
    } catch (e: any) {
      toast.error(e?.message || "Failed to send payment link");
    } finally {
      setBusy(null);
    }
  };

  const viewBooking = (r: FailureRow) => {
    if (!r.booking_code) {
      toast.error("No booking code on this failure record.");
      return;
    }
    // Use a query param the existing Orders tab can pick up later; for now open new tab
    window.open(`/admin?booking=${encodeURIComponent(r.booking_code)}`, "_blank");
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {rows.length} failed payment attempt(s)
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <ScrollArea className="h-[60vh]">
        <div className="space-y-2 pr-3">
          {loading && <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 mr-2 animate-spin" />Loading…</div>}
          {!loading && rows.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">No failed payments logged ✓</div>
          )}
          {rows.map((r) => (
            <div key={r.id} className="rounded-md border p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {r.booking_code && <span className="font-mono font-semibold">{r.booking_code}</span>}
                  {r.service_type && <Badge variant="secondary">{r.service_type}</Badge>}
                  <span className="text-muted-foreground">{r.client_name || "—"}</span>
                </div>
                <div className="font-semibold">{fmtMoney(r.amount)}</div>
              </div>

              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {r.client_email && <span>📧 {r.client_email}</span>}
                {r.client_phone && <span>📞 {r.client_phone}</span>}
                <span>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                {r.payment_intent_id && (
                  <a className="inline-flex items-center gap-1 text-primary hover:underline"
                    href={stripeDashUrl(stripeMode, `payments/${r.payment_intent_id}`)}
                    target="_blank" rel="noreferrer">
                    {r.payment_intent_id} <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>

              <div className="mt-2 rounded bg-destructive/5 border border-destructive/20 p-2 text-xs">
                <div className="flex items-center gap-2 font-medium text-destructive">
                  <XCircle className="h-3.5 w-3.5" />
                  {r.decline_code || r.failure_code || "card_error"}
                </div>
                {r.error_message && <div className="mt-0.5 text-muted-foreground">{r.error_message}</div>}
                {r.source_event_type && (
                  <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                    via {r.source_event_type}
                  </div>
                )}
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" variant="default" disabled={busy === r.id || !r.booking_id} onClick={() => sendLink(r)}>
                  {busy === r.id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1" />}
                  Send Payment Link
                </Button>
                <Button size="sm" variant="outline" disabled={!r.booking_code} onClick={() => viewBooking(r)}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> View Booking
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

// ─── Webhook Events ──────────────────────────────────────────────────────
const WebhookEventsTab = ({ stripeMode }: { stripeMode: "live" | "test" }) => {
  const [rows, setRows] = useState<WebhookRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "failed" | "received">("all");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let q = supabase
        .from("stripe_webhook_events")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(200);
      if (filter !== "all") q = q.eq("status", filter);
      const { data, error } = await q;
      if (error) throw error;
      setRows((data as any) || []);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const retry = async (r: WebhookRow) => {
    if (r.status !== "failed") return;
    setBusy(r.event_id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-stripe-tools", {
        body: { action: "retry_event", event_id: r.event_id },
      });
      if (error) throw error;
      if (data?.ok) {
        toast.success(`Event ${r.event_id} reprocessed`);
        await load();
      } else {
        toast.error(`Retry returned status ${data?.status}: ${data?.webhook_response || ""}`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Retry failed");
    } finally {
      setBusy(null);
    }
  };

  const extractMeta = (payload: any) => {
    const obj = payload?.data?.object || {};
    const pi = obj.id?.startsWith?.("pi_") ? obj.id : (obj.payment_intent || null);
    const bookingId = obj.metadata?.booking_id || obj.metadata?.booking_session_id || null;
    const bookingCode = obj.metadata?.booking_code || null;
    return { pi, bookingId, bookingCode };
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(["all", "failed", "received"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <ScrollArea className="h-[60vh]">
        <div className="space-y-2 pr-3">
          {loading && <div className="py-8 text-center text-sm text-muted-foreground"><Loader2 className="inline h-4 w-4 mr-2 animate-spin" />Loading…</div>}
          {!loading && rows.length === 0 && <div className="py-8 text-center text-sm text-muted-foreground">No events.</div>}
          {rows.map((r) => {
            const { pi, bookingId, bookingCode } = extractMeta(r.payload);
            return (
              <div key={r.event_id} className="rounded-md border p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono">{r.event_type}</Badge>
                    <Badge variant={r.status === "processed" ? "secondary" : r.status === "failed" ? "destructive" : "outline"}>
                      {r.status}
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(r.received_at), "MMM d, h:mm:ss a")}
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <a className="font-mono hover:underline text-primary"
                    href={stripeDashUrl(stripeMode, `events/${r.event_id}`)}
                    target="_blank" rel="noreferrer">{r.event_id}</a>
                  {pi && (
                    <a className="font-mono hover:underline text-primary"
                      href={stripeDashUrl(stripeMode, `payments/${pi}`)}
                      target="_blank" rel="noreferrer">{pi}</a>
                  )}
                  {bookingCode && <span>booking: {bookingCode}</span>}
                  {bookingId && !bookingCode && <span className="font-mono text-[10px]">{bookingId}</span>}
                  {r.processed_at && <span>processed {formatDistanceToNow(new Date(r.processed_at), { addSuffix: true })}</span>}
                </div>
                {r.error_message && (
                  <div className="mt-2 rounded bg-destructive/5 border border-destructive/20 p-2 text-xs text-destructive">
                    {r.error_message}
                  </div>
                )}
                {r.status === "failed" && (
                  <div className="mt-2">
                    <Button size="sm" variant="default" onClick={() => retry(r)} disabled={busy === r.event_id}>
                      {busy === r.event_id ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <RotateCw className="h-3.5 w-3.5 mr-1" />}
                      Retry / Reprocess
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};

export default PaymentsHubSection;
