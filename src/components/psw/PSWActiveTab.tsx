import { useState, useEffect, useRef } from "react";
import { Clock, MapPin, User, ChevronRight, Phone, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getActiveShiftsAsync, type ShiftRecord } from "@/lib/shiftStore";
import { useAuth } from "@/contexts/AuthContext";

interface PSWActiveTabProps {
  onSelectShift: (shift: ShiftRecord) => void;
}

/**
 * Groups multiple active bookings for the same client + date into a single
 * visual "session" so the PSW isn't overwhelmed by split orders.
 */
interface GroupedSession {
  key: string;
  clientName: string;
  clientPhone?: string;
  patientAddress: string;
  scheduledDate: string;
  earliestStart: string;
  latestEnd: string;
  allServices: string[];
  shifts: ShiftRecord[];
  /** The first checked-in shift — used for the timer */
  primaryShift: ShiftRecord;
}

const groupShiftsIntoSessions = (shifts: ShiftRecord[]): GroupedSession[] => {
  const map = new Map<string, ShiftRecord[]>();

  for (const s of shifts) {
    // Group by client name + date + address (handles split orders for same job)
    const key = `${s.clientName}|${s.scheduledDate}|${s.patientAddress}`;
    const arr = map.get(key) || [];
    arr.push(s);
    map.set(key, arr);
  }

  return Array.from(map.entries()).map(([key, group]) => {
    // Sort by start time so primary is earliest
    group.sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart));
    const allServices = Array.from(new Set(group.flatMap((s) => s.services)));

    return {
      key,
      clientName: group[0].clientName,
      clientPhone: group[0].clientPhone,
      patientAddress: group[0].patientAddress,
      scheduledDate: group[0].scheduledDate,
      earliestStart: group[0].scheduledStart,
      latestEnd: group[group.length - 1].scheduledEnd,
      allServices,
      shifts: group,
      primaryShift: group[0], // first shift drives the timer
    };
  });
};

export const PSWActiveTab = ({ onSelectShift }: PSWActiveTabProps) => {
  const { user } = useAuth();
  const [activeShifts, setActiveShifts] = useState<ShiftRecord[]>([]);
  const [elapsedTimes, setElapsedTimes] = useState<Record<string, number>>({});
  // Prevent redundant fetches while one is in-flight
  const fetchingRef = useRef(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const loadShifts = async () => {
      if (fetchingRef.current) return;
      fetchingRef.current = true;
      try {
        const shifts = await getActiveShiftsAsync(user.id);
        if (!cancelled) setActiveShifts(shifts);
      } catch (e) {
        console.warn("Failed to load active shifts:", e);
      } finally {
        fetchingRef.current = false;
      }
    };

    loadShifts();
    const interval = setInterval(loadShifts, 10000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user?.id]);

  // Single shared timer for all shift elapsed counters
  useEffect(() => {
    if (activeShifts.length === 0) return;
    const timer = setInterval(() => {
      const newElapsed: Record<string, number> = {};
      activeShifts.forEach((shift) => {
        if (shift.checkedInAt) {
          const checkInTime = new Date(shift.checkedInAt).getTime();
          newElapsed[shift.id] = Math.floor((Date.now() - checkInTime) / 1000);
        }
      });
      setElapsedTimes(newElapsed);
    }, 1000);
    return () => clearInterval(timer);
  }, [activeShifts]);

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

  const sessions = groupShiftsIntoSessions(activeShifts);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Active Shift</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} in progress
          {activeShifts.length > sessions.length && (
            <span className="ml-1">({activeShifts.length} orders)</span>
          )}
        </p>
      </div>
      <div className="space-y-3">
        {sessions.map((session) => {
          const elapsed = elapsedTimes[session.primaryShift.id] || 0;
          return (
            <Card key={session.key} className="shadow-card ring-2 ring-primary border-primary">
              <CardContent className="p-4">
                <div className="bg-primary/10 rounded-lg p-3 mb-4 text-center">
                  <p className="text-xs text-primary mb-1">Shift In Progress</p>
                  <p className="text-2xl font-mono font-bold text-primary">{formatTime(elapsed)}</p>
                </div>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">{session.clientName}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{session.earliestStart} - {session.latestEnd}</span>
                      </div>
                    </div>
                  </div>
                  <Badge className="bg-primary text-primary-foreground animate-pulse">In Progress</Badge>
                </div>
                <div className="space-y-2 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{session.patientAddress}</span>
                  </div>
                  {session.clientPhone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <a href={`tel:${session.clientPhone}`} className="text-primary hover:underline">{session.clientPhone}</a>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 mb-4">
                  {session.allServices.map((service, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{service}</Badge>
                  ))}
                </div>
                {session.shifts.length > 1 && (
                  <p className="text-xs text-muted-foreground mb-3 text-center">
                    This session includes {session.shifts.length} linked orders
                  </p>
                )}
                <Button
                  variant="brand"
                  className="w-full"
                  onClick={() => onSelectShift(session.primaryShift)}
                >
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
