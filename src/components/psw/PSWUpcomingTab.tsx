import { useState, useEffect } from "react";
import { Clock, MapPin, User, ChevronRight, AlertTriangle, X, Calendar, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { getPSWShifts, updateShift, type ShiftRecord } from "@/lib/shiftStore";
import { useAuth } from "@/contexts/AuthContext";

interface PSWUpcomingTabProps {
  onSelectShift?: (shift: ShiftRecord) => void;
}

export const PSWUpcomingTab = ({ onSelectShift }: PSWUpcomingTabProps) => {
  const { user } = useAuth();
  const [upcomingShifts, setUpcomingShifts] = useState<ShiftRecord[]>([]);
  const [shiftToCancel, setShiftToCancel] = useState<ShiftRecord | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  // Load upcoming shifts for this PSW
  useEffect(() => {
    loadShifts();
    // Refresh every 30 seconds
    const interval = setInterval(loadShifts, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const loadShifts = () => {
    const pswId = user?.id || "psw-1";
    const shifts = getPSWShifts(pswId);
    // Only show claimed (not yet checked in) shifts
    const upcoming = shifts.filter(s => s.status === "claimed");
    // Sort by date
    upcoming.sort((a, b) => 
      new Date(`${a.scheduledDate} ${a.scheduledStart}`).getTime() - 
      new Date(`${b.scheduledDate} ${b.scheduledStart}`).getTime()
    );
    setUpcomingShifts(upcoming);
  };

  // Check if cancellation is within 24 hours (late cancellation)
  const isLateCancellation = (shift: ShiftRecord): boolean => {
    const shiftStart = new Date(`${shift.scheduledDate} ${shift.scheduledStart}`);
    const now = new Date();
    const hoursUntilShift = (shiftStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntilShift < 24;
  };

  const handleCancelClick = (shift: ShiftRecord) => {
    setShiftToCancel(shift);
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = () => {
    if (!shiftToCancel) return;

    const isLate = isLateCancellation(shiftToCancel);
    
    // Update shift back to available
    const updated = updateShift(shiftToCancel.id, {
      pswId: "",
      pswName: "",
      claimedAt: undefined,
      agreementAccepted: false,
      status: "available",
    });

    if (updated) {
      if (isLate) {
        toast.warning("Shift cancelled - Late cancellation recorded", {
          description: "This cancellation has been noted. Repeated late cancellations may affect your standing.",
        });
        console.log("⚠️ LATE CANCELLATION:", {
          shiftId: shiftToCancel.id,
          pswId: user?.id,
          pswName: user?.name,
          hoursBeforeShift: "< 24 hours",
          timestamp: new Date().toISOString(),
        });
      } else {
        toast.success("Shift cancelled successfully", {
          description: "The shift is now available for other PSWs.",
        });
      }
      loadShifts();
    } else {
      toast.error("Failed to cancel shift. Please try again.");
    }

    setShowCancelDialog(false);
    setShiftToCancel(null);
  };

  const launchNavigation = (address: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, "_blank");
  };

  if (upcomingShifts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">My Schedule</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your upcoming claimed shifts
          </p>
        </div>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Upcoming Shifts</h3>
          <p className="text-muted-foreground mb-4">
            Claim available shifts to add them to your schedule
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">My Schedule</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {upcomingShifts.length} upcoming shift{upcomingShifts.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Upcoming Shifts List */}
      <div className="space-y-3">
        {upcomingShifts.map((shift) => {
          const isLate = isLateCancellation(shift);
          
          return (
            <Card 
              key={shift.id} 
              className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
              onClick={() => onSelectShift?.(shift)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{shift.clientName}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{shift.scheduledDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                      Claimed
                    </Badge>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{shift.scheduledStart} - {shift.scheduledEnd}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span className="flex-1">{shift.patientAddress}</span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="h-6 px-2"
                      onClick={(e) => launchNavigation(shift.patientAddress, e)}
                    >
                      <Navigation className="w-3 h-3" />
                    </Button>
                  </div>
                </div>

                {/* Services */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {shift.services.map((service, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t border-border">
                  <Button 
                    variant="brand"
                    className="flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectShift?.(shift);
                    }}
                  >
                    Start Shift
                  </Button>
                  <Button 
                    variant="outline"
                    className="border-destructive/30 text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelClick(shift);
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {isLate && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Late cancellation (within 24h)</span>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Cancel Shift?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Are you sure you want to cancel your shift with{" "}
                <strong>{shiftToCancel?.clientFirstName}</strong> on{" "}
                <strong>{shiftToCancel?.scheduledDate}</strong>?
              </p>
              
              {shiftToCancel && isLateCancellation(shiftToCancel) && (
                <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                  <p className="text-sm font-medium text-destructive">
                    ⚠️ Late Cancellation Warning
                  </p>
                  <p className="text-sm text-destructive/90 mt-1">
                    This shift starts in less than 24 hours. Late cancellations are recorded and may affect your standing.
                  </p>
                </div>
              )}

              <div className="p-3 bg-muted rounded-lg text-sm">
                <p className="font-medium text-foreground mb-1">Cancellation Policy:</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• 1st missed/late cancel: Written warning</li>
                  <li>• 2nd missed/late cancel: 1 week suspension</li>
                  <li>• 3rd missed/late cancel: Contract termination</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Shift</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmCancel}
            >
              Yes, Cancel Shift
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};