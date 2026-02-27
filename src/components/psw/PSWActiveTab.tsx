import { useState, useEffect } from "react";
import { Clock, MapPin, User, ChevronRight, Phone, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActiveShiftsAsync, type ShiftRecord } from "@/lib/shiftStore";
import { useAuth } from "@/contexts/AuthContext";

interface PSWActiveTabProps {
  onSelectShift: (shift: ShiftRecord) => void;
}

export const PSWActiveTab = ({ onSelectShift }: PSWActiveTabProps) => {
  const { user } = useAuth();
  const [activeShifts, setActiveShifts] = useState<ShiftRecord[]>([]);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user?.id) {
      loadShifts();
    }
    const interval = setInterval(loadShifts, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  useEffect(() => {
    const timer = setInterval(() => {
      const newElapsed: Record<string, number> = {};
      activeShifts.forEach(shift => {
        if (shift.checkedInAt) {
          const checkInTime = new Date(shift.checkedInAt).getTime();
          newElapsed[shift.id] = Math.floor((Date.now() - checkInTime) / 1000);
        }
      });
      setElapsedTimes(newElapsed);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeShifts]);

  const loadShifts = async () => {
    const pswId = user?.id || "";
    if (!pswId) return;
    const shifts = await getActiveShiftsAsync(pswId);
    setActiveShifts(shifts);
  };

  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (activeShifts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Active Shift</h2>
          <p className="text-sm text-muted-foreground mt-1">Your current in-progress shift</p>
        </div>
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Play className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Active Shift</h3>
          <p className="text-muted-foreground">You'll see your shift here once you check in</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Active Shift</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {activeShifts.length} shift{activeShifts.length !== 1 ? "s" : ""} in progress
        </p>
      </div>
      <div className="space-y-3">
        {activeShifts.map((shift) => {
          const elapsed = elapsedTimes[shift.id] || 0;
          return (
            <Card key={shift.id} className="shadow-card ring-2 ring-primary border-primary">
              <CardContent className="p-4">
                <div className="bg-primary/10 rounded-lg p-3 mb-4 text-center">
                  <p className="text-xs text-primary mb-1">Shift In Progress</p>
                  <p className="text-2xl font-mono font-bold text-primary">{formatTime(elapsed)}</p>
                </div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                    <div>
                      <h3 className="font-medium text-foreground">{shift.clientName}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="w-3 h-3" /><span>{shift.scheduledStart} - {shift.scheduledEnd}</span></div>
                    </div>
                  </div>
                  <Badge className="bg-primary text-primary-foreground animate-pulse">In Progress</Badge>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="w-4 h-4" /><span>{shift.patientAddress}</span></div>
                  {shift.clientPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${shift.clientPhone}`} className="text-primary hover:underline">{shift.clientPhone}</a>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {shift.services.map((service, i) => <Badge key={i} variant="outline" className="text-xs">{service}</Badge>)}
                </div>
                <Button variant="brand" className="w-full" onClick={() => onSelectShift(shift)}>
                  Continue Shift<ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
