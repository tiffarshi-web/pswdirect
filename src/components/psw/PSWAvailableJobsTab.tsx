import { useState, useEffect, useMemo, useCallback } from "react";
import { CareConditionBadges } from "@/components/ui/CareConditionBadges";
import { Clock, MapPin, User, ChevronRight, Calendar, Briefcase, Globe, AlertTriangle, DollarSign, Navigation, Car, Zap, Timer } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClaimShiftDialog } from "./ClaimShiftDialog";
import { 
  getAvailableShiftsAsync, 
  claimShift, 
  hasActiveShiftsAsync,
  type ShiftRecord 
} from "@/lib/shiftStore";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getPSWLanguages, 
  getLanguageName, 
  shouldOpenToAllPSWs,
  pswMatchesClientLanguages 
} from "@/lib/languageConfig";
import { getPSWProfileByIdFromDB, type PSWProfile } from "@/lib/pswDatabaseStore";
import { calculateDistanceBetweenPostalCodes } from "@/lib/postalCodeUtils";
import { getApplicableSurgeZone } from "@/lib/businessConfig";
import { fetchActiveServiceRadius } from "@/lib/serviceRadiusStore";

const BASE_PSW_RATE = 25;

const TRANSPORT_SERVICE_KEYWORDS = [
  "doctor escort", "hospital pick-up", "hospital drop-off",
  "appointment transportation", "medical transport",
  "doctor visit", "hospital discharge",
];

const GENDER_FALLBACK_HOURS = 2;
const URGENCY_HOURS_THRESHOLD = 4;

/** Haversine distance in km between two lat/lng points */
const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Calculate shift duration in hours from time strings */
const getShiftDurationHours = (start: string, end: string): number => {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);
  return ((endH * 60 + endM) - (startH * 60 + startM)) / 60;
};

/** Determine service category label */
const getServiceCategory = (services: string[]): string => {
  const joined = services.join(" ").toLowerCase();
  if (joined.includes("hospital") || joined.includes("discharge")) return "Hospital Discharge";
  if (joined.includes("doctor") || joined.includes("escort") || joined.includes("appointment")) return "Doctor Escort";
  return "Home Care";
};

/** Check if shift is urgent (ASAP or starts within threshold) */
const isUrgentShift = (shift: ShiftRecord): "asap" | "soon" | null => {
  if (shift.isAsap) return "asap";
  const shiftStart = new Date(`${shift.scheduledDate}T${shift.scheduledStart}`);
  const hoursUntil = (shiftStart.getTime() - Date.now()) / (1000 * 60 * 60);
  if (hoursUntil >= 0 && hoursUntil <= URGENCY_HOURS_THRESHOLD) return "soon";
  return null;
};

