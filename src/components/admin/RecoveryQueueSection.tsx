// Recovery Queue — surfaces successful Stripe payments that have NO matching
// booking (orphaned charges). Admins can resolve by linking to an existing
// booking, or by marking refunded/ignored. Critical revenue safety net.

import { useEffect, useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { AlertCircle, RefreshCw, Link2, XCircle, Loader2, CheckCircle2, Mail, DollarSign, CreditCard, Search } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

interface UnreconciledPayment {
  id: string;
  stripe_payment_intent_id: string;
  stripe_customer_id: string | null;
  stripe_payment_method_id: string | null;
  amount: number;
  currency: string;
  customer_email: string | null;
  customer_name: string | null;
  raw_metadata: Record<string, any> | null;
  reason: string;
  status: "open" | "resolved" | "refunded" | "ignored";
  resolved_booking_id: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  resolution_note: string | null;
  stripe_event_id: string | null;
  created_at: string;
}

interface BookingLite {
  id: string;
  booking_code: string;
  client_name: string;
  client_email: string;
  total: number;
  scheduled_date: string;
  payment_status: string;
}

export const RecoveryQueueSection = () => {
  const [items, setItems] = useState<UnreconciledPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [linkDialogFor, setLinkDialogFor] = useState<UnreconciledPayment | null>(null);
  const [dismissDialogFor, setDismissDialogFor] = useState<UnreconciledPayment | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const query = supabase
      .from("unreconciled_payments" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    const { data, error } = filter === "open"
      ? await query.eq("status", "open")
      : await query;
    if (error) {
      console.error("Failed to load unreconciled payments:", error);
      toast.error("Failed to load recovery queue");
      setItems([]);
    } else {
      setItems((data as any) || []);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const openCount = useMemo(() => items.filter(i => i.status === "open").length, [items]);

  const handleDismiss = async (note: string, status: "ignored" | "refunded") => {
    if (!dismissDialogFor) return;
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("admin_dismiss_unreconciled_payment", {
      p_unreconciled_id: dismissDialogFor.id,
      p_status: status,
      p_note: note || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(`Failed to dismiss: ${error.message}`);
    } else {
      toast.success(`Marked as ${status}`);
      setDismissDialogFor(null);
      load();
    }
  };

  const statusBadge = (s: UnreconciledPayment["status"]) => {
    if (s === "open") return <Badge variant="destructive">Open</Badge>;
    if (s === "resolved") return <Badge className="bg-green-600">Resolved</Badge>;
    if (s === "refunded") return <Badge variant="outline">Refunded</Badge>;
    return <Badge variant="secondary">Ignored</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-destructive" />
            Paid but Unreconciled
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Stripe payments that succeeded but were not matched to a booking. Resolve each by linking it to the correct order, or marking it refunded/ignored.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={filter === "open" ? "default" : "outline"}
            onClick={() => setFilter("open")}
          >
            Open ({openCount})
          </Button>
          <Button
            size="sm"
            variant={filter === "all" ? "default" : "outline"}
            onClick={() => setFilter("all")}
          >
            All
          </Button>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto" />
            <p className="text-sm font-medium text-foreground">
              {filter === "open" ? "No unreconciled payments — all clear." : "No payments in queue."}
            </p>
            <p className="text-xs text-muted-foreground">
              Successful Stripe charges that can't be matched to an order automatically appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <Card key={p.id} className={p.status === "open" ? "border-destructive/40" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                      <DollarSign className="w-4 h-4 text-primary" />
                      ${Number(p.amount).toFixed(2)} {p.currency.toUpperCase()}
                      {statusBadge(p.status)}
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <CreditCard className="w-3 h-3" />
                        <code className="font-mono">{p.stripe_payment_intent_id}</code>
                      </div>
                      {p.customer_email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          {p.customer_email}{p.customer_name ? ` (${p.customer_name})` : ""}
                        </div>
                      )}
                      <div>
                        Received {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })} · Reason: <span className="text-destructive">{p.reason}</span>
                      </div>
                    </CardDescription>
                  </div>
                  {p.status === "open" && (
                    <div className="flex gap-2 flex-shrink-0">
                      <Button size="sm" variant="default" onClick={() => setLinkDialogFor(p)}>
                        <Link2 className="w-3.5 h-3.5 mr-1.5" />
                        Link to Order
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setDismissDialogFor(p)}>
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                        Dismiss
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              {(p.raw_metadata && Object.keys(p.raw_metadata).length > 0) || p.resolution_note ? (
                <CardContent className="pt-0 text-xs">
                  {p.raw_metadata && Object.keys(p.raw_metadata).length > 0 && (
                    <details className="mb-2">
                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                        Stripe metadata ({Object.keys(p.raw_metadata).length} fields)
                      </summary>
                      <pre className="mt-2 p-2 bg-muted rounded text-[11px] overflow-x-auto">
{JSON.stringify(p.raw_metadata, null, 2)}
                      </pre>
                    </details>
                  )}
                  {p.resolution_note && (
                    <div className="text-muted-foreground">
                      <span className="font-medium">Resolution note:</span> {p.resolution_note}
                      {p.resolved_by && p.resolved_at && (
                        <span className="block text-[11px] mt-1">
                          by {p.resolved_by} · {format(new Date(p.resolved_at), "MMM d, yyyy h:mm a")}
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <LinkToOrderDialog
        item={linkDialogFor}
        onClose={() => setLinkDialogFor(null)}
        onResolved={() => { setLinkDialogFor(null); load(); }}
      />

      <Dialog open={!!dismissDialogFor} onOpenChange={(o) => !o && setDismissDialogFor(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss Unreconciled Payment</DialogTitle>
            <DialogDescription>
              Mark this Stripe charge as handled outside the system. Choose "Refunded" if you've already issued a refund in Stripe, or "Ignored" if it's a duplicate or already reconciled manually.
            </DialogDescription>
          </DialogHeader>
          <DismissForm onSubmit={handleDismiss} submitting={submitting} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// ── Link to existing order ─────────────────────────────────────────────────
const LinkToOrderDialog = ({
  item,
  onClose,
  onResolved,
}: {
  item: UnreconciledPayment | null;
  onClose: () => void;
  onResolved: () => void;
}) => {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<BookingLite[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!item) {
      setSearch("");
      setResults([]);
      setSelectedBookingId(null);
      setNote("");
      return;
    }
    // Pre-fill search with email if available
    if (item.customer_email) setSearch(item.customer_email);
  }, [item]);

  const runSearch = useCallback(async (term: string) => {
    if (!term || term.length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const { data, error } = await supabase
      .from("bookings")
      .select("id, booking_code, client_name, client_email, total, scheduled_date, payment_status")
      .or(`booking_code.ilike.%${term}%,client_email.ilike.%${term}%,client_name.ilike.%${term}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    setSearching(false);
    if (!error) setResults((data as any) || []);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(search), 300);
    return () => clearTimeout(t);
  }, [search, runSearch]);

  const handleResolve = async () => {
    if (!item || !selectedBookingId) return;
    setSubmitting(true);
    const { error } = await (supabase as any).rpc("admin_resolve_unreconciled_payment", {
      p_unreconciled_id: item.id,
      p_booking_id: selectedBookingId,
      p_note: note || null,
    });
    setSubmitting(false);
    if (error) {
      toast.error(`Failed to link: ${error.message}`);
    } else {
      toast.success("Payment linked to order");
      onResolved();
    }
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link Payment to Order</DialogTitle>
          <DialogDescription>
            {item && (
              <>Search by booking code, email, or name to find the order this payment of ${Number(item.amount).toFixed(2)} belongs to.</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="CDT-000123, email, or name…"
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto border rounded-md">
            {searching && results.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Searching…</div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {search ? "No matching orders" : "Type to search"}
              </div>
            ) : (
              <ul className="divide-y">
                {results.map((b) => (
                  <li key={b.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedBookingId(b.id)}
                      className={`w-full text-left p-3 text-sm hover:bg-muted transition-colors ${
                        selectedBookingId === b.id ? "bg-primary/10" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-foreground">{b.booking_code} — {b.client_name}</div>
                          <div className="text-xs text-muted-foreground truncate">
                            {b.client_email} · {b.scheduled_date} · ${Number(b.total).toFixed(2)}
                          </div>
                        </div>
                        <Badge variant={b.payment_status === "paid" ? "outline" : "secondary"} className="flex-shrink-0">
                          {b.payment_status}
                        </Badge>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <Label htmlFor="link-note" className="text-xs">Resolution note (optional)</Label>
            <Textarea
              id="link-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why this order matches this payment…"
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
          <Button onClick={handleResolve} disabled={!selectedBookingId || submitting}>
            {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}
            Link Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ── Dismiss form ───────────────────────────────────────────────────────────
const DismissForm = ({
  onSubmit,
  submitting,
}: {
  onSubmit: (note: string, status: "ignored" | "refunded") => void;
  submitting: boolean;
}) => {
  const [note, setNote] = useState("");
  return (
    <>
      <div>
        <Label htmlFor="dismiss-note" className="text-xs">Reason (optional)</Label>
        <Textarea
          id="dismiss-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Why this is being dismissed…"
          rows={3}
        />
      </div>
      <DialogFooter className="gap-2">
        <Button
          variant="outline"
          onClick={() => onSubmit(note, "refunded")}
          disabled={submitting}
        >
          Mark as Refunded
        </Button>
        <Button
          variant="secondary"
          onClick={() => onSubmit(note, "ignored")}
          disabled={submitting}
        >
          Mark as Ignored
        </Button>
      </DialogFooter>
    </>
  );
};
