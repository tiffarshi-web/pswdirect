import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

import { 
  Clock, MapPin, User, CheckCircle2, Navigation, 
  AlertCircle, Timer, ArrowLeft, Play, ExternalLink, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CareConditionBadges } from "@/components/ui/CareConditionBadges";
import { toast } from "sonner";
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
import { 
  getCoordinatesFromPostalCode,
  calculateDistanceInMeters
} from "@/lib/postalCodeUtils";
import { geocodeAddress, calculateDistanceMeters } from "@/lib/geocodingUtils";
import { 
  checkInToShift, 
  signOutFromShift,
  type ShiftRecord,
  type CareSheetData,
} from "@/lib/shiftStore";
import { fetchOfficeNumber, DEFAULT_OFFICE_NUMBER } from "@/lib/messageTemplates";
import { 
  sendCareSheetReportEmail, 
  sendJobCompletedAdminNotification,
  sendPSWArrivedNotification,
  sendHospitalDischargeEmail 
} from "@/lib/notificationService";
import { PSWCareSheet } from "./PSWCareSheet";
import { LocationPermissionDialog } from "./LocationPermissionDialog";
import { useAuth } from "@/contexts/AuthContext";
import { usePSWLocationTracking } from "@/hooks/usePSWLocationTracking";
import { BookingChatPanel } from "@/components/messaging/BookingChatPanel";
import {
  fetchGeofenceThresholds,
  requestAdminOverride,
  DEFAULT_GEOFENCE_THRESHOLDS,
  type GeofenceThresholds,
} from "@/lib/geofenceSettings";

interface ActiveShiftTabProps {
  shift: ShiftRecord;
  onBack: () => void;
  onComplete: () => void;
}

