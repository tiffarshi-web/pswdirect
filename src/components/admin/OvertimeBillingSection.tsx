import { useState, useEffect } from "react";
import { Clock, AlertTriangle, User, Calendar, DollarSign, CheckCircle2, CreditCard } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOvertimeShifts, type ShiftRecord } from "@/lib/shiftStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface OvertimePayrollEntry {
  id: string;
  shift_id: string;
  psw_name: string;
  task_name: string;
  scheduled_date: string;
  hours_worked: number;
  total_owed: number;
  surcharge_applied: number;
  status: string;
}

// Calculate billable overtime based on rules:
// 0-14 min: No charge
// 15-30 min: Charge 30 min
// 31-60 min: Charge 1 hour
const calculateBillableMinutes = (overtimeMinutes: number): number => {
  if (overtimeMinutes <= 14) return 0;
  if (overtimeMinutes <= 30) return 30;
  if (overtimeMinutes <= 60) return 60;
  return Math.ceil(overtimeMinutes / 60) * 60;
};

const calculateOvertimeCharge = (overtimeMinutes: number, hourlyRate: number = 30): number => {
  const billableMinutes = calculateBillableMinutes(overtimeMinutes);
  return (billableMinutes / 60) * hourlyRate;
};

export const OvertimeBillingSection = () => {
  const [overtimeShifts, setOvertimeShifts] = useState<ShiftRecord[]>([]);
  const [overtimePayroll, setOvertimePayroll] = useState<OvertimePayrollEntry[]>([]);
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      // Load overtime shifts from localStorage
      const shifts = getOvertimeShifts();
      setOvertimeShifts(shifts);

      // Load overtime-adjusted payroll entries from Supabase
      const { data, error } = await supabase
        .from("payroll_entries")
        .select("*")
        .eq("status", "overtime_adjusted")
        .order("scheduled_date", { ascending: false });

      if (!error && data) {
        setOvertimePayroll(data as OvertimePayrollEntry[]);
      }
      setLoading(false);
    };

    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkBilled = (shiftId: string) => {
    setProcessedIds(prev => new Set([...prev, shiftId]));
    toast.success("Shift marked as billed for overtime");
  };

  const pendingShifts = overtimeShifts.filter(s => !processedIds.has(s.id));

  // Stats
  const totalOvertimeCharges = overtimePayroll.reduce((sum, p) => sum + (p.surcharge_applied || 0), 0);
  const totalAdjustedShifts = overtimePayroll.length;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overtime Adjusted Shifts</p>
                <p className="text-2xl font-bold">{totalAdjustedShifts}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total PSW Overtime Pay</p>
                <p className="text-2xl font-bold text-green-600">${totalOvertimeCharges.toFixed(2)}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-amber-600">{pendingShifts.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Overtime Billing Queue */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Overtime Billing Queue
          </CardTitle>
          <CardDescription>
            Shifts that exceeded the 14-minute grace period. Clients are automatically charged based on overtime duration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading...</p>
            </div>
          ) : pendingShifts.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6 text-green-500" />
              </div>
              <p className="text-muted-foreground">All overtime shifts have been processed</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingShifts.map((shift) => {
                const billableMinutes = calculateBillableMinutes(shift.overtimeMinutes);
                const estimatedCharge = calculateOvertimeCharge(shift.overtimeMinutes);
                const isGracePeriod = shift.overtimeMinutes <= 14;

                return (
                  <div
                    key={shift.id}
                    className={`p-4 border rounded-lg space-y-3 ${
                      isGracePeriod 
                        ? "border-green-200 bg-green-50" 
                        : "border-amber-200 bg-amber-50"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-mono font-bold text-foreground">{shift.id}</p>
                        <p className="text-sm text-muted-foreground">{shift.clientName}</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge className="bg-amber-500 text-white">
                          +{shift.overtimeMinutes} min
                        </Badge>
                        {isGracePeriod ? (
                          <Badge variant="secondary" className="bg-green-500 text-white">
                            Grace Period
                          </Badge>
                        ) : (
                          <Badge className="bg-primary text-primary-foreground">
                            Overtime Adjusted
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {shift.scheduledDate}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        Scheduled End: {shift.scheduledEnd}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <CreditCard className="w-3 h-3" />
                        Billable: {billableMinutes} min
                      </div>
                      <div className="flex items-center gap-1 text-foreground font-medium">
                        <DollarSign className="w-3 h-3" />
                        ${estimatedCharge.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-muted">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span>{shift.pswName}</span>
                      </div>
                      <Button
                        size="sm"
                        variant={isGracePeriod ? "secondary" : "default"}
                        onClick={() => handleMarkBilled(shift.id)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                        {isGracePeriod ? "Acknowledge" : "Confirm Billed"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Processed Overtime Adjustments */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Processed Overtime Adjustments
          </CardTitle>
          <CardDescription>
            Payroll entries that include overtime pay for extended care.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {overtimePayroll.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No overtime adjustments yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-3">Shift ID</th>
                    <th className="text-left py-2 px-3">PSW</th>
                    <th className="text-left py-2 px-3">Date</th>
                    <th className="text-right py-2 px-3">Hours</th>
                    <th className="text-right py-2 px-3">OT Pay</th>
                    <th className="text-right py-2 px-3">Total</th>
                    <th className="text-center py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {overtimePayroll.map((entry) => (
                    <tr key={entry.id} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-mono text-xs">{entry.shift_id}</td>
                      <td className="py-2 px-3">{entry.psw_name}</td>
                      <td className="py-2 px-3">{entry.scheduled_date}</td>
                      <td className="py-2 px-3 text-right">{entry.hours_worked.toFixed(2)}</td>
                      <td className="py-2 px-3 text-right text-green-600">
                        +${(entry.surcharge_applied || 0).toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-right font-medium">
                        ${entry.total_owed.toFixed(2)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800">
                          Overtime Adjusted
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};