export const PSWAvailableJobsTab = () => {
  const { user } = useAuth();
  const [availableShifts, setAvailableShifts] = useState<ShiftRecord[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [pswProfile, setPswProfile] = useState<PSWProfile | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [serviceRadiusKm, setServiceRadiusKm] = useState<number>(75);

  useEffect(() => {
    fetchActiveServiceRadius().then(setServiceRadiusKm);
    const channel = supabase
      .channel("psw-radius-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "app_settings", filter: "setting_key=eq.active_service_radius" },
        (payload) => {
          const newRadius = parseInt(payload.new.setting_value, 10);
          if (!isNaN(newRadius)) setServiceRadiusKm(newRadius);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    getPSWProfileByIdFromDB(user.id).then((profile) => {
      setPswProfile(profile);
      setIsApproved(profile?.vettingStatus === "approved");
      setIsLoadingProfile(false);
    });
  }, [user?.id]);

  const pswLanguages = useMemo(() => {
    if (!user?.id) return ["en"];
    return getPSWLanguages(user.id);
  }, [user?.id]);

  const loadShifts = useCallback(async () => {
    const shifts = await getAvailableShiftsAsync();
    setAvailableShifts(shifts);
  }, []);

  useEffect(() => {
    loadShifts();
    const channel = supabase
      .channel("available-jobs-realtime")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "bookings" }, () => { loadShifts(); })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookings" }, () => { loadShifts(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadShifts]);

  const calculatePSWPayout = (shift: ShiftRecord) => {
    // Urban Bonus disabled (payroll correction Apr 2026). Pay = booked hours × base rate.
    const hoursWorked = getShiftDurationHours(shift.scheduledStart, shift.scheduledEnd);
    const basePay = hoursWorked * BASE_PSW_RATE;
    return { basePay, total: basePay };
  };

  /** Distance using stored lat/lng (preferred) or postal fallback */
  const getDistanceToJob = (shift: ShiftRecord): number | null => {
    // Prefer precise lat/lng when both PSW and job have stored coordinates
    if (pswProfile?.homeLat && pswProfile?.homeLng && shift.serviceLat && shift.serviceLng) {
      return Math.round(haversineKm(pswProfile.homeLat, pswProfile.homeLng, shift.serviceLat, shift.serviceLng));
    }
    // Fallback to postal code centroid distance
    if (!pswProfile?.homePostalCode) return null;
    return calculateDistanceBetweenPostalCodes(pswProfile.homePostalCode, shift.postalCode);
  };

  const isLanguageMatch = (shift: ShiftRecord): boolean => {
    if (!shift.preferredLanguages || shift.preferredLanguages.length === 0) return false;
    return pswMatchesClientLanguages(user?.id || "", shift.preferredLanguages);
  };

  const isWithinRadius = (shift: ShiftRecord): boolean => {
    if (!pswProfile?.homePostalCode && !pswProfile?.homeLat) return true;
    const distance = getDistanceToJob(shift);
    if (distance === null) return true;
    return distance <= serviceRadiusKm;
  };

  const isTransportRequired = (shift: ShiftRecord): boolean => {
    if (shift.isTransportShift) return true;
    return shift.services.some((s) =>
      TRANSPORT_SERVICE_KEYWORDS.some((kw) => s.toLowerCase().includes(kw))
    );
  };

  const pswHasVehicle = (): boolean => {
    return pswProfile?.hasOwnTransport === "yes";
  };

  const isGenderMatch = (shift: ShiftRecord): boolean => {
    if (!shift.preferredGender || shift.preferredGender === "no-preference") return true;
    if (shift.postedAt) {
      const postedAt = new Date(shift.postedAt);
      const hoursDiff = (Date.now() - postedAt.getTime()) / (1000 * 60 * 60);
      if (hoursDiff >= GENDER_FALLBACK_HOURS) return true;
    }
    if (!pswProfile?.gender || pswProfile.gender === "prefer-not-to-say" || pswProfile.gender === "other") return false;
    return pswProfile.gender === shift.preferredGender;
  };

  const isShiftVisibleToPSW = (shift: ShiftRecord): boolean => {
    if (!isWithinRadius(shift)) return false;
    if (isTransportRequired(shift) && !pswHasVehicle()) return false;
    if (!isGenderMatch(shift)) return false;
    if (!shift.preferredLanguages || shift.preferredLanguages.length === 0) return true;
    if (isLanguageMatch(shift)) return true;
    if (shouldOpenToAllPSWs(shift.bookingId)) return true;
    return false;
  };

  const visibleShifts = useMemo(() => {
    if (!isApproved) return [];
    return availableShifts.filter(isShiftVisibleToPSW);
  }, [availableShifts, pswLanguages, pswProfile?.homePostalCode, pswProfile?.homeLat, pswProfile?.homeLng, pswProfile?.gender, pswProfile?.hasOwnTransport, isApproved, serviceRadiusKm]);

  const handleClaimClick = (shift: ShiftRecord) => {
    setSelectedShift(shift);
    setShowClaimDialog(true);
  };

  const handleConfirmClaim = async () => {
    if (!selectedShift || !user || isClaiming) return;
    setIsClaiming(true);
    const pswId = user.id || "";
    const hasActive = await hasActiveShiftsAsync(pswId);
    if (hasActive) {
      toast.error("Complete your active shift first", {
        description: "You must complete your current shift before accepting a new job.",
      });
      setShowClaimDialog(false);
      setSelectedShift(null);
      setIsClaiming(false);
      return;
    }

    const claimed = await claimShift(
      selectedShift.id, pswId, user.name || "PSW User",
      pswProfile?.profilePhotoUrl, pswProfile?.vehiclePhotoUrl, pswProfile?.licensePlate
    );

    if (claimed) {
      toast.success("Job accepted!", {
        description: `${selectedShift.clientFirstName}'s full address and phone number are now visible in your schedule.`,
      });
      const shifts = await getAvailableShiftsAsync();
      setAvailableShifts(shifts);
    } else {
      toast.error("Failed to accept job. It may have been claimed by someone else.");
    }
    setShowClaimDialog(false);
    setSelectedShift(null);
    setIsClaiming(false);
  };

  const getGeneralLocation = (address: string): string => {
    const parts = address.split(",");
    if (parts.length >= 2) return parts[parts.length - 2].trim();
    return "Area within radius";
  };

  const getPrivacyLocation = (shift: ShiftRecord): string => {
    const postalPrefix = shift.postalCode
      ? shift.postalCode.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 3)
      : null;
    const city = getGeneralLocation(shift.patientAddress);
    if (city && city !== "Area within radius" && postalPrefix) return `${city}, ON (${postalPrefix})`;
    if (city && city !== "Area within radius") return `${city}, ON`;
    if (postalPrefix) return `Near ${postalPrefix}`;
    return "Area within radius";
  };

  if (isLoadingProfile) {
    return (
      <div className="space-y-4">
        <div><h2 className="text-xl font-semibold text-foreground">Available Jobs</h2><p className="text-sm text-muted-foreground mt-1">Loading your matching jobs...</p></div>
      </div>
    );
  }

  if (!isApproved) {
    return (
      <div className="space-y-4">
        <div><h2 className="text-xl font-semibold text-foreground">Available Jobs</h2><p className="text-sm text-muted-foreground mt-1">Jobs within {serviceRadiusKm}km of your location</p></div>
        <Card className="shadow-card border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-amber-800 dark:text-amber-200 mb-2">Pending Approval</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">Your application is being reviewed. You will be able to see and accept jobs once approved.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (visibleShifts.length === 0) {
    return (
      <div className="space-y-4">
        <div><h2 className="text-xl font-semibold text-foreground">Available Jobs Today</h2><p className="text-sm text-muted-foreground mt-1">Jobs within {serviceRadiusKm}km of your location</p></div>
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4"><Briefcase className="w-8 h-8 text-muted-foreground" /></div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Available Jobs Right Now</h3>
          <p className="text-muted-foreground">Check back later — new opportunities appear as clients book care.</p>
          {!pswProfile?.homePostalCode && <p className="text-xs text-amber-600 mt-2">Set your home address in Profile to see distance-filtered jobs</p>}
        </div>
      </div>
    );
  }

  const showNotifReminder = "Notification" in window && Notification.permission !== "granted";

  return (
    <div className="space-y-4">
      {showNotifReminder && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 text-sm">
          <span className="text-amber-600">🔔</span>
          <span className="flex-1 text-amber-800 dark:text-amber-200">Enable push notifications to get instant job alerts</span>
          <button
            className="text-xs font-medium text-primary underline"
            onClick={async () => { if ("Notification" in window) await Notification.requestPermission(); }}
          >
            Enable
          </button>
        </div>
      )}
      <div>
        <h2 className="text-xl font-semibold text-foreground">Available Jobs Today</h2>
        <p className="text-sm text-muted-foreground mt-1">{visibleShifts.length} job{visibleShifts.length !== 1 ? "s" : ""} within {serviceRadiusKm}km</p>
      </div>

      <div className="space-y-3">
        {visibleShifts.map((shift) => {
          const hasLanguageMatch = isLanguageMatch(shift);
          const hasLanguagePreference = shift.preferredLanguages && shift.preferredLanguages.length > 0;
          const payout = calculatePSWPayout(shift);
          const privacyLocation = getPrivacyLocation(shift);
          const distance = getDistanceToJob(shift);
          const transportRequired = isTransportRequired(shift);
          const durationHours = getShiftDurationHours(shift.scheduledStart, shift.scheduledEnd);
          const serviceCategory = getServiceCategory(shift.services);
          const urgency = isUrgentShift(shift);
          
          return (
            <Card key={shift.id} className={`shadow-card ${hasLanguageMatch ? "ring-2 ring-primary/50" : ""} ${urgency ? "ring-2 ring-amber-400/60" : ""}`}>
              <CardContent className="p-4">
                {/* Urgency banner */}
                {urgency && (
                  <div className={`flex items-center gap-1.5 mb-3 px-2.5 py-1.5 rounded-md text-xs font-semibold ${
                    urgency === "asap" 
                      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300" 
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}>
                    <Zap className="w-3.5 h-3.5" />
                    {urgency === "asap" ? "URGENT — ASAP Request" : "Starts Soon"}
                  </div>
                )}

                {/* Header: service category + badges */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"><User className="w-5 h-5 text-primary" /></div>
                    <div>
                      <h3 className="font-semibold text-foreground">{serviceCategory}</h3>
                      <p className="text-xs text-muted-foreground">{shift.clientFirstName} · {shift.scheduledDate}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    {distance !== null && (
                      <Badge variant="outline" className="text-xs font-medium">
                        <Navigation className="w-3 h-3 mr-1" />~{Math.round(distance)} km
                      </Badge>
                    )}
                    {hasLanguageMatch && <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1 text-xs"><Globe className="w-3 h-3" />Language Match</Badge>}
                  </div>
                </div>

                {/* Key details grid */}
                <div className="space-y-1.5 text-sm mb-3">
                  <div className="flex items-center gap-2 text-foreground">
                    <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-medium">{shift.scheduledStart} – {shift.scheduledEnd}</span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      <Timer className="w-3 h-3 mr-1" />{durationHours % 1 === 0 ? `${durationHours}h` : `${durationHours.toFixed(1)}h`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4 flex-shrink-0" /><span>{privacyLocation}</span>
                  </div>
                  {transportRequired && (
                    <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                      <Car className="w-4 h-4 flex-shrink-0" /><span className="text-xs font-medium">Transport Required</span>
                    </div>
                  )}
                  {hasLanguagePreference && (
                    <div className="flex items-center gap-2 text-muted-foreground"><Globe className="w-4 h-4 flex-shrink-0" /><span className="text-xs">Preferred: {shift.preferredLanguages?.map(getLanguageName).join(", ")}</span></div>
                  )}
                </div>

                {/* Payout estimate — prominent */}
                <div className="flex items-center gap-2 mb-3 p-2 rounded-md bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800">
                  <DollarSign className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Est. Payout: ${payout.total.toFixed(2)}</span>
                </div>

                {/* Service tags */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {shift.services.map((service, i) => <Badge key={i} variant="outline" className="text-xs">{service}</Badge>)}
                </div>

                {/* Care conditions */}
                {shift.careConditions && shift.careConditions.length > 0 && (
                  <div className="mb-3">
                    <CareConditionBadges conditions={shift.careConditions} />
                  </div>
                )}

                <Button variant="brand" className="w-full" onClick={() => handleClaimClick(shift)} disabled={isClaiming}>
                  Accept Job<ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <ClaimShiftDialog
        isOpen={showClaimDialog}
        onClose={() => { setShowClaimDialog(false); setSelectedShift(null); }}
        onConfirm={handleConfirmClaim}
        shiftDetails={selectedShift ? {
          clientName: selectedShift.clientFirstName,
          date: selectedShift.scheduledDate,
          time: `${selectedShift.scheduledStart} - ${selectedShift.scheduledEnd}`,
          address: selectedShift.patientAddress,
          preferredLanguages: selectedShift.preferredLanguages,
          preferredGender: selectedShift.preferredGender,
        } : undefined}
      />
    </div>
  );
};