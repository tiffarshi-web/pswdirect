import { useState, useEffect, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, parseISO } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Download, Clock, DollarSign, Users, Stethoscope, Building2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getShifts, type ShiftRecord } from "@/lib/shiftStore";
import { 
  generatePayrollFromShifts, 
  groupPayrollByDate, 
  downloadPayrollCSV,
  getStaffPayRates,
  type PayrollEntry,
  type DailyPayrollSummary 
} from "@/lib/payrollStore";
import { cn } from "@/lib/utils";
import { StaffPayScaleSection } from "./StaffPayScaleSection";

export const PayrollCalendarSection = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [selectedDay, setSelectedDay] = useState<DailyPayrollSummary | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const rates = getStaffPayRates();

  useEffect(() => {
    setShifts(getShifts());
  }, []);

  // Generate payroll data
  const payrollEntries = useMemo(() => {
    return generatePayrollFromShifts(shifts);
  }, [shifts]);

  const dailySummaries = useMemo(() => {
    return groupPayrollByDate(payrollEntries);
  }, [payrollEntries]);

  // Get days for current month
  const monthDays = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  // Get payroll data for a specific date
  const getPayrollForDate = (date: Date): DailyPayrollSummary | undefined => {
    const dateStr = format(date, "yyyy-MM-dd");
    return dailySummaries.find(s => s.date === dateStr);
  };

  const handleDayClick = (date: Date) => {
    const summary = getPayrollForDate(date);
    if (summary && summary.totalShifts > 0) {
      setSelectedDay(summary);
      setIsDialogOpen(true);
    }
  };

  const handleExport = () => {
    if (!exportStartDate || !exportEndDate) {
      toast.error("Please select a date range for export");
      return;
    }

    const filtered = payrollEntries.filter(entry => {
      const entryDate = entry.date;
      return entryDate >= exportStartDate && entryDate <= exportEndDate;
    });

    if (filtered.length === 0) {
      toast.error("No payroll data found for selected date range");
      return;
    }

    downloadPayrollCSV(filtered, { start: exportStartDate, end: exportEndDate });
    toast.success("Payroll CSV exported successfully!");
  };

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    const monthStart = format(startOfMonth(currentMonth), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(currentMonth), "yyyy-MM-dd");
    
    const monthEntries = payrollEntries.filter(e => e.date >= monthStart && e.date <= monthEnd);
    
    return {
      totalShifts: monthEntries.length,
      totalHours: monthEntries.reduce((sum, e) => sum + e.hoursWorked, 0),
      totalOwed: monthEntries.reduce((sum, e) => sum + e.totalPay, 0),
      uniquePSWs: new Set(monthEntries.map(e => e.pswId)).size,
    };
  }, [payrollEntries, currentMonth]);

  return (
    <div className="space-y-6">
      {/* Staff Pay Scale */}
      <StaffPayScaleSection />

      {/* Monthly Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Calendar className="w-4 h-4" />
              <span className="text-xs">Total Shifts</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{monthlyTotals.totalShifts}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs">Total Hours</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{monthlyTotals.totalHours.toFixed(1)}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs">Active PSWs</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{monthlyTotals.uniquePSWs}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs">Total Owed</span>
            </div>
            <p className="text-2xl font-bold text-primary">${monthlyTotals.totalOwed.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Payroll Calendar
              </CardTitle>
              <CardDescription>
                Click on a day to view shift details and payments
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-medium min-w-[140px] text-center">
                {format(currentMonth, "MMMM yyyy")}
              </span>
              <Button variant="outline" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for days before first of month */}
            {Array.from({ length: monthDays[0].getDay() }).map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square" />
            ))}

            {/* Day cells */}
            {monthDays.map(day => {
              const payroll = getPayrollForDate(day);
              const hasData = payroll && payroll.totalShifts > 0;
              
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => handleDayClick(day)}
                  disabled={!hasData}
                  className={cn(
                    "aspect-square p-1 rounded-lg border transition-colors flex flex-col items-center justify-start",
                    isToday(day) && "border-primary",
                    hasData 
                      ? "bg-primary/10 border-primary/30 hover:bg-primary/20 cursor-pointer" 
                      : "bg-muted/30 border-transparent cursor-default",
                    !isSameMonth(day, currentMonth) && "opacity-50"
                  )}
                >
                  <span className={cn(
                    "text-sm font-medium",
                    isToday(day) && "text-primary"
                  )}>
                    {format(day, "d")}
                  </span>
                  {hasData && (
                    <div className="mt-1 text-center">
                      <p className="text-xs font-medium text-primary">{payroll.totalShifts}</p>
                      <p className="text-[10px] text-muted-foreground">${payroll.totalOwed.toFixed(0)}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Export Section */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Export for Payroll
          </CardTitle>
          <CardDescription>
            Generate a CSV file with PSW name, total hours, shift types, and total pay
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row items-end gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="exportStart">Start Date</Label>
              <Input
                id="exportStart"
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label htmlFor="exportEnd">End Date</Label>
              <Input
                id="exportEnd"
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
              />
            </div>
            <Button variant="brand" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Day Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              {selectedDay && format(parseISO(selectedDay.date), "EEEE, MMMM d, yyyy")}
            </DialogTitle>
          </DialogHeader>
          
          {selectedDay && (
            <div className="space-y-4">
              {/* Day Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedDay.totalShifts}</p>
                  <p className="text-xs text-muted-foreground">Shifts</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold">{selectedDay.totalHours.toFixed(1)}h</p>
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                </div>
                <div className="text-center p-3 bg-primary/10 rounded-lg">
                  <p className="text-2xl font-bold text-primary">${selectedDay.totalOwed.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Owed</p>
                </div>
              </div>

              {/* PSW Details Table */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PSW Name</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Sign-Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Owed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedDay.entries.map((entry, idx) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{entry.pswName}</TableCell>
                      <TableCell>{entry.checkInTime}</TableCell>
                      <TableCell>{entry.signOutTime}</TableCell>
                      <TableCell>
                        {entry.hoursWorked.toFixed(1)}h
                        {entry.overtimeMinutes > 0 && (
                          <span className="text-xs text-amber-600 ml-1">
                            (+{entry.overtimeMinutes}m OT)
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {entry.isHospitalDoctorVisit ? (
                          <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                            <Stethoscope className="w-3 h-3" />
                            Hospital
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Building2 className="w-3 h-3" />
                            Home Care
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        ${entry.totalPay.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Rate Info */}
              <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
                <p>
                  <strong>Pay Rates Applied:</strong> Home Care @ ${rates.standardHomeCare}/hr, 
                  Hospital/Doctor @ ${rates.hospitalDoctorVisit}/hr. Overtime at 1.5x.
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
