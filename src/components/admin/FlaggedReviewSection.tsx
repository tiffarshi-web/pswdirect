// Flagged for Review — admin tab listing payroll_entries where requires_admin_review = true.
// Shows booked vs clocked hours, variance, and offers Approve Booked / Override actions inline.

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle, Loader2, PenLine, ShieldCheck } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PayrollReviewDialog } from "./PayrollReviewDialog";

interface FlaggedEntry {
  id: string;
  shift_id: string;
  psw_id: string;
  psw_name: string;
  task_name: string;
  scheduled_date: string;
  booked_hours: number | null;
  clocked_hours: number | null;
  variance_hours: number | null;
  payable_hours_override: number | null;
  hours_worked: number;
  hourly_rate: number;
  total_owed: number;
  requires_admin_review: boolean;
  payroll_review_note: string | null;
  billing_variance_hours: number | null;
  billing_adjustment_required: boolean;
  client_name?: string | null;
}

export const FlaggedReviewSection = () => {
  const [entries, setEntries] = useState<FlaggedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [reviewEntry, setReviewEntry] = useState<FlaggedEntry | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("payroll_entries")
      .select("*")
      .eq("requires_admin_review", true)
      .order("scheduled_date", { ascending: false });

    if (error) {
      console.error("[FlaggedReview] fetch error", error);
      toast.error("Failed to load flagged entries");
      setLoading(false);
      return;
    }

    // Enrich with client_name from bookings
    const shiftIds = (data || []).map((e: any) => e.shift_id).filter(Boolean);
    const bookingMap = new Map<string, string>();
    if (shiftIds.length > 0) {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, client_name")
        .in("id", shiftIds);
      bookings?.forEach((b: any) => bookingMap.set(b.id, b.client_name));
    }

    const enriched = (data || []).map((e: any) => ({
      ...e,
      client_name: bookingMap.get(e.shift_id) ?? null,
    }));
    setEntries(enriched);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleApproveBooked = async (entry: FlaggedEntry) => {
    setActionId(entry.id);
    const { error } = await (supabase as any).rpc("admin_approve_booked_hours", {
      p_entry_id: entry.id,
      p_note: null,
    });
    setActionId(null);
    if (error) { toast.error(error.message); return; }
    toast.success(`Approved booked hours for ${entry.psw_name}`);
    fetchData();
  };

  const totals = useMemo(() => ({
    count: entries.length,
    amount: entries.reduce((s, e) => s + Number(e.total_owed || 0), 0),
  }), [entries]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Flagged for Review
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Payroll entries where clocked time differs from booked time. Pay does not change automatically.
          </p>
        </div>
        <Badge variant="outline" className="text-amber-700 border-amber-300">
          {totals.count} need{totals.count === 1 ? "s" : ""} review
        </Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Pending Review</CardTitle>
          <CardDescription>
            Approve booked hours to keep pay unchanged, or override with a final value.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 flex justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <ShieldCheck className="w-10 h-10 mx-auto mb-2 text-emerald-500" />
              <p className="font-medium text-foreground">All clear — no entries flagged for review.</p>
              <p className="text-sm">Variances will appear here when clocked time differs from booked time.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PSW</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Booked</TableHead>
                    <TableHead className="text-right">Clocked (Ref)</TableHead>
                    <TableHead className="text-right">Variance</TableHead>
                    <TableHead className="text-right">Suggested (Ref)</TableHead>
                    <TableHead className="text-right">Final Hours</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((e) => {
                    const variance = e.variance_hours;
                    const suggested = e.clocked_hours;
                    const finalHrs = e.payable_hours_override ?? e.booked_hours ?? e.hours_worked;
                    return (
                      <TableRow key={e.id} className="bg-amber-50/40 dark:bg-amber-950/10">
                        <TableCell className="font-medium">{e.psw_name}</TableCell>
                        <TableCell>{e.client_name || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell>{format(new Date(e.scheduled_date), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-right">
                          {e.booked_hours != null ? e.booked_hours.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {e.clocked_hours != null ? e.clocked_hours.toFixed(2) : "—"}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${variance != null && Math.abs(variance) > 0.05 ? "text-amber-700" : ""}`}>
                          {variance != null ? `${variance > 0 ? "+" : ""}${variance.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {suggested != null ? `${suggested.toFixed(2)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {Number(finalHrs).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">${Number(e.total_owed).toFixed(2)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={actionId === e.id}
                              onClick={() => handleApproveBooked(e)}
                              title="Keep booked hours as final pay"
                            >
                              {actionId === e.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              )}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => setReviewEntry(e)}
                              title="Override final payable hours"
                            >
                              <PenLine className="w-3.5 h-3.5 mr-1" />
                              Override
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PayrollReviewDialog
        open={!!reviewEntry}
        onOpenChange={(o) => !o && setReviewEntry(null)}
        entry={reviewEntry}
        onSaved={fetchData}
      />
    </div>
  );
};
