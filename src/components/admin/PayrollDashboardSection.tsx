import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CheckCircle, Clock, Loader2, AlertCircle, RefreshCw, FileSpreadsheet, CalendarDays, TrendingUp, Calendar, Calculator, PenLine } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { RevealField } from "@/components/ui/reveal-field";
import { PerPswEarningsSection } from "./PerPswEarningsSection";
import { PSWPerformanceTable } from "./PSWPerformanceTable";
import { syncCompletedBookingsToPayroll } from "@/lib/payrollSync";
import { PayrollReviewDialog } from "./PayrollReviewDialog";

interface PayrollEntry {
  id: string;
  shift_id: string;
  psw_id: string;
  psw_name: string;
  task_name: string;
  scheduled_date: string;
  hours_worked: number;
  hourly_rate: number;
  surcharge_applied: number | null;
  total_owed: number;
  status: string;
  cleared_at: string | null;
  created_at: string;
  completed_at: string | null;
  earned_date: string | null;
  // Apr 2026 payroll correction fields
  booked_hours: number | null;
  clocked_hours: number | null;
  variance_hours: number | null;
  payable_hours_override: number | null;
  requires_admin_review: boolean;
  payroll_review_note: string | null;
  reviewed_by_admin: string | null;
  reviewed_at: string | null;
  banking?: {
    institution_number: string | null;
    transit_number: string | null;
    account_number: string | null;
  } | null;
  adjustment?: {
    original_clock_in: string | null;
    original_clock_out: string | null;
    adjusted_clock_in: string;
    adjusted_clock_out: string;
    adjustment_reason: string;
  } | null;
  booking_clock_in?: string | null;
  booking_clock_out?: string | null;
}