export const ActiveShiftTab = ({ shift: initialShift, onBack, onComplete }: ActiveShiftTabProps) => {
  const { user } = useAuth();
  const [shift, setShift] = useState<ShiftRecord>(initialShift);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkInErrorDetail, setCheckInErrorDetail] = useState<{
    code: "permission_denied" | "gps_unavailable" | "outside_radius" | "no_reference" | "timeout" | null;
    distanceM?: number;
    thresholdM?: number;
    accuracyM?: number;
    lat?: number;
    lng?: number;
  } | null>(null);
  const [overrideRequested, setOverrideRequested] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCareSheet, setShowCareSheet] = useState(false);
  const [showEndShiftConfirm, setShowEndShiftConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"checking" | "valid" | "invalid" | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [officeNumber, setOfficeNumber] = useState(DEFAULT_OFFICE_NUMBER);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
  const [softFailNotice, setSoftFailNotice] = useState<string | null>(null);
  const [thresholds, setThresholds] = useState<GeofenceThresholds>(DEFAULT_GEOFENCE_THRESHOLDS);

  // GPS Location Tracking - active when shift is checked-in
  const { isTracking, lastLoggedAt, error: trackingError } = usePSWLocationTracking({
    bookingId: shift.bookingId || null,
    pswId: user?.id || null,
    isActive: shift.status === "checked-in",
    intervalMinutes: 5,
  });

  // Fetch office number + geofence thresholds on mount
  useEffect(() => {
    fetchOfficeNumber().then(setOfficeNumber);
    fetchGeofenceThresholds().then(setThresholds).catch(() => {/* keep defaults */});
  }, []);

  const pswFirstName = useMemo(() => {
    const name = user?.name || "PSW";
    return name.split(" ")[0];
  }, [user]);

  // Check if running in development/preview environment
  const isDevelopment = import.meta.env.DEV || 
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname === 'localhost';

  // Determine if this is a transport shift requiring pickup location check
  const isTransportShift = shift.isTransportShift || 
    shift.services.some(s => 
      s.toLowerCase().includes("hospital") || 
      s.toLowerCase().includes("doctor") || 
      s.toLowerCase().includes("escort") ||
      s.toLowerCase().includes("discharge")
    );

  // Timer effect
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (shift.status === "checked-in" && shift.checkedInAt) {
      const checkInTime = new Date(shift.checkedInAt).getTime();
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - checkInTime) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [shift.status, shift.checkedInAt]);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Launch Google Maps navigation for a specific address (directions mode)
  const launchNavigation = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, "_blank");
  };

  // Get the appropriate check-in postal code (pickup for transport, patient for regular)
  const getCheckInPostalCode = (): string => {
    if (isTransportShift && shift.pickupPostalCode) {
      return shift.pickupPostalCode;
    }
    return shift.postalCode;
  };

  // Get the appropriate proximity threshold
  const getProximityThreshold = (): number => {
    return isTransportShift ? thresholds.transportCheckinRadiusM : thresholds.checkinRadiusM;
  };

  // Show permission dialog before triggering browser GPS prompt
  const initiateCheckIn = () => {
    // Auto-bypass in development/preview environment
    if (isDevelopment) {
      handleCheckIn();
      return;
    }
    
    // Show friendly permission dialog first
    setShowPermissionDialog(true);
  };

  // Called after user accepts the permission dialog
  const handlePermissionAccepted = () => {
    setShowPermissionDialog(false);
    handleCheckIn();
  };

  const handlePermissionDeclined = () => {
    setShowPermissionDialog(false);
    toast.info("Location access is required to check in. You can try again when ready.");
  };

  const handleCheckIn = () => {
    setIsCheckingIn(true);
    setCheckInError(null);
    setCheckInErrorDetail(null);
    setOverrideRequested(false);
    setLocationStatus("checking");

    // Auto-bypass GPS in development/preview environment
    if (isDevelopment) {
      console.log("Development mode: GPS proximity check bypassed");
      setTimeout(async () => {
        const updated = await checkInToShift(shift.id, { lat: 0, lng: 0 });
        if (updated) {
          setShift(updated);
          toast.success("Checked in successfully!");
        }
        setIsCheckingIn(false);
        setLocationStatus(null);
      }, 1000);
      return;
    }

    // Soft-fail helper: completes check-in even when GPS verification fails,
    // and clearly tells the PSW the shift is flagged for admin review.
    const softFailCheckIn = async (
      lat: number,
      lng: number,
      telemetry: { outsideRadius?: boolean; distanceM?: number; accuracyM?: number; failureReason?: string }
    ) => {
      const updated = await checkInToShift(shift.id, { lat, lng }, telemetry);
      if (updated) {
        setShift(updated);
        const description = telemetry.failureReason || (telemetry.distanceM
          ? `You appear to be ~${Math.round(telemetry.distanceM)}m from the location. Admin will verify.`
          : "Admin will review your check-in location.");
        setSoftFailNotice(description);
        toast.warning("Checked in — Location verification pending admin review", {
          description,
          duration: 9000,
        });
        const orderingClientEmail = shift.clientEmail || updated.clientEmail || "";
        sendPSWArrivedNotification(
          orderingClientEmail,
          updated.clientName,
          updated.bookingId,
          updated.scheduledDate,
          new Date().toLocaleTimeString(),
          user?.name || pswFirstName
        );
      } else {
        setCheckInError("Check-in could not be saved. Please retry — your shift is not lost.");
        setCheckInErrorDetail({
          code: telemetry.outsideRadius ? "outside_radius" : "gps_unavailable",
          distanceM: telemetry.distanceM,
          thresholdM: getProximityThreshold(),
          accuracyM: telemetry.accuracyM,
          lat: lat || undefined,
          lng: lng || undefined,
        });
      }
      setIsCheckingIn(false);
      setLocationStatus(null);
    };

    if (!navigator.geolocation) {
      // Soft-fail: still allow check-in, just flag for review
      softFailCheckIn(0, 0, { failureReason: "Browser does not support geolocation" });
      return;
    }

    const checkInPostalCode = getCheckInPostalCode();
    const proximityThreshold = getProximityThreshold();
    const checkInAddress = isTransportShift && shift.pickupAddress
      ? shift.pickupAddress
      : shift.patientAddress;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const pswLat = position.coords.latitude;
        const pswLng = position.coords.longitude;
        const accuracyM = position.coords.accuracy;

        let targetLat: number | null = null;
        let targetLng: number | null = null;
        let usedPreciseGeo = false;

        if (checkInAddress && checkInAddress.length >= 5) {
          try {
            const geocoded = await geocodeAddress(checkInAddress);
            if (geocoded) { targetLat = geocoded.lat; targetLng = geocoded.lng; usedPreciseGeo = true; }
          } catch (e) {
            console.warn("Geocoding failed, falling back to FSA:", e);
          }
        }
        if (targetLat === null || targetLng === null) {
          const checkInCoords = getCoordinatesFromPostalCode(checkInPostalCode);
          if (checkInCoords) { targetLat = checkInCoords.lat; targetLng = checkInCoords.lng; }
        }

        // No reference target — soft-fail with telemetry
        if (targetLat === null || targetLng === null) {
          await softFailCheckIn(pswLat, pswLng, {
            failureReason: "No reference location available for verification",
            accuracyM,
          });
          return;
        }

        const distance = usedPreciseGeo
          ? calculateDistanceMeters(pswLat, pswLng, targetLat, targetLng)
          : calculateDistanceInMeters(pswLat, pswLng, targetLat, targetLng);
        setCurrentDistance(Math.round(distance));

        // Outside radius → soft-fail (NEVER blocks)
        if (distance > proximityThreshold) {
          await softFailCheckIn(pswLat, pswLng, {
            outsideRadius: true,
            distanceM: distance,
            accuracyM,
            failureReason: `Outside ${proximityThreshold}m radius (~${Math.round(distance)}m away)`,
          });
          return;
        }

        // Verified
        setLocationStatus("valid");
        const updated = await checkInToShift(shift.id, { lat: pswLat, lng: pswLng }, {
          distanceM: distance,
          accuracyM,
        });
        if (updated) {
          setShift(updated);
          toast.success("Checked in - Location verified");
          const orderingClientEmail = shift.clientEmail || updated.clientEmail || "";
          sendPSWArrivedNotification(
            orderingClientEmail,
            updated.clientName,
            updated.bookingId,
            updated.scheduledDate,
            new Date().toLocaleTimeString(),
            user?.name || pswFirstName
          );
        }
        setIsCheckingIn(false);
      },
      async (error) => {
        // GPS denied / unavailable → soft-fail, never block
        const isDenied = error.code === error.PERMISSION_DENIED;
        const reason = isDenied
          ? "Location permission denied — please enable Location for this browser in your device settings, then tap Retry GPS."
          : error.code === error.TIMEOUT
            ? "GPS timed out"
            : "GPS unavailable";
        await softFailCheckIn(0, 0, { failureReason: reason });
        // Also expose detail for the rich error card so PSW can request override
        setCheckInErrorDetail({
          code: isDenied ? "permission_denied" : error.code === error.TIMEOUT ? "timeout" : "gps_unavailable",
          thresholdM: getProximityThreshold(),
        });
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleEndShift = () => {
    setShowEndShiftConfirm(true);
  };

  const confirmEndShift = () => {
    setShowEndShiftConfirm(false);
    setShowCareSheet(true);
  };

  // Soft sign-out radius is intentionally MUCH larger than check-in:
  // PSWs may be in elevators, parking garages, or moving cars when finishing.
  // We never block sign-out — we just flag it for admin review when far away.
  const SIGN_OUT_SOFT_RADIUS_M = thresholds.signoutRadiusM;

  // Best-effort GPS capture for sign-out — never blocks completion.
  const captureSignOutLocation = (): Promise<{
    lat?: number; lng?: number; accuracy?: number; distance?: number; outsideRadius?: boolean;
  }> => new Promise((resolve) => {
    if (!navigator.geolocation || isDevelopment) {
      resolve({});
      return;
    }
    let settled = false;
    const done = (loc: any) => { if (!settled) { settled = true; resolve(loc); } };
    // Hard cap so we don't make PSWs wait
    const timeout = setTimeout(() => done({}), 6000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timeout);
        const { latitude, longitude, accuracy } = position.coords;
        const targetLat = shift.serviceLat;
        const targetLng = shift.serviceLng;
        let distance: number | undefined;
        let outsideRadius = false;
        if (typeof targetLat === "number" && typeof targetLng === "number") {
          distance = calculateDistanceMeters(latitude, longitude, targetLat, targetLng);
          outsideRadius = distance > SIGN_OUT_SOFT_RADIUS_M;
        }
        done({ lat: latitude, lng: longitude, accuracy, distance, outsideRadius });
      },
      () => { clearTimeout(timeout); done({}); },
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  });

  const submitSignOut = async (careSheet: CareSheetData) => {
    setIsSubmitting(true);

    if (!navigator.onLine) {
      toast.error("No internet connection", {
        description: "Reconnect to Wi-Fi or mobile data, then tap Retry Sign-Out.",
      });
      setIsSubmitting(false);
      return;
    }

    const orderingClientEmail = shift.clientEmail || "";
    const location = await captureSignOutLocation();
    const result = await signOutFromShift(shift.id, careSheet, orderingClientEmail, location);

    if (!result.success || !result.shift) {
      const code = result.errorCode || "UNKNOWN";
      const friendly: Record<string, string> = {
        NOT_CHECKED_IN: "You're not checked in to this shift. Contact the office.",
        BOOKING_NOT_FOUND: "We couldn't find this shift. Try refreshing the app.",
        PERMISSION_DENIED: "Your session expired. Log out, log back in, then retry.",
        NETWORK_ERROR: "No internet connection. Reconnect and tap Retry.",
        DB_UPDATE_FAILED: "Saving failed. Tap Retry — if it keeps failing, call the office.",
        UNKNOWN: result.errorMessage || "Sign-out failed. Please retry or contact the office.",
      };
      toast.error("Sign-out failed", {
        description: friendly[code],
        action: { label: "Retry Sign-Out", onClick: () => submitSignOut(careSheet) },
        duration: 12000,
      });
      setIsSubmitting(false);
      return;
    }

    const completed = result.shift;
    setShift(completed);
    try { localStorage.removeItem(`care_sheet_draft:${shift.id}`); } catch { /* ignore */ }


    if (location.outsideRadius) {
      toast.warning("Signed out — flagged for review", {
        description: `You were ~${Math.round((location.distance || 0))}m from the client. Admin will verify.`,
        duration: 8000,
      });
    }

    if (careSheet.isHospitalDischarge && careSheet.dischargeDocuments) {
      await sendHospitalDischargeEmail(
        orderingClientEmail,
        completed.clientName,
        careSheet.pswFirstName,
        shift.pswPhotoUrl,
        completed.scheduledDate,
        careSheet.tasksCompleted,
        careSheet.observations,
        careSheet.dischargeDocuments,
        "discharge-papers"
      );
    } else {
      await sendCareSheetReportEmail(
        orderingClientEmail,
        completed.clientName,
        careSheet.pswFirstName,
        completed.scheduledDate,
        careSheet.tasksCompleted,
        careSheet.observations
      );
    }

    await sendJobCompletedAdminNotification(
      completed.id,
      completed.pswName,
      completed.clientName,
      completed.signedOutAt || new Date().toISOString(),
      completed.flaggedForOvertime
    );

    if (completed.flaggedForOvertime) {
      toast.warning(`Shift completed with ${completed.overtimeMinutes} minutes overtime`, {
        description: "This has been flagged for additional billing.",
      });
    } else {
      toast.success("Shift completed successfully!", {
        description: "Care sheet has been sent to the ordering client.",
      });
    }

    setTimeout(() => onComplete(), 2000);
    setIsSubmitting(false);
  };

  const handleSubmitCareSheet = async (careSheet: CareSheetData) => {
    await submitSignOut(careSheet);
  };

  // Completed state
  if (shift.status === "completed") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-semibold text-foreground">Shift Complete</h1>
        </div>

        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Great Work!</h2>
          <p className="text-muted-foreground mb-2">Your shift has been completed.</p>
          {shift.flaggedForOvertime && (
            <Badge variant="outline" className="text-amber-600 border-amber-300">
              +{shift.overtimeMinutes} min overtime flagged
            </Badge>
          )}
          <p className="text-sm text-muted-foreground mt-4">
            Care sheet sent to ordering client.
          </p>
        </div>

        <Button variant="outline" className="w-full" onClick={onBack}>
          Back to Schedule
        </Button>
      </div>
    );
  }

  // Not started / Claimed state - show check-in
  if (shift.status === "claimed") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Shift Details</h1>
            <p className="text-sm text-muted-foreground">
              {shift.scheduledDate} • {shift.scheduledStart} - {shift.scheduledEnd}
            </p>
          </div>
        </div>

        {/* Transport Shift - Show Pickup & Dropoff Addresses */}
        {isTransportShift && shift.pickupAddress && (
          <Card className="shadow-card border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
            <CardContent className="p-4 space-y-3">
              <h3 className="font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Transport Route
              </h3>
              <div className="space-y-2">
                <button 
                  onClick={() => launchNavigation(shift.pickupAddress!)}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-background rounded-lg border border-amber-200 hover:border-primary transition-colors text-left"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Pick-up Location</p>
                    <p className="text-sm font-medium text-foreground">{shift.pickupAddress}</p>
                    <p className="text-xs text-muted-foreground">{shift.pickupPostalCode}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-primary" />
                </button>
                <button 
                  onClick={() => launchNavigation(shift.patientAddress)}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-background rounded-lg border border-border hover:border-primary transition-colors text-left"
                >
                  <div>
                    <p className="text-xs text-muted-foreground">Drop-off Location</p>
                    <p className="text-sm font-medium text-foreground">{shift.patientAddress}</p>
                    <p className="text-xs text-muted-foreground">{shift.postalCode}</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-primary" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Client Card (for non-transport shifts) */}
        {!isTransportShift && (
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">{shift.clientFirstName}</h2>
                  <button 
                    onClick={() => launchNavigation(shift.patientAddress)}
                    className="flex items-center gap-2 text-sm text-muted-foreground mt-1 hover:text-primary"
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="underline">{shift.patientAddress}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Services */}
        <div className="flex flex-wrap gap-2">
          {shift.services.map((service, i) => (
            <Badge key={i} variant="secondary">{service}</Badge>
          ))}
        </div>

        {/* Care Conditions */}
        {shift.careConditions && shift.careConditions.length > 0 && (
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Care Conditions</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <CareConditionBadges
                conditions={shift.careConditions}
                otherText={shift.careConditionsOther}
              />
            </CardContent>
          </Card>
        )}

        {/* Job Description / Special Instructions */}
        {shift.specialNotes && (
          <Card className="shadow-card border-primary/30 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Job Description / Special Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-foreground whitespace-pre-wrap">{shift.specialNotes}</p>
            </CardContent>
          </Card>
        )}


        {/* Navigation Button */}
        <Button 
          variant="outline" 
          className="w-full h-12"
          onClick={() => launchNavigation(isTransportShift && shift.pickupAddress ? shift.pickupAddress : shift.patientAddress)}
        >
          <Navigation className="w-5 h-5 mr-2 text-primary" />
          Navigate to {isTransportShift ? "Pick-up" : "Client"}
        </Button>

        {/* Check-In Section */}
        <Card className="shadow-card">
          <CardContent className="p-4 space-y-4">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground">Ready to Start?</h3>
              <p className="text-sm text-muted-foreground mt-1">
                GPS will verify you're within {getProximityThreshold()}m of the {isTransportShift ? "pick-up location" : "client"}
              </p>
            </div>

            {checkInError && (
              <div className="space-y-3 p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm text-destructive">
                    <p className="font-medium">{checkInError}</p>
                    {checkInErrorDetail?.code === "permission_denied" && (
                      <p className="mt-1 text-xs">
                        Open your phone Settings → Privacy → Location and enable Location for this browser, then tap Retry GPS.
                      </p>
                    )}
                    {typeof checkInErrorDetail?.distanceM === "number" && (
                      <p className="mt-1 text-xs">
                        You appear to be ~<strong>{Math.round(checkInErrorDetail.distanceM)}m</strong> away.
                        Required: within <strong>{checkInErrorDetail.thresholdM ?? getProximityThreshold()}m</strong>.
                        {typeof checkInErrorDetail.accuracyM === "number" && (
                          <> GPS accuracy ±{Math.round(checkInErrorDetail.accuracyM)}m.</>
                        )}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setCheckInError(null);
                      setCheckInErrorDetail(null);
                      handleCheckIn();
                    }}
                    disabled={isCheckingIn}
                  >
                    <Navigation className="w-4 h-4 mr-2" />
                    Retry GPS
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="flex-1"
                    disabled={overrideRequested || isCheckingIn}
                    onClick={async () => {
                      const res = await requestAdminOverride({
                        bookingId: shift.bookingId,
                        pswId: user?.id,
                        requestType: "check_in",
                        reason: checkInError || undefined,
                        failureCode: checkInErrorDetail?.code || undefined,
                        distanceM: checkInErrorDetail?.distanceM ?? null,
                        thresholdM: checkInErrorDetail?.thresholdM ?? getProximityThreshold(),
                        accuracyM: checkInErrorDetail?.accuracyM ?? null,
                        pswLat: checkInErrorDetail?.lat ?? null,
                        pswLng: checkInErrorDetail?.lng ?? null,
                      });
                      if (res.ok) {
                        setOverrideRequested(true);
                        toast.success("Override request sent to admin", {
                          description: "An admin will review and may manually start your shift. Please call the office if urgent.",
                          duration: 9000,
                        });
                      } else {
                        toast.error("Could not send override request", {
                          description: res.error || `Call the office: ${officeNumber}`,
                        });
                      }
                    }}
                  >
                    {overrideRequested ? "Request Sent ✓" : "Request Admin Override"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Admin override does NOT auto-start your shift — it flags this for the office to review and manually sign you in.
                </p>
              </div>
            )}

            <Button 
              variant="brand" 
              className="w-full h-14 text-base"
              onClick={initiateCheckIn}
              disabled={isCheckingIn}
            >
              {isCheckingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Verifying Location...
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 mr-2" />
                  Check-In & Start Shift
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Location Permission Dialog */}
        <LocationPermissionDialog
          open={showPermissionDialog}
          onAccept={handlePermissionAccepted}
          onDecline={handlePermissionDeclined}
        />
      </div>
    );
  }

  // Checked-in state - show timer and care sheet
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Active Shift</h1>
          <p className="text-sm text-muted-foreground">
            Currently at {shift.clientFirstName}'s
          </p>
        </div>
      </div>

      {/* Status Card */}
      <Card className="shadow-card border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-sm font-medium text-primary">In Progress</span>
            </div>
            <Badge variant="outline" className="border-primary/30 text-primary">
              Started: {shift.checkedInAt ? new Date(shift.checkedInAt).toLocaleTimeString() : ""}
            </Badge>
          </div>
          
          {/* Timer */}
          <div className="text-center py-4">
            <div className="flex items-center justify-center gap-2">
              <Timer className="w-6 h-6 text-muted-foreground" />
              <span className="text-4xl font-mono font-bold text-foreground">
                {formatTime(elapsedTime)}
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Scheduled end: {shift.scheduledEnd}
            </p>
          </div>

          <div className="flex items-center gap-3 pt-3 border-t border-primary/20">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{shift.clientName}</p>
              <p className="text-sm text-muted-foreground">{shift.patientAddress}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {softFailNotice && (
        <div className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-950/30">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">
              Location verification pending admin review
            </p>
            <p className="text-amber-700 dark:text-amber-300 mt-0.5">
              Your shift was submitted successfully. {softFailNotice}
            </p>
          </div>
        </div>
      )}

      {!showCareSheet ? (
        <>
          {/* Services being provided */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Services to Provide</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2">
                {shift.services.map((service, i) => (
                  <Badge key={i} variant="outline">{service}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Exact Address (post-acceptance PII) */}
          <Card className="shadow-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                {isTransportShift ? "Pick-up & Drop-off" : "Service Address"}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {isTransportShift && shift.pickupAddress && (
                <div>
                  <p className="text-xs text-muted-foreground">Pick-up</p>
                  <p className="text-sm text-foreground">{shift.pickupAddress}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-muted-foreground">
                  {isTransportShift ? "Drop-off" : "Address"}
                </p>
                <p className="text-sm text-foreground">{shift.patientAddress}</p>
              </div>
            </CardContent>
          </Card>

          {/* Care Conditions */}
          {shift.careConditions && shift.careConditions.length > 0 && (
            <Card className="shadow-card">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Care Conditions</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <CareConditionBadges
                  conditions={shift.careConditions}
                  otherText={shift.careConditionsOther}
                />
              </CardContent>
            </Card>
          )}

          {/* Job Description / Special Instructions */}
          {shift.specialNotes && (
            <Card className="shadow-card border-primary/30 bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Job Description / Special Instructions
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-foreground whitespace-pre-wrap">{shift.specialNotes}</p>
              </CardContent>
            </Card>
          )}

          {/* Secure in-app messaging with the client */}
          {shift.bookingId && (
            <BookingChatPanel bookingId={shift.bookingId} viewerRole="psw" compact />
          )}


          {/* End Shift Button */}
          <Button 
            variant="destructive" 
            size="lg" 
            className="w-full"
            onClick={handleEndShift}
          >
            End Shift & Complete Care Sheet
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            Note: Signing out 15+ minutes after scheduled end will flag for overtime billing.
          </p>

          {/* End Shift Confirmation Dialog */}
          <AlertDialog open={showEndShiftConfirm} onOpenChange={setShowEndShiftConfirm}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Care Sheet Required
                </AlertDialogTitle>
                <AlertDialogDescription asChild>
                  <div className="space-y-3">
                    <p>Before ending this shift, you must complete a care sheet documenting:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Client's mood on arrival and departure</li>
                      <li>Tasks completed during the visit</li>
                      <li>Any observations or notes</li>
                    </ul>
                    <p className="font-medium text-foreground">This care sheet will be sent to the ordering client.</p>
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Continue Working</AlertDialogCancel>
                <AlertDialogAction onClick={confirmEndShift}>
                  Complete Care Sheet
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : (
        <PSWCareSheet
          services={shift.services}
          pswFirstName={pswFirstName}
          onSubmit={handleSubmitCareSheet}
          isSubmitting={isSubmitting}
          officeNumber={officeNumber}
          draftKey={shift.id ? `care_sheet_draft:${shift.id}` : undefined}
        />

      )}
    </div>
  );
};
