import { useEffect, useRef, useState } from "react";
import { Clock, MapPin, User, ChevronRight, LogIn } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getPSWShiftsAsync, type ShiftRecord } from "@/lib/shiftStore";
import { useAuth } from "@/contexts/AuthContext";

interface ReadyToStartCardProps {
  onSelectShift: (shift: ShiftRecord) => void;
}

const todayISO = () => {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
};

/**
 * Prominent "start today's shift" card shown on the PSW home tab so caregivers
 * never have to drill into My Schedule to find the check-in button.
 * Shows claimed (not yet checked-in) shifts scheduled for today or earlier.
 */
export const ReadyToStartCard = ({ onSelectShift }: ReadyToStartCardProps) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const load = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const all = await getPSWShiftsAsync(user.id);
        const today = todayISO();
        const ready = all.filter(
          (s) => s.status === "claimed" && !s.checkedInAt && s.scheduledDate <= today
        );
        ready.sort((a, b) =>
          `${a.scheduledDate}${a.scheduledStart}`.localeCompare(`${b.scheduledDate}${b.scheduledStart}`)
        );
        if (!cancelled) setShifts(ready);
      } catch (e) {
        console.warn("[ReadyToStartCard] load failed:", e);
      } finally {
        fetchingRef.current = false;
      }
    };

    load();
    const interval = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id]);

  if (shifts.length === 0) return null;

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Ready to Start</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Tap to check in and start your shift
        </p>
      </div>
      {shifts.map((shift) => (
        <Card key={shift.id} className="shadow-card ring-2 ring-accent border-accent">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                  <User className="w-5 h-5 text-accent-foreground" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">{shift.clientName}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    <span>
                      {shift.scheduledDate === todayISO() ? "Today" : shift.scheduledDate} ·{" "}
                      {shift.scheduledStart} - {shift.scheduledEnd}
                    </span>
                  </div>
                </div>
              </div>
              <Badge variant="secondary">Not started</Badge>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
              <MapPin className="w-4 h-4 shrink-0" />
              <span>{shift.patientAddress}</span>
            </div>
            {shift.services?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4">
                {shift.services.map((service, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {service}
                  </Badge>
                ))}
              </div>
            )}
            <Button variant="brand" className="w-full" onClick={() => onSelectShift(shift)}>
              <LogIn className="w-4 h-4 mr-2" />
              Check In & Start Shift
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
