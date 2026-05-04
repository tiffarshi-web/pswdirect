// Incomplete Payments / Abandoned Checkout
// ─────────────────────────────────────────────────────────────────────────
// Shows draft bookings (status='awaiting_payment') where the client started
// payment but never completed it. These are the rows that the original
// "$70 PI created but no succeeded" case was producing — they were invisible
// to admins because they were never marked failed.
//
// Admins can:
//   • See client name, email, phone, amount, service date
//   • Open the related Stripe PaymentIntent
//   • Mark the attempt as "abandoned" (no charge) so it stops cluttering the queue
//
// This view is read-mostly: it does NOT mutate the booking flow.

import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCw, Mail, Phone, Calendar, DollarSign, Loader2, ExternalLink, XCircle, Send, CheckCircle2 } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";

interface IncompleteRow {
  id: string;
  booking_code: string;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  total: number | null;
  scheduled_date: string | null;
  start_time: string | null;
  service_type: string[] | null;
  payment_status: string | null;
  stripe_payment_intent_id: string | null;
  recovered_from_payment_intent: boolean | null;
  recovery_source: string | null;
  payment_link_sent_at: string | null;
  payment_link_sent_by: string | null;
  stripe_checkout_session_id: string | null;
  stripe_checkout_url: string | null;
  created_at: string;
  updated_at: string | null;
}

const LINK_ELIGIBLE_STATUSES = new Set([
  "awaiting_payment",
  "payment_failed",
  "payment_expired",
]);
const COOLDOWN_MS = 2 * 60 * 1000;

const INCOMPLETE_PAYMENT_STATUSES = [
  "awaiting_payment",
  "payment_failed",
  "payment_cancelled",
  "payment_expired",
];

export const IncompletePaymentsSection = () => {
  const [rows, setRows] = useState<IncompleteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_code, client_name, client_email, client_phone, total, scheduled_date, start_time, service_type, payment_status, stripe_payment_intent_id, recovered_from_payment_intent, recovery_source, payment_link_sent_at, payment_link_sent_by, stripe_checkout_session_id, stripe_checkout_url, created_at, updated_at"
      )
      .eq("status", "awaiting_payment")
      .in("payment_status", INCOMPLETE_PAYMENT_STATUSES)
      .lt("created_at", fiveMinAgo)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      console.error("Failed to load incomplete payments:", error);
      toast.error("Failed to load incomplete payments");
      setRows([]);
    } else {
      setRows((data as any) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCount = useMemo(() => rows.length, [rows]);

  const handleAbandon = async (row: IncompleteRow) => {
    setBusyId(row.id);
    const { error } = await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        payment_status: "abandoned",
        admin_notes: `Marked abandoned (no payment received) at ${new Date().toISOString()}`,
        updated_at: new Date().toISOString(),
      } as any)
      .eq("id", row.id)
      .eq("status", "awaiting_payment"); // safety: never touch a paid booking
    setBusyId(null);
    if (error) {
      toast.error(`Failed: ${error.message}`);
    } else {
      toast.success(`${row.booking_code} marked abandoned`);
      load();
    }
  };

  const stripeUrl = (piId: string) =>
    `https://dashboard.stripe.com/${piId.startsWith("pi_test_") ? "test/" : ""}payments/${piId}`;

  const statusBadge = (s: string | null) => {
    if (s === "payment_failed") return <Badge variant="destructive">Card Failed</Badge>;
    if (s === "payment_cancelled") return <Badge variant="outline">Cancelled</Badge>;
    if (s === "payment_expired") return <Badge variant="outline">Expired</Badge>;
    return <Badge className="bg-amber-500 text-white">Awaiting Payment</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Incomplete Payments / Abandoned Checkout
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Bookings where the client started payment but never completed it. Contact the client, send a payment link, or mark the attempt abandoned.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {openCount} open
          </Badge>
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
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No incomplete payment attempts. ✅
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <Card key={r.id} className="border-amber-300/50">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-sm flex items-center gap-2 flex-wrap">
                      <DollarSign className="w-4 h-4 text-primary" />
                      ${Number(r.total ?? 0).toFixed(2)} CAD
                      <span className="font-mono text-xs text-muted-foreground">{r.booking_code}</span>
                      {statusBadge(r.payment_status)}
                      {r.recovered_from_payment_intent && (
                        <Badge variant="destructive" title={r.recovery_source || "Auto-created from Stripe webhook"}>
                          Recovered (no original booking found)
                        </Badge>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-1.5 text-xs space-y-0.5">
                      <div className="font-medium text-foreground">
                        {r.client_name || "—"}
                      </div>
                      {r.client_email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3" />
                          <a href={`mailto:${r.client_email}`} className="hover:underline">{r.client_email}</a>
                        </div>
                      )}
                      {r.client_phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3 h-3" />
                          <a href={`tel:${r.client_phone}`} className="hover:underline">{r.client_phone}</a>
                        </div>
                      )}
                      {r.scheduled_date && (
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          {r.scheduled_date}{r.start_time ? ` @ ${r.start_time}` : ""}
                        </div>
                      )}
                      <div className="text-muted-foreground">
                        Started {formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}
                        {" · "}
                        {format(new Date(r.created_at), "MMM d, h:mm a")}
                      </div>
                      {r.service_type && r.service_type.length > 0 && (
                        <div className="text-muted-foreground">
                          Service: {r.service_type.join(", ")}
                        </div>
                      )}
                      {r.stripe_payment_intent_id && (
                        <div className="flex items-center gap-1.5">
                          <code className="font-mono text-[11px]">{r.stripe_payment_intent_id}</code>
                          <a
                            href={stripeUrl(r.stripe_payment_intent_id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-primary hover:underline inline-flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    {r.client_email && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={`mailto:${r.client_email}?subject=Complete your PSW Direct booking ${r.booking_code}`}>
                          <Mail className="w-3.5 h-3.5 mr-1.5" />
                          Email Client
                        </a>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleAbandon(r)}
                      disabled={busyId === r.id}
                    >
                      {busyId === r.id ? (
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 mr-1.5" />
                      )}
                      Mark Abandoned
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
