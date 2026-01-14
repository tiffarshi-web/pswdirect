import { useState, useEffect, useMemo } from "react";
import { Clock, MapPin, User, ChevronRight, DollarSign, FileText, Calendar, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { getShifts, type ShiftRecord } from "@/lib/shiftStore";
import { useAuth } from "@/contexts/AuthContext";

// Hourly rate for earnings calculation (demo)
const HOURLY_RATE = 25;

export const PSWHistoryTab = () => {
  const { user } = useAuth();
  const [completedShifts, setCompletedShifts] = useState<ShiftRecord[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [showCareSheetDialog, setShowCareSheetDialog] = useState(false);

  // Load completed shifts for this PSW
  useEffect(() => {
    const allShifts = getShifts();
    const pswId = user?.id || "psw-1";
    const completed = allShifts.filter(
      s => s.pswId === pswId && s.status === "completed"
    );
    // Sort by date, most recent first
    completed.sort((a, b) => 
      new Date(b.signedOutAt || b.scheduledDate).getTime() - 
      new Date(a.signedOutAt || a.scheduledDate).getTime()
    );
    setCompletedShifts(completed);
  }, [user]);

  // Calculate earnings for a shift
  const calculateEarnings = (shift: ShiftRecord): number => {
    if (!shift.checkedInAt || !shift.signedOutAt) return 0;
    
    const checkIn = new Date(shift.checkedInAt);
    const signOut = new Date(shift.signedOutAt);
    const hoursWorked = (signOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    
    return Math.round(hoursWorked * HOURLY_RATE * 100) / 100;
  };

  // Calculate total earnings
  const totalEarnings = useMemo(() => {
    return completedShifts.reduce((sum, shift) => sum + calculateEarnings(shift), 0);
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

      {/* Earnings Summary */}
      <Card className="shadow-card border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-2xl font-bold text-foreground">${totalEarnings.toFixed(2)}</p>
              </div>
            </div>
            <Badge variant="secondary">
              {completedShifts.length} shifts
            </Badge>
          </div>
        </CardContent>
      </Card>

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
                    <p className="font-semibold text-primary">${earnings.toFixed(2)}</p>
                    <Badge variant="outline" className="text-xs mt-1">
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