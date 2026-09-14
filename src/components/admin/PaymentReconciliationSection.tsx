// Admin → Payments → Reconciliation
// Read-only comparison of order total vs. locked pricing snapshot vs. receipt
// vs. Stripe references. Never mutates a financial record — flagged rows are
// for authorized office review only.

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, RefreshCw, AlertTriangle, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ReconciliationRow {
  booking_id: string;
  booking_code: string | null;
  client_name: string | null;
  service_type: string | null;
  scheduled_date: string | null;
  booking_total: number | null;
  snapshot_total: number | null;
  invoice_total: number | null;
  tax_amount: number | null;
  payment_intent_id: string | null;
  internal_payment_status: string | null;
  booking_status: string | null;
  receipt_status: string | null;
  refund_status: string | null;
  refunded_amount: number | null;
  webhook_event_count: number | null;
  reconciliation_result: string | null;
  mismatch_reason: string | null;
}

const REASON_LABELS: Record<string, string> = {
  booking_paid_without_stripe_reference: "Marked paid with no Stripe payment reference",
  missing_webhook_record: "No Stripe confirmation recorded for a paid order",
  booking_total_differs_from_pricing_snapshot: "Order total differs from the locked price record",
  receipt_total_differs_from_booking_total: "Receipt total differs from the order total",
  payment_intent_shared_by_multiple_orders: "One payment reference used by several orders",
  receipt_missing_for_paid_order: "Paid order has no receipt",
  refund_exceeds_captured_amount: "Refund is larger than the amount charged",
};

const money = (value: number | null | undefined) =>
  value == null ? "—" : `$${Number(value).toFixed(2)}`;

export const PaymentReconciliationSection = () => {
  const [rows, setRows] = useState<ReconciliationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [onlyMismatches, setOnlyMismatches] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("admin_payment_reconciliation", {
        p_days: 90,
        p_only_mismatches: onlyMismatches,
        p_limit: 500,
      });
      if (error) throw error;
      setRows((data as ReconciliationRow[]) || []);
    } catch (err) {
      console.error("Reconciliation load failed:", err);
      toast.error("Could not load the reconciliation report.");
    } finally {
      setLoading(false);
    }
  }, [onlyMismatches]);

  useEffect(() => {
    void load();
  }, [load]);

  const flagged = rows.filter((r) => r.reconciliation_result !== "ok");

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            Payment reconciliation
            {flagged.length > 0 && (
              <Badge variant="destructive">{flagged.length} need review</Badge>
            )}
          </CardTitle>
          <CardDescription>
            Last 90 days. Read-only — nothing here changes a financial record. Mismatches
            must be corrected through the authorized adjustment workflow.
          </CardDescription>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch id="only-mismatches" checked={onlyMismatches} onCheckedChange={setOnlyMismatches} />
            <Label htmlFor="only-mismatches" className="text-sm">Only mismatches</Label>
          </div>
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : rows.length === 0 ? (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            Everything reconciles for the selected period.
          </div>
        ) : (
          <ScrollArea className="h-[520px] pr-3">
            <div className="space-y-3">
              {rows.map((row) => {
                const needsReview = row.reconciliation_result !== "ok";
                return (
                  <div
                    key={row.booking_id}
                    className={`rounded-lg border p-3 text-sm ${needsReview ? "border-destructive/50 bg-destructive/5" : "bg-muted/30"}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">{row.booking_code || "—"}</span>
                      <span className="text-muted-foreground">{row.client_name || "—"}</span>
                      <Badge variant="outline">{row.internal_payment_status || "unknown"}</Badge>
                      {needsReview ? (
                        <Badge variant="destructive" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          {REASON_LABELS[row.mismatch_reason || ""] || row.mismatch_reason}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Reconciled</Badge>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-4">
                      <span>Service: {row.service_type || "—"}</span>
                      <span>Date: {row.scheduled_date || "—"}</span>
                      <span>Order total: {money(row.booking_total)}</span>
                      <span>Price record: {money(row.snapshot_total)}</span>
                      <span>Receipt total: {money(row.invoice_total)}</span>
                      <span>Tax: {money(row.tax_amount)}</span>
                      <span>Receipt: {row.receipt_status || "none"}</span>
                      <span>Refund: {row.refund_status || "none"} {row.refunded_amount ? money(row.refunded_amount) : ""}</span>
                      <span className="col-span-2 truncate">Stripe: {row.payment_intent_id || "—"}</span>
                      <span>Confirmations: {row.webhook_event_count ?? 0}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default PaymentReconciliationSection;
