import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";

interface AuditEntry {
  id: string;
  action: string;
  actor_email: string | null;
  booking_id: string | null;
  booking_code: string | null;
  psw_id: string | null;
  amount: number | null;
  hours: number | null;
  reason: string | null;
  details: Record<string, any>;
  created_at: string;
}

const actionLabel = (a: string) => {
  switch (a) {
    case "payout_created": return { label: "Manual payout recorded", cls: "bg-emerald-500/15 text-emerald-700" };
    case "payout_voided": return { label: "Payout voided", cls: "bg-amber-500/15 text-amber-700" };
    case "booking_cancelled": return { label: "Order cancelled", cls: "bg-red-500/15 text-red-700" };
    default: return { label: a, cls: "bg-muted text-foreground" };
  }
};

const fmtMoney = (n: number | null) =>
  n == null ? "—" : `$${Number(n).toFixed(2)}`;

export const AdminAuditLogSection = () => {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_audit_log" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    setEntries((data as any) || []);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return entries.filter(e => {
      if (filter !== "all" && e.action !== filter) return false;
      if (!needle) return true;
      return (
        (e.actor_email || "").toLowerCase().includes(needle) ||
        (e.booking_code || "").toLowerCase().includes(needle) ||
        (e.psw_id || "").toLowerCase().includes(needle) ||
        (e.reason || "").toLowerCase().includes(needle)
      );
    });
  }, [entries, q, filter]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="w-4 h-4" /> Admin Audit Log
        </CardTitle>
        <CardDescription>
          Immutable record of manual payouts, payout voids, and order cancellations — including who performed the action.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search admin, booking, PSW, reason…"
              className="pl-8"
            />
          </div>
          <div className="flex gap-1">
            {[
              { v: "all", l: "All" },
              { v: "payout_created", l: "Payouts" },
              { v: "payout_voided", l: "Voids" },
              { v: "booking_cancelled", l: "Cancellations" },
            ].map(t => (
              <Button
                key={t.v}
                size="sm"
                variant={filter === t.v ? "default" : "outline"}
                onClick={() => setFilter(t.v)}
              >
                {t.l}
              </Button>
            ))}
          </div>
          <Button size="sm" variant="ghost" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <ScrollArea className="h-[60vh] rounded border">
          <div className="divide-y">
            {filtered.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground text-center">
                {loading ? "Loading…" : "No audit entries found."}
              </div>
            )}
            {filtered.map(e => {
              const a = actionLabel(e.action);
              return (
                <div key={e.id} className="p-3 text-sm space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={a.cls}>{a.label}</Badge>
                    {e.booking_code && (
                      <span className="font-mono text-xs">{e.booking_code}</span>
                    )}
                    {e.psw_id && (
                      <span className="text-xs text-muted-foreground">PSW: {e.psw_id}</span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(e.created_at).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                    <span><span className="text-muted-foreground">By:</span> {e.actor_email || "—"}</span>
                    {e.amount != null && (
                      <span><span className="text-muted-foreground">Amount:</span> {fmtMoney(e.amount)}</span>
                    )}
                    {e.hours != null && (
                      <span><span className="text-muted-foreground">Hours:</span> {Number(e.hours).toFixed(2)}</span>
                    )}
                    {e.reason && (
                      <span><span className="text-muted-foreground">Reason:</span> {e.reason}</span>
                    )}
                  </div>
                  {e.details && Object.keys(e.details).length > 0 && (
                    <details className="text-xs text-muted-foreground">
                      <summary className="cursor-pointer">Details</summary>
                      <pre className="mt-1 whitespace-pre-wrap break-all bg-muted/40 p-2 rounded">
                        {JSON.stringify(e.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
