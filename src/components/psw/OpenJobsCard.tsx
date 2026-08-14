import { useCallback, useEffect, useState } from "react";
import { Briefcase, MapPin, Clock, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { getEligibleAvailableShiftsAsync, type ShiftRecord } from "@/lib/shiftStore";

interface OpenJobsCardProps {
  /** Navigate the dashboard to the Available Jobs tab */
  onViewAll: () => void;
}

const PREVIEW_LIMIT = 3;

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  if (isToday) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

/**
 * Always-visible summary of untaken (open) jobs on the PSW home screen so
 * caregivers never have to hunt through tabs to find work they can accept.
 */
export const OpenJobsCard = ({ onViewAll }: OpenJobsCardProps) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const result = await getEligibleAvailableShiftsAsync(user.id);
      if (!result.error) setShifts(result.shifts);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [load]);

  if (loading) return null;

  return (
    <Card className="shadow-card mb-4 border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Open Shifts Near You</h2>
            <Badge variant={shifts.length > 0 ? "default" : "secondary"}>{shifts.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={load} title="Refresh open shifts">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No untaken shifts right now. We'll notify you the moment a new one is posted.
          </p>
        ) : (
          <div className="space-y-2">
            {shifts.slice(0, PREVIEW_LIMIT).map((shift) => (
              <button
                key={shift.id}
                onClick={onViewAll}
                className="w-full text-left rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1 text-sm font-medium text-foreground">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {formatDate(shift.scheduledDate)} · {shift.scheduledStart} - {shift.scheduledEnd}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{shift.city || shift.postalCode || "Location on accept"}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}

        <Button className="w-full mt-3" onClick={onViewAll}>
          <Briefcase className="w-4 h-4 mr-2" />
          {shifts.length > 0 ? `View & Accept ${shifts.length} Open Shift${shifts.length > 1 ? "s" : ""}` : "Browse Available Jobs"}
        </Button>
      </CardContent>
    </Card>
  );
};
