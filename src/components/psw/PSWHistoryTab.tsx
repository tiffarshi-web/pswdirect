import { useState, useEffect, useMemo } from "react";
import { Clock, MapPin, User, DollarSign, FileText, Calendar, X, TrendingUp, CalendarDays, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getShifts, type ShiftRecord } from "@/lib/shiftStore";
import { useAuth } from "@/contexts/AuthContext";
import { getApplicableSurgeZone } from "@/lib/businessConfig";

// Hourly rate for earnings calculation (demo)
const BASE_PSW_RATE = 25;

export const PSWHistoryTab = () => {
  const { user } = useAuth();
  const [completedShifts, setCompletedShifts] = useState<ShiftRecord[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [showCareSheetDialog, setShowCareSheetDialog] = useState(false);

  // Load completed shifts for this PSW
  useEffect(() => {
    const allShifts = getShifts();
    const pswId = user?.id || "psw-001";
    const completed = allShifts.filter(
      s => s.pswId === pswId && s.status === "completed"
    );
    // Sort by date, most recent first
    completed.sort((a, b) => 
      new Date(b.signedOutAt || b.scheduledDate).getTime() - 
      new Date(a.signedOutAt || a.scheduledDate).getTime()
    );
    setCompletedShifts(completed);
  }, [user?.id]);

  // Calculate earnings for a shift (including urban bonus)
  const calculateEarnings = (shift: ShiftRecord): { 
    basePay: number; 
    urbanBonus: number; 
    total: number;
    hasUrbanBonus: boolean;
  } => {
    if (!shift.checkedInAt || !shift.signedOutAt) {
      return { basePay: 0, urbanBonus: 0, total: 0, hasUrbanBonus: false };
    }
    
    const checkIn = new Date(shift.checkedInAt);
    const signOut = new Date(shift.signedOutAt);
    const hoursWorked = (signOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    
    const basePay = hoursWorked * BASE_PSW_RATE;
    
    // Check for urban bonus
    const surgeZone = getApplicableSurgeZone(undefined, shift.postalCode);
    const hourlyBonus = surgeZone ? surgeZone.pswBonus * hoursWorked : 0;
    const flatBonus = surgeZone ? (surgeZone.pswFlatBonus || 0) : 0;
    
    return { 
      basePay: Math.round(basePay * 100) / 100, 
      urbanBonus: Math.round((hourlyBonus + flatBonus) * 100) / 100, 
      total: Math.round((basePay + hourlyBonus + flatBonus) * 100) / 100,
      hasUrbanBonus: !!surgeZone,
    };
  };

  // Calculate weekly earnings (last 7 days)
  const weeklyEarnings = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let weeklyBase = 0;
    let weeklyUrban = 0;
    let weeklyShifts = 0;
    
    completedShifts.forEach(shift => {
      const shiftDate = new Date(shift.signedOutAt || shift.scheduledDate);
      if (shiftDate >= weekAgo) {
        const earnings = calculateEarnings(shift);
        weeklyBase += earnings.basePay;
        weeklyUrban += earnings.urbanBonus;
        weeklyShifts++;
      }
    });
    
    return {
      base: Math.round(weeklyBase * 100) / 100,
      urban: Math.round(weeklyUrban * 100) / 100,
      total: Math.round((weeklyBase + weeklyUrban) * 100) / 100,
      shifts: weeklyShifts,
    };
  }, [completedShifts]);

  // Calculate monthly earnings (current month)
  const monthlyEarnings = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    let monthlyBase = 0;
    let monthlyUrban = 0;
    let monthlyShifts = 0;
    
    completedShifts.forEach(shift => {
      const shiftDate = new Date(shift.signedOutAt || shift.scheduledDate);
      if (shiftDate >= monthStart) {
        const earnings = calculateEarnings(shift);
        monthlyBase += earnings.basePay;
        monthlyUrban += earnings.urbanBonus;
        monthlyShifts++;
      }
    });
    
    return {
      base: Math.round(monthlyBase * 100) / 100,
      urban: Math.round(monthlyUrban * 100) / 100,
      total: Math.round((monthlyBase + monthlyUrban) * 100) / 100,
      shifts: monthlyShifts,
    };
  }, [completedShifts]);

  // Calculate yearly earnings (current year)
  const yearlyEarnings = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    
    let yearlyBase = 0;
    let yearlyUrban = 0;
    let yearlyShifts = 0;
    
    completedShifts.forEach(shift => {
      const shiftDate = new Date(shift.signedOutAt || shift.scheduledDate);
      if (shiftDate >= yearStart) {
        const earnings = calculateEarnings(shift);
        yearlyBase += earnings.basePay;
        yearlyUrban += earnings.urbanBonus;
        yearlyShifts++;
      }
    });
    
    return {
      base: Math.round(yearlyBase * 100) / 100,
      urban: Math.round(yearlyUrban * 100) / 100,
      total: Math.round((yearlyBase + yearlyUrban) * 100) / 100,
      shifts: yearlyShifts,
    };
  }, [completedShifts]);

  // Calculate total earnings
  const totalEarnings = useMemo(() => {
    let totalBase = 0;
    let totalUrban = 0;
    
    completedShifts.forEach(shift => {
      const earnings = calculateEarnings(shift);
      totalBase += earnings.basePay;
      totalUrban += earnings.urbanBonus;
    });
    
    return {
      base: Math.round(totalBase * 100) / 100,
      urban: Math.round(totalUrban * 100) / 100,
      total: Math.round((totalBase + totalUrban) * 100) / 100,
    };
  }, [completedShifts]);

  const handleViewCareSheet = (shift: ShiftRecord) => {
    setSelectedShift(shift);
    setShowCareSheetDialog(true);
  };

  if (completedShifts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">History</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your completed shifts and earnings
          </p>
        </div>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Completed Shifts Yet</h3>
          <p className="text-muted-foreground">
            Your completed shifts will appear here
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">History</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {completedShifts.length} shift{completedShifts.length !== 1 ? "s" : ""} completed
        </p>
      </div>

      {/* Earnings Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* This Week Earnings */}
        <Card className="shadow-card border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h3 className="font-medium text-emerald-800 dark:text-emerald-200 text-sm">This Week</h3>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              ${weeklyEarnings.total.toFixed(2)}
            </p>
            <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80">
              {weeklyEarnings.shifts} shift{weeklyEarnings.shifts !== 1 ? "s" : ""}
            </p>
            {weeklyEarnings.urban > 0 && (
              <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">
                +${weeklyEarnings.urban.toFixed(2)} Urban
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* This Month Earnings */}
        <Card className="shadow-card border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="w-4 h-4 text-blue-600" />
              <h3 className="font-medium text-blue-800 dark:text-blue-200 text-sm">This Month</h3>
            </div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">
              ${monthlyEarnings.total.toFixed(2)}
            </p>
            <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
              {monthlyEarnings.shifts} shift{monthlyEarnings.shifts !== 1 ? "s" : ""}
            </p>
            {monthlyEarnings.urban > 0 && (
              <Badge className="mt-2 bg-blue-100 text-blue-700 border-blue-200 text-xs">
                +${monthlyEarnings.urban.toFixed(2)} Urban
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* This Year Earnings */}
        <Card className="shadow-card border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-purple-600" />
              <h3 className="font-medium text-purple-800 dark:text-purple-200 text-sm">
                This Year ({new Date().getFullYear()})
              </h3>
            </div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">
              ${yearlyEarnings.total.toFixed(2)}
            </p>
            <p className="text-xs text-purple-600/80 dark:text-purple-400/80">
              {yearlyEarnings.shifts} shift{yearlyEarnings.shifts !== 1 ? "s" : ""}
            </p>
            {yearlyEarnings.urban > 0 && (
              <Badge className="mt-2 bg-purple-100 text-purple-700 border-purple-200 text-xs">
                +${yearlyEarnings.urban.toFixed(2)} Urban
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* All-Time Earnings */}
        <Card className="shadow-card border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <h3 className="font-medium text-foreground text-sm">All-Time</h3>
            </div>
            <p className="text-2xl font-bold text-foreground">
              ${totalEarnings.total.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {completedShifts.length} shift{completedShifts.length !== 1 ? "s" : ""}
            </p>
            {totalEarnings.urban > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                incl. ${totalEarnings.urban.toFixed(2)} urban
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completed Shifts List */}
      <div className="space-y-3">
        {completedShifts.map((shift) => {
          const earnings = calculateEarnings(shift);
          const completedDate = shift.signedOutAt 
            ? new Date(shift.signedOutAt).toLocaleDateString()
            : shift.scheduledDate;
          
          return (
            <Card key={shift.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{shift.clientFirstName}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{completedDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">${earnings.total.toFixed(2)}</p>
                    {earnings.hasUrbanBonus && (
                      <Badge variant="outline" className="text-xs mt-1 text-emerald-600">
                        +${earnings.urbanBonus.toFixed(2)} urban
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-xs mt-1 block">
                      Completed
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{shift.scheduledStart} - {shift.scheduledEnd}</span>
                    {shift.overtimeMinutes > 0 && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        +{shift.overtimeMinutes}min OT
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Services */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {shift.services.slice(0, 3).map((service, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                  {shift.services.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{shift.services.length - 3} more
                    </Badge>
                  )}
                </div>

                {/* View Care Sheet Button */}
                {shift.careSheet && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="w-full"
                    onClick={() => handleViewCareSheet(shift)}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    View Care Sheet
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Care Sheet Dialog */}
      <Dialog open={showCareSheetDialog} onOpenChange={setShowCareSheetDialog}>
        <DialogContent className="max-w-md max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Care Sheet Report
            </DialogTitle>
            <DialogClose className="absolute right-4 top-4">
              <X className="w-4 h-4" />
            </DialogClose>
          </DialogHeader>
          
          {selectedShift?.careSheet && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                {/* Shift Info */}
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-foreground">{selectedShift.clientFirstName}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedShift.scheduledDate} • {selectedShift.scheduledStart} - {selectedShift.scheduledEnd}
                  </p>
                </div>

                <Separator />

                {/* Mood Assessment */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Client Mood</h4>
                  <div className="flex gap-4">
                    <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">On Arrival</p>
                      <p className="font-medium text-foreground capitalize">{selectedShift.careSheet.moodOnArrival}</p>
                    </div>
                    <div className="flex-1 p-3 bg-muted/50 rounded-lg">
                      <p className="text-xs text-muted-foreground">On Departure</p>
                      <p className="font-medium text-foreground capitalize">{selectedShift.careSheet.moodOnDeparture}</p>
                    </div>
                  </div>
                </div>

                {/* Tasks Completed */}
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Tasks Completed</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedShift.careSheet.tasksCompleted.map((task, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {task}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Observations */}
                {selectedShift.careSheet.observations && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Observations</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                      {selectedShift.careSheet.observations}
                    </p>
                  </div>
                )}

                {/* Hospital Discharge Info */}
                {selectedShift.careSheet.isHospitalDischarge && (
                  <div className="p-3 border border-amber-200 bg-amber-50 dark:bg-amber-950/20 rounded-lg">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
                      Hospital Discharge
                    </p>
                    {selectedShift.careSheet.dischargeDocuments && (
                      <p className="text-xs text-amber-700 dark:text-amber-300">
                        ✓ Discharge documents uploaded
                      </p>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
