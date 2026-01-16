import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DollarSign, CheckCircle, Clock, Loader2, AlertCircle, RefreshCw, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getShifts, ShiftRecord } from "@/lib/shiftStore";
import { format } from "date-fns";

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
}

interface PricingSetting {
  id: string;
  task_name: string;
  psw_hourly_rate: number;
  surcharge_flat: number | null;
  is_active: boolean;
}

export const PayrollDashboardSection = () => {
  const [payrollEntries, setPayrollEntries] = useState<PayrollEntry[]>([]);
  const [pricingSettings, setPricingSettings] = useState<PricingSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [clearingEntry, setClearingEntry] = useState<string | null>(null);

  // Fetch data from Supabase
  const fetchData = async () => {
    setLoading(true);
    
    const [payrollRes, pricingRes] = await Promise.all([
      supabase.from("payroll_entries").select("*").order("scheduled_date", { ascending: false }),
      supabase.from("pricing_settings").select("*"),
    ]);

    if (payrollRes.error) {
      console.error("Error fetching payroll:", payrollRes.error);
      toast.error("Failed to load payroll data");
    } else {
      setPayrollEntries(payrollRes.data || []);
    }

    if (pricingRes.error) {
      console.error("Error fetching pricing:", pricingRes.error);
    } else {
      setPricingSettings(pricingRes.data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Find matching pricing for a task
  const findPricingForTask = (services: string[]): PricingSetting | null => {
    for (const service of services) {
      const match = pricingSettings.find(p => 
        p.is_active && 
        (p.task_name.toLowerCase().includes(service.toLowerCase()) ||
         service.toLowerCase().includes(p.task_name.toLowerCase()))
      );
      if (match) return match;
    }
    // Default to General Care
    return pricingSettings.find(p => p.task_name === "General Care" && p.is_active) || null;
  };

  // Calculate hours worked from shift times
  const calculateHoursWorked = (shift: ShiftRecord): number => {
    if (!shift.checkedInAt || !shift.signedOutAt) return 0;
    const checkIn = new Date(shift.checkedInAt);
    const signOut = new Date(shift.signedOutAt);
    const diffMs = signOut.getTime() - checkIn.getTime();
    return Math.max(0, diffMs / (1000 * 60 * 60));
  };

  // Sync completed shifts to payroll
  const syncCompletedShifts = async () => {
    setSyncing(true);
    
    try {
      const shifts = getShifts();
      const completedShifts = shifts.filter(s => s.status === "completed");
      const existingShiftIds = new Set(payrollEntries.map(p => p.shift_id));
      
      let newEntriesCount = 0;

      for (const shift of completedShifts) {
        if (existingShiftIds.has(shift.id)) continue;

        const pricing = findPricingForTask(shift.services);
        if (!pricing) {
          console.warn(`No pricing found for shift ${shift.id} with services:`, shift.services);
          continue;
        }

        const hoursWorked = calculateHoursWorked(shift);
        const basePay = hoursWorked * pricing.psw_hourly_rate;
        const surcharge = pricing.surcharge_flat || 0;
        const totalOwed = basePay + surcharge;

        const { error } = await supabase.from("payroll_entries").insert({
          shift_id: shift.id,
          psw_id: shift.pswId,
          psw_name: shift.pswName,
          task_name: shift.services.join(", ") || pricing.task_name,
          scheduled_date: shift.scheduledDate,
          hours_worked: Number(hoursWorked.toFixed(2)),
          hourly_rate: pricing.psw_hourly_rate,
          surcharge_applied: surcharge > 0 ? surcharge : null,
          total_owed: Number(totalOwed.toFixed(2)),
          status: "pending",
        });

        if (error) {
          console.error("Error inserting payroll entry:", error);
        } else {
          newEntriesCount++;
        }
      }

      if (newEntriesCount > 0) {
        toast.success(`Added ${newEntriesCount} new payroll entries`);
        await fetchData();
      } else {
        toast.info("All completed shifts are already in payroll");
      }
    } catch (error) {
      console.error("Error syncing shifts:", error);
      toast.error("Failed to sync shifts");
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

  // Toggle selection
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedEntries);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedEntries(newSelection);
  };

  // Filter entries
  const pendingEntries = useMemo(() => 
    payrollEntries.filter(e => e.status === "pending"),
    [payrollEntries]
  );

  const clearedEntries = useMemo(() => 
    payrollEntries.filter(e => e.status === "cleared"),
    [payrollEntries]
  );

  // Calculate totals
  const pendingTotal = useMemo(() => 
    pendingEntries.reduce((sum, e) => sum + e.total_owed, 0),
    [pendingEntries]
  );

  const clearedTotal = useMemo(() => 
    clearedEntries.reduce((sum, e) => sum + e.total_owed, 0),
    [clearedEntries]
  );

  // Export to CSV
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
      {/* Summary Cards */}
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
        <p className="text-sm">Completed shifts will appear here after syncing</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showClear && <TableHead className="w-12"></TableHead>}
          <TableHead>PSW Name</TableHead>
          <TableHead>Task</TableHead>
          <TableHead>Date</TableHead>
          <TableHead className="text-right">Hours</TableHead>
          <TableHead className="text-right">Rate</TableHead>
          <TableHead className="text-right">Surcharge</TableHead>
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
            <TableCell className="max-w-[200px] truncate">{entry.task_name}</TableCell>
            <TableCell>{format(new Date(entry.scheduled_date), "MMM d, yyyy")}</TableCell>
            <TableCell className="text-right">{entry.hours_worked.toFixed(2)}</TableCell>
            <TableCell className="text-right">${entry.hourly_rate.toFixed(2)}/hr</TableCell>
            <TableCell className="text-right">
              {entry.surcharge_applied ? `$${entry.surcharge_applied.toFixed(2)}` : "—"}
            </TableCell>
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
