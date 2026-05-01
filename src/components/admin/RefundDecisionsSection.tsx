// Refund Decisions Queue — surfaces all cancelled+paid bookings whose
// refund decision is still `pending_review`, plus a history of resolved
// decisions. Admins must classify each as refunded / retained_per_policy.

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, CheckCircle2, RefreshCw, Loader2, DollarSign, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

type Decision = "refunded" | "retained_per_policy" | "pending_review";

interface Row {
  id: string;
  booking_code: string;
  client_name: string;
  client_email: string;
  total: number;
  scheduled_date: string;
  cancelled_at: string | null;
  cancelled_by: string | null;
  cancellation_reason: string | null;
  cancellation_note: string | null;
  cancellation_refund_decision: Decision | null;
  cancellation_refund_decision_note: string | null;
  cancellation_refund_decision_by: string | null;
  cancellation_refund_decision_at: string | null;
  was_refunded: boolean | null;
  payment_status: string | null;
}

const decisionMeta: Record<Decision, { label: string; icon: any; className: string }> = {
  refunded: { label: "Refunded", icon: DollarSign, className: "bg-emerald-100 text-emerald-800 border-emerald-300" },
  retained_per_policy: { label: "Retained", icon: ShieldCheck, className: "bg-slate-100 text-slate-800 border-slate-300" },
  pending_review: { label: "Pending Review", icon: AlertCircle, className: "bg-amber-100 text-amber-900 border-amber-300" },
};

export const RefundDecisionsSection = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const [decision, setDecision] = useState<Decision | "">("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("bookings")
      .select(
        "id, booking_code, client_name, client_email, total, scheduled_date, cancelled_at, cancelled_by, cancellation_reason, cancellation_note, cancellation_refund_decision, cancellation_refund_decision_note, cancellation_refund_decision_by, cancellation_refund_decision_at, was_refunded, payment_status"
      )
      .eq("status", "cancelled")
      .eq("payment_status", "paid")
      .order("cancelled_at", { ascending: false })
      .limit(500);

    if (error) {
      toast.error(`Failed to load: ${error.message}`);
    } else {
      setRows((data || []) as Row[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const pending = rows.filter((r) => (r.cancellation_refund_decision || "pending_review") === "pending_review");
  const resolved = rows.filter((r) => (r.cancellation_refund_decision || "pending_review") !== "pending_review");

  const openResolve = (r: Row) => {
    setSelected(r);
    setDecision("");
    setNote(r.cancellation_refund_decision_note || "");
  };

  const handleSave = async () => {
    if (!selected || !decision) return;
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_set_cancellation_refund_decision", {
        p_booking_id: selected.id,
        p_decision: decision,
        p_note: note || null,
      });
      if (error) throw error;

      // If admin chose refunded, also kick off Stripe refund via existing function.
      if (decision === "refunded") {
        try {
          await supabase.functions.invoke("process-refund", {
            body: {
              bookingCode: selected.booking_code,
              reason: `Admin refund decision: ${selected.cancellation_reason || "cancelled"}`,
              processedBy: "admin",
              isDryRun: false,
            },
          });
        } catch (e) {
          console.error("Stripe refund call failed (decision recorded):", e);
          toast.warning("Decision saved, but Stripe refund call failed — process manually.");
        }
      }

      toast.success("Refund decision recorded");
      setSelected(null);
      setDecision("");
      setNote("");
      load();
    } catch (e: any) {
      toast.error(`Failed to save: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const renderRow = (r: Row) => {
    const d = (r.cancellation_refund_decision || "pending_review") as Decision;
    const meta = decisionMeta[d];
    const Icon = meta.icon;
    return (
      <Card key={r.id} className="border-l-4" style={{ borderLeftColor: d === "pending_review" ? "hsl(45, 90%, 55%)" : "hsl(var(--border))" }}>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{r.booking_code}</span>
                <Badge variant="outline" className={meta.className}>
                  <Icon className="w-3 h-3 mr-1" />
                  {meta.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {r.client_name} · {r.client_email}
              </p>
              <p className="text-xs text-muted-foreground">
                Scheduled {r.scheduled_date} · Cancelled{" "}
                {r.cancelled_at ? format(new Date(r.cancelled_at), "MMM d, yyyy h:mm a") : "—"}
                {r.cancelled_by ? ` by ${r.cancelled_by}` : ""}
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-foreground">${(r.total || 0).toFixed(2)}</p>
              <Button size="sm" variant={d === "pending_review" ? "default" : "outline"} onClick={() => openResolve(r)}>
                {d === "pending_review" ? "Resolve" : "Update"}
              </Button>
            </div>
          </div>
          {r.cancellation_reason && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Reason:</span> {r.cancellation_reason}
              {r.cancellation_note ? ` — ${r.cancellation_note}` : ""}
            </p>
          )}
          {r.cancellation_refund_decision_note && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Decision note:</span>{" "}
              {r.cancellation_refund_decision_note}
              {r.cancellation_refund_decision_by ? ` (${r.cancellation_refund_decision_by})` : ""}
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Refund Decisions
            </CardTitle>
            <CardDescription>
              Every cancelled, paid booking must have a financial decision: refunded, retained per policy, or pending review.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList>
              <TabsTrigger value="pending">
                Pending Review {pending.length > 0 && <Badge variant="secondary" className="ml-2">{pending.length}</Badge>}
              </TabsTrigger>
              <TabsTrigger value="resolved">
                Resolved <Badge variant="outline" className="ml-2">{resolved.length}</Badge>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="pending" className="mt-4 space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
              ) : pending.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> All cancelled paid bookings are resolved.
                </p>
              ) : (
                pending.map(renderRow)
              )}
            </TabsContent>
            <TabsContent value="resolved" className="mt-4 space-y-2">
              {loading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
              ) : resolved.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">No resolved decisions yet.</p>
              ) : (
                resolved.map(renderRow)
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Refund Decision</DialogTitle>
            <DialogDescription>
              {selected ? <>Booking <strong>{selected.booking_code}</strong> · ${selected.total.toFixed(2)}</> : null}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Decision *</Label>
              <div className="grid grid-cols-1 gap-2">
                {(["refunded", "retained_per_policy", "pending_review"] as Decision[]).map((d) => {
                  const meta = decisionMeta[d];
                  const Icon = meta.icon;
                  const active = decision === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDecision(d)}
                      className={`flex items-center gap-2 p-3 rounded-md border text-left text-sm transition-colors ${
                        active ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{meta.label}</span>
                      {d === "refunded" && (
                        <span className="text-xs text-muted-foreground ml-auto">Triggers Stripe refund</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Note / reason</Label>
              <Textarea
                placeholder="Why this decision? (visible to admins only)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!decision || saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
