import { useState, useEffect, useMemo } from "react";
import { Clock, MapPin, User, DollarSign, FileText, Calendar, X, TrendingUp, CalendarDays, BarChart3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getCompletedShiftsAsync, type ShiftRecord } from "@/lib/shiftStore";
import { useAuth } from "@/contexts/AuthContext";
import { getApplicableSurgeZone } from "@/lib/businessConfig";

const BASE_PSW_RATE = 25;

export const PSWHistoryTab = () => {
  const { user } = useAuth();
  const [completedShifts, setCompletedShifts] = useState<ShiftRecord[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [showCareSheetDialog, setShowCareSheetDialog] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    getCompletedShiftsAsync(user.id).then(setCompletedShifts);
  }, [user?.id]);

  const calculateEarnings = (shift: ShiftRecord) => {
    if (!shift.checkedInAt || !shift.signedOutAt) return { basePay: 0, urbanBonus: 0, total: 0, hasUrbanBonus: false };
    const hoursWorked = (new Date(shift.signedOutAt).getTime() - new Date(shift.checkedInAt).getTime()) / 3600000;
    const basePay = hoursWorked * BASE_PSW_RATE;
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

  const calcPeriodEarnings = (filterFn: (d: Date) => boolean) => {
    let base = 0, urban = 0, shifts = 0;
    completedShifts.forEach(shift => {
      const d = new Date(shift.signedOutAt || shift.scheduledDate);
      if (filterFn(d)) {
        const e = calculateEarnings(shift);
        base += e.basePay; urban += e.urbanBonus; shifts++;
      }
    });
    return { base: Math.round(base * 100) / 100, urban: Math.round(urban * 100) / 100, total: Math.round((base + urban) * 100) / 100, shifts };
  };

  const weeklyEarnings = useMemo(() => {
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    return calcPeriodEarnings(d => d >= weekAgo);
  }, [completedShifts]);

  const monthlyEarnings = useMemo(() => {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    return calcPeriodEarnings(d => d >= monthStart);
  }, [completedShifts]);

  const yearlyEarnings = useMemo(() => {
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    return calcPeriodEarnings(d => d >= yearStart);
  }, [completedShifts]);

  const totalEarnings = useMemo(() => calcPeriodEarnings(() => true), [completedShifts]);

  if (completedShifts.length === 0) {
    return (
      <div className="space-y-4">
        <div><h2 className="text-xl font-semibold text-foreground">History</h2><p className="text-sm text-muted-foreground mt-1">Your completed shifts and earnings</p></div>
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4"><Clock className="w-8 h-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Completed Shifts Yet</h3>
          <p className="text-muted-foreground">Your completed shifts will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-semibold text-foreground">History</h2><p className="text-sm text-muted-foreground mt-1">{completedShifts.length} shift{completedShifts.length !== 1 ? "s" : ""} completed</p></div>

      {/* Earnings Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Card className="shadow-card border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><TrendingUp className="w-4 h-4 text-emerald-600" /><h3 className="font-medium text-emerald-800 dark:text-emerald-200 text-sm">This Week</h3></div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">${weeklyEarnings.total.toFixed(2)}</p>
            <p className="text-xs text-emerald-600/80">{weeklyEarnings.shifts} shift{weeklyEarnings.shifts !== 1 ? "s" : ""}</p>
            {weeklyEarnings.urban > 0 && <Badge className="mt-2 bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">+${weeklyEarnings.urban.toFixed(2)} Urban</Badge>}
          </CardContent>
        </Card>
        <Card className="shadow-card border-blue-200 bg-blue-50/50 dark:bg-blue-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><CalendarDays className="w-4 h-4 text-blue-600" /><h3 className="font-medium text-blue-800 dark:text-blue-200 text-sm">This Month</h3></div>
            <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">${monthlyEarnings.total.toFixed(2)}</p>
            <p className="text-xs text-blue-600/80">{monthlyEarnings.shifts} shift{monthlyEarnings.shifts !== 1 ? "s" : ""}</p>
            {monthlyEarnings.urban > 0 && <Badge className="mt-2 bg-blue-100 text-blue-700 border-blue-200 text-xs">+${monthlyEarnings.urban.toFixed(2)} Urban</Badge>}
          </CardContent>
        </Card>
        <Card className="shadow-card border-purple-200 bg-purple-50/50 dark:bg-purple-950/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><BarChart3 className="w-4 h-4 text-purple-600" /><h3 className="font-medium text-purple-800 dark:text-purple-200 text-sm">This Year ({new Date().getFullYear()})</h3></div>
            <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">${yearlyEarnings.total.toFixed(2)}</p>
            <p className="text-xs text-purple-600/80">{yearlyEarnings.shifts} shift{yearlyEarnings.shifts !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
        <Card className="shadow-card border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2"><DollarSign className="w-4 h-4 text-primary" /><h3 className="font-medium text-foreground text-sm">All-Time</h3></div>
            <p className="text-2xl font-bold text-foreground">${totalEarnings.total.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">{completedShifts.length} shift{completedShifts.length !== 1 ? "s" : ""}</p>
          </CardContent>
        </Card>
      </div>

      {/* Completed Shifts List */}
      <div className="space-y-3">
        {completedShifts.map((shift) => {
          const earnings = calculateEarnings(shift);
          const completedDate = shift.signedOutAt ? new Date(shift.signedOutAt).toLocaleDateString() : shift.scheduledDate;
          return (
            <Card key={shift.id} className="shadow-card">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center"><User className="w-5 h-5 text-muted-foreground" /></div>
                    <div>
                      <h3 className="font-medium text-foreground">{shift.clientFirstName}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="w-3 h-3" /><span>{completedDate}</span></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">${earnings.total.toFixed(2)}</p>
                    {earnings.hasUrbanBonus && <Badge variant="outline" className="text-xs mt-1 text-emerald-600">+${earnings.urbanBonus.toFixed(2)} urban</Badge>}
                    <Badge variant="outline" className="text-xs mt-1 block">Completed</Badge>
                  </div>
                </div>
                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" /><span>{shift.scheduledStart} - {shift.scheduledEnd}</span>
                    {shift.overtimeMinutes > 0 && <Badge variant="secondary" className="text-xs ml-2">+{shift.overtimeMinutes}min OT</Badge>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mb-3">
                  {shift.services.slice(0, 3).map((service, i) => <Badge key={i} variant="outline" className="text-xs">{service}</Badge>)}
                  {shift.services.length > 3 && <Badge variant="outline" className="text-xs">+{shift.services.length - 3} more</Badge>}
                </div>
                {shift.careSheet && (
                  <Button variant="outline" size="sm" className="w-full" onClick={() => { setSelectedShift(shift); setShowCareSheetDialog(true); }}>
                    <FileText className="w-4 h-4 mr-2" />View Care Sheet
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
            <DialogTitle className="flex items-center gap-2"><FileText className="w-5 h-5 text-primary" />Care Sheet Report</DialogTitle>
          </DialogHeader>
          {selectedShift?.careSheet && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="font-medium text-foreground">{selectedShift.clientFirstName}</p>
                  <p className="text-sm text-muted-foreground">{selectedShift.scheduledDate} • {selectedShift.scheduledStart} - {selectedShift.scheduledEnd}</p>
                </div>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Client Mood</h4>
                  <div className="flex gap-4">
                    <div className="flex-1 p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">On Arrival</p><p className="font-medium text-foreground capitalize">{selectedShift.careSheet.moodOnArrival}</p></div>
                    <div className="flex-1 p-3 bg-muted/50 rounded-lg"><p className="text-xs text-muted-foreground">On Departure</p><p className="font-medium text-foreground capitalize">{selectedShift.careSheet.moodOnDeparture}</p></div>
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-2">Tasks Completed</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedShift.careSheet.tasksCompleted.map((task, i) => <Badge key={i} variant="secondary" className="text-xs">{task}</Badge>)}
                  </div>
                </div>
                {selectedShift.careSheet.observations && (
                  <div>
                    <h4 className="text-sm font-medium text-foreground mb-2">Observations</h4>
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">{selectedShift.careSheet.observations}</p>
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