export const PayrollDashboardSection = () => {
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [clearingEntry, setClearingEntry] = useState<string | null>(null);
  const [reviewEntry, setReviewEntry] = useState<PayrollEntry | null>(null);

  // Fetch payroll data from Supabase with banking info
  const fetchData = async () => {
    setLoading(true);
    
    const { data: payrollData, error: payrollError } = await supabase
      .from("payroll_entries")
      .select("*")
      .order("scheduled_date", { ascending: false });

    if (payrollError) {
      console.error("Error fetching payroll:", payrollError);
      toast.error("Failed to load payroll data");
      setLoading(false);
      return;
    }

    // Fetch banking info
    const { data: bankingData } = await supabase
      .from("psw_banking")
      .select("psw_id, institution_number, transit_number, account_number");

    const bankingMap = new Map<string, PayrollEntry["banking"]>();
    bankingData?.forEach((b: any) => {
      bankingMap.set(b.psw_id, {
        institution_number: b.institution_number,
        transit_number: b.transit_number,
        account_number: b.account_number,
      });
    });

    // Fetch adjustment data for all payroll shift_ids
    const shiftIds = (payrollData || []).map((e: any) => e.shift_id);
    const { data: adjustmentData } = await supabase
      .from("shift_time_adjustments")
      .select("booking_id, original_clock_in, original_clock_out, adjusted_clock_in, adjusted_clock_out, adjustment_reason, adjusted_at")
      .in("booking_id", shiftIds.length > 0 ? shiftIds : ["00000000-0000-0000-0000-000000000000"])
      .order("adjusted_at", { ascending: false });

    // Map: booking_id -> most recent adjustment
    const adjustmentMap = new Map<string, PayrollEntry["adjustment"]>();
    adjustmentData?.forEach((a: any) => {
      if (!adjustmentMap.has(a.booking_id)) {
        adjustmentMap.set(a.booking_id, {
          original_clock_in: a.original_clock_in,
          original_clock_out: a.original_clock_out,
          adjusted_clock_in: a.adjusted_clock_in,
          adjusted_clock_out: a.adjusted_clock_out,
          adjustment_reason: a.adjustment_reason,
        });
      }
    });

    // Fetch booking clock times for display
    const { data: bookingTimes } = await supabase
      .from("bookings")
      .select("id, checked_in_at, signed_out_at")
      .in("id", shiftIds.length > 0 ? shiftIds : ["00000000-0000-0000-0000-000000000000"]);

    const bookingTimeMap = new Map<string, { in: string | null; out: string | null }>();
    bookingTimes?.forEach((bt: any) => {
      bookingTimeMap.set(bt.id, { in: bt.checked_in_at, out: bt.signed_out_at });
    });

    const entriesWithExtras = (payrollData || []).map((entry: any) => ({
      ...entry,
      banking: bankingMap.get(entry.psw_id) || null,
      adjustment: adjustmentMap.get(entry.shift_id) || null,
      booking_clock_in: bookingTimeMap.get(entry.shift_id)?.in || null,
      booking_clock_out: bookingTimeMap.get(entry.shift_id)?.out || null,
    }));

    setPayrollEntries(entriesWithExtras);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const syncCompletedShifts = async (): Promise<{ success: boolean; count: number; error?: string }> => {
    setSyncing(true);
    console.log("[PayrollDashboard] Starting sync completed shifts...");

    try {
      const result = await syncCompletedBookingsToPayroll();
      console.log("[PayrollDashboard] Sync result:", result);

      if (!result.success) {
        const errMsg = result.error || "Failed to sync completed bookings";
        console.error("[PayrollDashboard] Sync failed:", errMsg);
        toast.error(`Sync failed: ${errMsg}`);
        return { success: false, count: 0, error: errMsg };
      }

      await fetchData();

      if (result.count > 0) {
        toast.success(`Added ${result.count} payroll entries from completed bookings`);
      } else {
        toast.info("All completed bookings are already in payroll");
      }

      return result;
    } catch (error: any) {
      console.error("[PayrollDashboard] Error syncing shifts:", error);
      toast.error(`Failed to sync shifts: ${error.message || "Unknown error"}`);
      return { success: false, count: 0, error: error.message };
    } finally {
      setSyncing(false);
    }
  };

  // Recalculate all payroll entries from effective times
  const recalculateAllPayroll = async () => {
    setSyncing(true);
    try {
      // sync_completed_bookings_to_payroll calls upsert_payroll_entry_for_booking 
      // which now uses effective (adjusted) times
      const { data, error } = await (supabase as any).rpc("sync_completed_bookings_to_payroll");
      if (error) throw error;
      await fetchData();
      toast.success(`Recalculated payroll for ${data} completed bookings using effective times`);
    } catch (err: any) {
      console.error("Recalculate payroll error:", err);
      toast.error("Failed to recalculate payroll");
    } finally {
      setSyncing(false);
    }
  };

  // Mark entry as cleared/paid
  const handleClearEntry = async (entryId: string) => {
    setClearingEntry(entryId);
    
    const { error } = await supabase
      .from("payroll_entries")
      .update({ 
        status: "cleared", 
        cleared_at: new Date().toISOString() 
      })
      .eq("id", entryId);

    if (error) {
      console.error("Error clearing entry:", error);
      toast.error("Failed to mark as paid");
    } else {
      toast.success("Payment marked as cleared");
      await fetchData();
    }
    
    setClearingEntry(null);
  };

  // Clear multiple entries
  const handleClearSelected = async () => {
    if (selectedEntries.size === 0) return;

    const { error } = await supabase
      .from("payroll_entries")
      .update({ 
        status: "cleared", 
        cleared_at: new Date().toISOString() 
      })
      .in("id", Array.from(selectedEntries));

    if (error) {
      console.error("Error clearing entries:", error);
      toast.error("Failed to mark as paid");
    } else {
      toast.success(`${selectedEntries.size} payments marked as cleared`);
      setSelectedEntries(new Set());
      await fetchData();
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedEntries);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedEntries(newSelection);
  };

  const pendingEntries = useMemo(() => 
    payrollEntries.filter(e => e.status === "pending"),
    [payrollEntries]
  );

  const clearedEntries = useMemo(() => 
    payrollEntries.filter(e => e.status === "cleared"),
    [payrollEntries]
  );

  const todayPayouts = useMemo(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const entries = payrollEntries.filter(e => e.scheduled_date === today);
    return {
      total: entries.reduce((sum, e) => sum + e.total_owed, 0),
      hours: entries.reduce((sum, e) => sum + e.hours_worked, 0),
      count: entries.length
    };
  }, [payrollEntries]);

  const weeklyPayouts = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const entries = payrollEntries.filter(e => new Date(e.scheduled_date) >= weekAgo);
    return {
      total: entries.reduce((sum, e) => sum + e.total_owed, 0),
      hours: entries.reduce((sum, e) => sum + e.hours_worked, 0),
      count: entries.length
    };
  }, [payrollEntries]);

  const monthlyPayouts = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const entries = payrollEntries.filter(e => new Date(e.scheduled_date) >= monthStart);
    return {
      total: entries.reduce((sum, e) => sum + e.total_owed, 0),
      hours: entries.reduce((sum, e) => sum + e.hours_worked, 0),
      count: entries.length
    };
  }, [payrollEntries]);

  const yearlyPayouts = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const entries = payrollEntries.filter(e => new Date(e.scheduled_date) >= yearStart);
    return {
      total: entries.reduce((sum, e) => sum + e.total_owed, 0),
      hours: entries.reduce((sum, e) => sum + e.hours_worked, 0),
      count: entries.length
    };
  }, [payrollEntries]);

  const pendingTotal = useMemo(() => 
    pendingEntries.reduce((sum, e) => sum + e.total_owed, 0),
    [pendingEntries]
  );

  const clearedTotal = useMemo(() => 
    clearedEntries.reduce((sum, e) => sum + e.total_owed, 0),
    [clearedEntries]
  );

  const exportToCSV = () => {
    const headers = ["PSW Name", "Task", "Date", "Hours", "Hourly Rate", "Surcharge", "Total Owed", "Status", "Cleared At"];
    const rows = payrollEntries.map(e => [
      e.psw_name,
      e.task_name,
      e.scheduled_date,
      e.hours_worked.toFixed(2),
      `$${e.hourly_rate.toFixed(2)}`,
      e.surcharge_applied ? `$${e.surcharge_applied.toFixed(2)}` : "—",
      `$${e.total_owed.toFixed(2)}`,
      e.status,
      e.cleared_at ? format(new Date(e.cleared_at), "yyyy-MM-dd HH:mm") : "—",
    ]);

    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payroll_export_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Payroll exported to CSV");
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Time-Period Payouts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-rose-100">
                <CalendarDays className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Today</p>
                <p className="text-xl font-bold text-rose-700">${todayPayouts.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{todayPayouts.count} entries · {todayPayouts.hours.toFixed(1)} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-emerald-100">
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Week</p>
                <p className="text-xl font-bold text-emerald-700">${weeklyPayouts.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{weeklyPayouts.count} entries · {weeklyPayouts.hours.toFixed(1)} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-blue-100">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Month</p>
                <p className="text-xl font-bold text-blue-700">${monthlyPayouts.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{monthlyPayouts.count} entries · {monthlyPayouts.hours.toFixed(1)} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-purple-100">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">This Year ({new Date().getFullYear()})</p>
                <p className="text-xl font-bold text-purple-700">${yearlyPayouts.total.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{yearlyPayouts.count} entries · {yearlyPayouts.hours.toFixed(1)} hrs</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* PSW Performance Summary Table */}
      <PSWPerformanceTable payrollEntries={payrollEntries} />

      {/* Per-PSW Earnings Summary */}
      <PerPswEarningsSection payrollEntries={payrollEntries} />

      {/* Status Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-amber-100">
                <Clock className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Payments</p>
                <p className="text-2xl font-bold">{pendingEntries.length}</p>
                <p className="text-sm font-medium text-amber-600">${pendingTotal.toFixed(2)} owed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cleared Payments</p>
                <p className="text-2xl font-bold">{clearedEntries.length}</p>
                <p className="text-sm font-medium text-green-600">${clearedTotal.toFixed(2)} paid</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-100">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Processed</p>
                <p className="text-2xl font-bold">{payrollEntries.length}</p>
                <p className="text-sm font-medium text-blue-600">${(pendingTotal + clearedTotal).toFixed(2)} all time</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Review Counter */}
      {payrollEntries.some(e => e.requires_admin_review) && (
        <Card className="border-amber-300 bg-amber-50/60">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              <div>
                <p className="font-medium text-amber-900">
                  {payrollEntries.filter(e => e.requires_admin_review).length} shift{payrollEntries.filter(e => e.requires_admin_review).length === 1 ? "" : "s"} need review
                </p>
                <p className="text-xs text-amber-700">Variance detected between booked and clocked time. Pay has not changed automatically.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportToCSV}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          Export CSV
        </Button>
        {selectedEntries.size > 0 && (
          <Button variant="default" onClick={handleClearSelected}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Clear Selected ({selectedEntries.size})
          </Button>
        )}
      </div>

      {/* Payroll Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Payroll Entries
          </CardTitle>
          <CardDescription>
            Manage PSW payments from completed shifts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending">
                Pending ({pendingEntries.length})
              </TabsTrigger>
              <TabsTrigger value="cleared">
                Cleared ({clearedEntries.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({payrollEntries.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              <PayrollTable 
                entries={pendingEntries}
                showClear={true}
                selectedEntries={selectedEntries}
                toggleSelection={toggleSelection}
                onClear={handleClearEntry}
                clearingEntry={clearingEntry}
                onReview={setReviewEntry}
                onRefresh={fetchData}
              />
            </TabsContent>

            <TabsContent value="cleared">
              <PayrollTable 
                entries={clearedEntries}
                showClear={false}
                selectedEntries={selectedEntries}
                toggleSelection={toggleSelection}
                onClear={handleClearEntry}
                clearingEntry={clearingEntry}
                onReview={setReviewEntry}
                onRefresh={fetchData}
              />
            </TabsContent>

            <TabsContent value="all">
              <PayrollTable 
                entries={payrollEntries}
                showClear={true}
                selectedEntries={selectedEntries}
                toggleSelection={toggleSelection}
                onClear={handleClearEntry}
                clearingEntry={clearingEntry}
                onReview={setReviewEntry}
                onRefresh={fetchData}
              />
            </TabsContent>
          </Tabs>
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

interface PayrollTableProps {
  entries: PayrollEntry[];
  showClear: boolean;
  selectedEntries: Set<string>;
  toggleSelection: (id: string) => void;
  onClear: (id: string) => void;
  clearingEntry: string | null;
  onReview: (entry: PayrollEntry) => void;
  onRefresh: () => void;
}

const PayrollTable = ({ 
  entries, 
  showClear, 
  selectedEntries, 
  toggleSelection, 
  onClear, 
  clearingEntry,
  onReview,
  onRefresh,
}: PayrollTableProps) => {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No payroll entries found</p>
        <p className="text-sm">Click "Sync Completed Shifts" to generate entries from completed bookings</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showClear && <TableHead className="w-12"></TableHead>}
          <TableHead>PSW Name</TableHead>
          <TableHead>Order ID</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Booked</TableHead>
          <TableHead className="text-right">Clocked (Ref)</TableHead>
          <TableHead className="text-right">Variance</TableHead>
          <TableHead className="text-right">Final Hours</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => {
          const flagged = entry.requires_admin_review;
          const hasOverride = entry.payable_hours_override != null;
          return (
            <TableRow key={entry.id} className={flagged ? "bg-amber-50/50 dark:bg-amber-950/10" : ""}>
              {showClear && (
                <TableCell>
                  {entry.status === "pending" && (
                    <input
                      type="checkbox"
                      checked={selectedEntries.has(entry.id)}
                      onChange={() => toggleSelection(entry.id)}
                      className="w-4 h-4 rounded border-gray-300"
                    />
                  )}
                </TableCell>
              )}
              <TableCell className="font-medium">
                <div className="flex items-center gap-1 flex-wrap">
                  {entry.psw_name}
                  {flagged && (
                    <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] px-1.5 py-0 h-5">
                      ⚠ Needs Review
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-mono text-xs text-muted-foreground">{entry.shift_id.slice(0, 8)}</span>
              </TableCell>
              <TableCell>{format(new Date(entry.scheduled_date), "MMM d, yyyy")}</TableCell>
              <TableCell className="text-right">
                {entry.booked_hours != null ? entry.booked_hours.toFixed(2) : "—"}
              </TableCell>
              <TableCell className="text-right text-muted-foreground">
                {entry.clocked_hours != null ? entry.clocked_hours.toFixed(2) : "—"}
              </TableCell>
              <TableCell className={`text-right ${entry.variance_hours != null && Math.abs(entry.variance_hours) > 0.05 ? "text-amber-700 font-medium" : "text-muted-foreground"}`}>
                {entry.variance_hours != null ? `${entry.variance_hours > 0 ? "+" : ""}${entry.variance_hours.toFixed(2)}` : "—"}
              </TableCell>
              <TableCell className="text-right font-semibold">
                {entry.hours_worked.toFixed(2)}
                {hasOverride && (
                  <Badge variant="outline" className="ml-1 text-blue-700 border-blue-300 text-[10px] px-1">OVR</Badge>
                )}
              </TableCell>
              <TableCell className="text-right">${entry.hourly_rate.toFixed(2)}/hr</TableCell>
              <TableCell className="text-right font-medium">${entry.total_owed.toFixed(2)}</TableCell>
              <TableCell>
                <Badge variant={entry.status === "cleared" ? "default" : "secondary"}>
                  {entry.status === "cleared" ? "Paid" : entry.status === "payout_ready" ? "Ready" : "Pending"}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {flagged && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-xs"
                        onClick={async () => {
                          const { error } = await (supabase as any).rpc("admin_approve_booked_hours", {
                            p_entry_id: entry.id, p_note: null,
                          });
                          if (error) { toast.error(error.message); return; }
                          toast.success("Booked hours approved");
                          onRefresh();
                        }}
                        title="Keep booked hours as final pay"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => onReview(entry)}
                        title="Set override hours"
                      >
                        <PenLine className="w-3 h-3 mr-1" />
                        Override
                      </Button>
                    </>
                  )}
                  {!flagged && (
                    <Button size="sm" variant="ghost" onClick={() => onReview(entry)} title="Review payable hours">
                      <PenLine className="w-4 h-4" />
                    </Button>
                  )}
                  {showClear && entry.status === "pending" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onClear(entry.id)}
                      disabled={clearingEntry === entry.id}
                    >
                      {clearingEntry === entry.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  {entry.status === "cleared" && entry.cleared_at && (
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.cleared_at), "MMM d")}
                    </span>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};

// Export sync function for use in testing panel — server-side and idempotent
export const syncCompletedShiftsToPayroll = syncCompletedBookingsToPayroll;
