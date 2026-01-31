import { useState, useEffect, useMemo } from "react";
import { 
  Clock, MapPin, User, CheckCircle2, Navigation, 
  AlertCircle, Timer, ArrowLeft, Play, ExternalLink, FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  isPSWWithinCheckInProximity, 
  getCoordinatesFromPostalCode,
  PSW_CHECKIN_PROXIMITY_METERS,
  calculateDistanceInMeters
} from "@/lib/postalCodeUtils";
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
import { useAuth } from "@/contexts/AuthContext";
import { usePSWLocationTracking } from "@/hooks/usePSWLocationTracking";

// Transport shift security threshold: 500 meters
const TRANSPORT_CHECKIN_PROXIMITY_METERS = 500;

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
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCareSheet, setShowCareSheet] = useState(false);
  const [showEndShiftConfirm, setShowEndShiftConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [locationStatus, setLocationStatus] = useState<"checking" | "valid" | "invalid" | null>(null);
  const [currentDistance, setCurrentDistance] = useState<number | null>(null);
  const [officeNumber, setOfficeNumber] = useState(DEFAULT_OFFICE_NUMBER);

  // GPS Location Tracking - active when shift is checked-in
  const { isTracking, lastLoggedAt, error: trackingError } = usePSWLocationTracking({
    bookingId: shift.bookingId || null,
    pswId: user?.id || null,
    isActive: shift.status === "checked-in",
    intervalMinutes: 5,
  });

  // Fetch office number on mount
  useEffect(() => {
    fetchOfficeNumber().then(setOfficeNumber);
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
    let interval: NodeJS.Timeout;
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
    return isTransportShift ? TRANSPORT_CHECKIN_PROXIMITY_METERS : PSW_CHECKIN_PROXIMITY_METERS;
  };

  const handleCheckIn = () => {
    setIsCheckingIn(true);
    setCheckInError(null);
    setLocationStatus("checking");

    // Auto-bypass GPS in development/preview environment
    if (isDevelopment) {
      console.log("Development mode: GPS proximity check bypassed");
      setTimeout(() => {
        const updated = checkInToShift(shift.id, { lat: 0, lng: 0 });
        if (updated) {
          setShift(updated);
          toast.success("Checked in successfully!");
        }
        setIsCheckingIn(false);
        setLocationStatus(null);
      }, 1000);
      return;
    }

    if (!navigator.geolocation) {
      setCheckInError("Geolocation is not supported by your browser");
      setIsCheckingIn(false);
      setLocationStatus("invalid");
      return;
    }

    const checkInPostalCode = getCheckInPostalCode();
    const proximityThreshold = getProximityThreshold();

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pswLat = position.coords.latitude;
        const pswLng = position.coords.longitude;
        
        // Get check-in location from postal code
        const checkInCoords = getCoordinatesFromPostalCode(checkInPostalCode);
        
        if (!checkInCoords) {
          setCheckInError("Unable to verify location. Please contact the office.");
          setIsCheckingIn(false);
          setLocationStatus("invalid");
          return;
        }

        const distance = calculateDistanceInMeters(pswLat, pswLng, checkInCoords.lat, checkInCoords.lng);
        setCurrentDistance(Math.round(distance));

        if (distance > proximityThreshold) {
          const errorMessage = isTransportShift 
            ? `Security Check Failed: You must be at the Pick-up Location to start this shift. You are ${Math.round(distance)}m away (must be within ${proximityThreshold}m).`
            : `You must be at the client's location to check in. You are ${Math.round(distance)}m away (must be within ${proximityThreshold}m).`;
          setCheckInError(errorMessage);
          setIsCheckingIn(false);
          setLocationStatus("invalid");
          return;
        }

        setLocationStatus("valid");
        const updated = checkInToShift(shift.id, { lat: pswLat, lng: pswLng });
        if (updated) {
          setShift(updated);
          toast.success("Checked in - Location verified");
          
          // Send PSW arrived notification to client
          // Note: pswName is passed - service will mask to first name only
          const orderingClientEmail = "client@example.com"; // Would come from booking data
          sendPSWArrivedNotification(
            orderingClientEmail,
            updated.clientName,
            updated.bookingId,
            updated.scheduledDate,
            new Date().toLocaleTimeString(),
            user?.name || pswFirstName // Full name - will be masked by notification service
          );
        }
        setIsCheckingIn(false);
      },
      (error) => {
        let errorMessage = isTransportShift 
          ? "Security Check Failed: Unable to verify your location. "
          : "You must be at the client's location to check in. ";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage += "Please enable location access in your browser settings.";
        } else {
          errorMessage += "If you are having GPS issues, contact the office.";
        }
        setCheckInError(errorMessage);
        setIsCheckingIn(false);
        setLocationStatus("invalid");
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

  const handleSubmitCareSheet = async (careSheet: CareSheetData) => {
    setIsSubmitting(true);

    // Use a mock email for demo
    const orderingClientEmail = shift.clientEmail || "client@example.com";
    
    const completed = signOutFromShift(shift.id, careSheet, orderingClientEmail);
    
    if (completed) {
      setShift(completed);
      
      // Check if this is a hospital discharge - send specialized email with attachment
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
        // Send standard care sheet email to client
        await sendCareSheetReportEmail(
          orderingClientEmail,
          completed.clientName,
          careSheet.pswFirstName,
          completed.scheduledDate,
          careSheet.tasksCompleted,
          careSheet.observations
        );
      }
      
      // Send job completed notification to admin
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
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    }
    
    setIsSubmitting(false);
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
                GPS will verify you're within {isTransportShift ? TRANSPORT_CHECKIN_PROXIMITY_METERS : PSW_CHECKIN_PROXIMITY_METERS}m of the {isTransportShift ? "pick-up location" : "client"}
              </p>
            </div>

            {checkInError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{checkInError}</p>
              </div>
            )}

            <Button 
              variant="brand" 
              className="w-full h-14 text-base"
              onClick={handleCheckIn}
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
        />
      )}
    </div>
  );
};
