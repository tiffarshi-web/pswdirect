import { useState, useEffect } from "react";
import { Clock, MapPin, User, ChevronRight, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  getPSWShifts, 
  type ShiftRecord 
} from "@/lib/shiftStore";
import { useAuth } from "@/contexts/AuthContext";

interface ScheduleTabProps {
  onSelectShift?: (shift: ShiftRecord) => void;
}

export const ScheduleTab = ({ onSelectShift }: ScheduleTabProps) => {
  const { user } = useAuth();
  const [claimedShifts, setClaimedShifts] = useState<ShiftRecord[]>([]);

  // Load claimed shifts for this PSW
  useEffect(() => {
    loadShifts();
    // Refresh every 5 seconds
    const interval = setInterval(loadShifts, 5000);
    return () => clearInterval(interval);
  }, [user]);

  const loadShifts = () => {
    const pswId = user?.id || "psw-001";
    const shifts = getPSWShifts(pswId);
    // Only show claimed (not yet checked in) and checked-in shifts
    setClaimedShifts(shifts.filter(s => s.status === "claimed" || s.status === "checked-in"));
  };

  const getStatusBadge = (status: ShiftRecord["status"]) => {
    switch (status) {
      case "claimed":
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <CheckCircle className="w-3 h-3 mr-1" />
            Claimed
          </Badge>
        );
      case "checked-in":
        return (
          <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-1" />
            In Progress
          </Badge>
        );
      default:
        return null;
    }
  };

  if (claimedShifts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">My Schedule</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Your claimed and active shifts
          </p>
        </div>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Scheduled Shifts</h3>
          <p className="text-muted-foreground mb-4">Claim an available shift to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">My Schedule</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {claimedShifts.length} shift{claimedShifts.length !== 1 ? "s" : ""} scheduled
        </p>
      </div>

      <div className="space-y-3">
        {claimedShifts.map((shift) => (
          <Card 
            key={shift.id} 
            className="shadow-card hover:shadow-card-hover transition-shadow cursor-pointer"
            onClick={() => onSelectShift?.(shift)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    {/* Full name visible after claiming */}
                    <h3 className="font-medium text-foreground">{shift.clientName}</h3>
                    <p className="text-sm text-muted-foreground">{shift.scheduledDate}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {getStatusBadge(shift.status)}
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{shift.scheduledStart} - {shift.scheduledEnd}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  {/* Full address visible after claiming */}
                  <span>{shift.patientAddress}</span>
                </div>
              </div>

              {/* Services */}
              <div className="flex flex-wrap gap-2 mt-3">
                {shift.services.map((service, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>

              {shift.status === "claimed" && (
                <Button variant="brand" className="w-full mt-4">
                  Start Shift
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
