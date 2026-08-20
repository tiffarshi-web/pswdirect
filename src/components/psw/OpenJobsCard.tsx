import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, MapPin, Clock, RefreshCw, Calendar, Timer,
  DollarSign, Navigation, Car, Zap, CheckCircle,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { usePSWProfileContext } from "@/contexts/PSWProfileContext";
import {
  getEligibleAvailableShiftsAsync,
  claimShiftDetailed,
  getClaimShiftMessage,
  hasActiveShiftsAsync,
  type ShiftRecord,
} from "@/lib/shiftStore";

interface OpenJobsCardProps {
  /** Navigate the dashboard to the Available Jobs tab */
  onViewAll: () => void;
}

const PREVIEW_LIMIT = 3;
const BASE_PSW_RATE = 25;

const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return "Today";
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const durationHours = (start: string, end: string): number => {
  const [sh, sm] = (start || "0:0").split(":").map(Number);
  const [eh, em] = (end || "0:0").split(":").map(Number);
  return ((eh * 60 + em) - (sh * 60 + sm)) / 60;
};

const isUrgent = (shift: ShiftRecord): "asap" | "soon" | null => {
  if (shift.isAsap) return "asap";
  const start = new Date(`${shift.scheduledDate}T${shift.scheduledStart}`);
  const hoursUntil = (start.getTime() - Date.now()) / 3_600_000;
  if (hoursUntil >= 0 && hoursUntil <= 4) return "soon";
  return null;
};

/**
 * Always-visible list of untaken (open) shifts on the PSW home screen, with a
 * full-width ACCEPT SHIFT button on every card so caregivers can take work
 * without hunting through tabs.
 */
export const OpenJobsCard = ({ onViewAll }: OpenJobsCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { profile: pswProfile } = usePSWProfileContext();
  const [shifts, setShifts] = useState<ShiftRecord[]>([]);
  const [distances, setDistances] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setRefreshing(true);
    try {
      const result = await getEligibleAvailableShiftsAsync(user.id);
      if (!result.error) {
        setShifts(result.shifts);
        setDistances(result.distances || {});
      }
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

  const handleAccept = async (shift: ShiftRecord) => {
    if (!user || claimingId) return;
    setClaimingId(shift.id);

    const pswId = user.id || "";
    if (await hasActiveShiftsAsync(pswId)) {
      toast.error("Complete your active shift first", {
        description: "You must complete your current shift before accepting a new job.",
      });
      setClaimingId(null);
      return;
    }

    const result = await claimShiftDetailed(
      shift.id,
      pswId,
      user.name || "PSW User",
      pswProfile?.profilePhotoUrl,
      pswProfile?.vehiclePhotoUrl,
      pswProfile?.licensePlate,
    );

    if (result.ok) {
      // Remove instantly so the shift can't be double-tapped, then send the
      // caregiver straight to their upcoming shifts.
      setShifts((prev) => prev.filter((s) => s.id !== shift.id));
      toast.success("Shift accepted", {
        description: "Full address and shift details are now in My Shifts.",
      });
      navigate("/psw?tab=schedule", { replace: true });
    } else {
      toast.error(getClaimShiftMessage(result.reason));
      await load();
    }
    setClaimingId(null);
  };

  if (loading) return null;

  return (
    <Card className="shadow-card mb-4 border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-foreground">Available Shifts</h2>
            <Badge variant={shifts.length > 0 ? "default" : "secondary"}>{shifts.length}</Badge>
          </div>
          <Button variant="ghost" size="icon" onClick={load} title="Refresh available shifts">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {shifts.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No untaken shifts right now. We'll notify you the moment a new one is posted.
          </p>
        ) : (
          <div className="space-y-3">
            {shifts.slice(0, PREVIEW_LIMIT).map((shift) => {
              const hours = durationHours(shift.scheduledStart, shift.scheduledEnd);
              const pay = hours * BASE_PSW_RATE;
              const km = distances[shift.id];
              const urgency = isUrgent(shift);
              const isClaiming = claimingId === shift.id;

              return (
                <div
                  key={shift.id}
                  className={`rounded-lg border p-3 ${urgency ? "border-amber-400/70" : "border-border"}`}
                >
                  {urgency && (
                    <div className={`inline-flex items-center gap-1.5 mb-2 px-2 py-1 rounded-md text-[11px] font-semibold ${
                      urgency === "asap"
                        ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                    }`}>
                      <Zap className="w-3 h-3" />
                      {urgency === "asap" ? "URGENT — ASAP" : "Starts Soon"}
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                    <Calendar className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span>{formatDate(shift.scheduledDate)}</span>
                    {km !== undefined && (
                      <Badge variant="outline" className="ml-auto text-[11px]">
                        <Navigation className="w-3 h-3 mr-1" />~{Math.round(km)} km
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-foreground mt-1">
                    <Clock className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span>{shift.scheduledStart} – {shift.scheduledEnd}</span>
                    <Badge variant="secondary" className="ml-auto text-[11px]">
                      <Timer className="w-3 h-3 mr-1" />
                      {hours % 1 === 0 ? `${hours}h` : `${hours.toFixed(1)}h`}
                    </Badge>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{shift.patientAddress || shift.postalCode || "Location pending"}</span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                      Est. Pay ${pay.toFixed(2)}
                    </span>
                    {shift.isTransportShift && (
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400">
                        <Car className="w-3.5 h-3.5" /> Vehicle required
                      </span>
                    )}
                  </div>

                  <Button
                    variant="brand"
                    className="w-full mt-3 h-12 text-base font-bold tracking-wide"
                    onClick={() => handleAccept(shift)}
                    disabled={!!claimingId}
                  >
                    {isClaiming ? (
                      "ACCEPTING…"
                    ) : (
                      <>
                        <CheckCircle className="w-5 h-5 mr-2" />
                        ACCEPT SHIFT
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        <Button variant="outline" className="w-full mt-3" onClick={onViewAll}>
          <Briefcase className="w-4 h-4 mr-2" />
          {shifts.length > PREVIEW_LIMIT
            ? `View all ${shifts.length} available shifts`
            : "Browse Available Jobs"}
        </Button>
      </CardContent>
    </Card>
  );
};
