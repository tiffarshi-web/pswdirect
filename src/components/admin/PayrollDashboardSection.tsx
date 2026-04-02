import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CheckCircle, Clock, Loader2, AlertCircle, RefreshCw, FileSpreadsheet, CalendarDays, TrendingUp, Calendar } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { RevealField } from "@/components/ui/reveal-field";
import { PerPswEarningsSection } from "./PerPswEarningsSection";
import { PSWPerformanceTable } from "./PSWPerformanceTable";
import { syncCompletedBookingsToPayroll } from "@/lib/payrollSync";

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

    const entriesWithBanking = (payrollData || []).map((entry: any) => ({
      ...entry,
      banking: bankingMap.get(entry.psw_id) || null,
    }));

    setPayrollEntries(entriesWithBanking);
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

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={syncCompletedShifts} disabled={syncing}>
          {syncing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Sync Completed Shifts
        </Button>
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
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

// Separate component for the table
interface PayrollTableProps {
  entries: PayrollEntry[];
  showClear: boolean;
  selectedEntries: Set<string>;
  toggleSelection: (id: string) => void;
  onClear: (id: string) => void;
  clearingEntry: string | null;
}

const PayrollTable = ({ 
  entries, 
  showClear, 
  selectedEntries, 
  toggleSelection, 
  onClear, 
  clearingEntry 
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
          <TableHead>Banking</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead className="text-right">Total</TableHead>
          <TableHead>Status</TableHead>
          {showClear && <TableHead></TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
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
            <TableCell className="font-medium">{entry.psw_name}</TableCell>
            <TableCell>
              {entry.banking?.account_number ? (
                <div className="text-xs font-mono space-y-0.5">
                  <div className="text-muted-foreground">
                    {entry.banking.institution_number}-{entry.banking.transit_number}
                  </div>
                  <div>•••• {entry.banking.account_number.slice(-4)}</div>
                </div>
              ) : (
                <span className="text-xs text-amber-600">No banking</span>
              )}
            </TableCell>
            <TableCell className="max-w-[150px] truncate">{entry.task_name}</TableCell>
            <TableCell>{format(new Date(entry.scheduled_date), "MMM d, yyyy")}</TableCell>
            <TableCell className="text-right">{entry.hours_worked.toFixed(2)}</TableCell>
            <TableCell className="text-right">${entry.hourly_rate.toFixed(2)}/hr</TableCell>
            <TableCell className="text-right font-medium">${entry.total_owed.toFixed(2)}</TableCell>
            <TableCell>
              <Badge variant={entry.status === "cleared" ? "default" : "secondary"}>
                {entry.status === "cleared" ? "Paid" : "Pending"}
              </Badge>
            </TableCell>
            {showClear && (
              <TableCell>
                {entry.status === "pending" && (
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
              </TableCell>
            )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

// Export sync function for use in testing panel — server-side and idempotent
export const syncCompletedShiftsToPayroll = syncCompletedBookingsToPayroll;
