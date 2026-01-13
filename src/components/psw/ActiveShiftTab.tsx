import { useState, useEffect, useMemo } from "react";
import { 
  Clock, MapPin, User, CheckCircle2, Navigation, 
  AlertCircle, Timer, ArrowLeft, Play
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { 
  isPSWWithinCheckInProximity, 
  getCoordinatesFromPostalCode,
  PSW_CHECKIN_PROXIMITY_METERS 
} from "@/lib/postalCodeUtils";
import { 
  checkInToShift, 
  signOutFromShift,
  type ShiftRecord,
  type CareSheetData,
  OFFICE_PHONE_NUMBER
} from "@/lib/shiftStore";
import { 
  sendCareSheetReportEmail, 
  sendJobCompletedAdminNotification 
} from "@/lib/notificationService";
import { PSWCareSheet } from "./PSWCareSheet";
import { useAuth } from "@/contexts/AuthContext";

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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pswFirstName = useMemo(() => {
    const name = user?.name || "PSW";
    return name.split(" ")[0];
  }, [user]);

  // Check if running in development/preview environment
  const isDevelopment = import.meta.env.DEV || 
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname === 'localhost';

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

  // Launch Google Maps navigation
  const launchNavigation = () => {
    const encodedAddress = encodeURIComponent(shift.patientAddress);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, "_blank");
  };

  const handleCheckIn = () => {
    setIsCheckingIn(true);
    setCheckInError(null);

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
      }, 1000);
      return;
    }

    if (!navigator.geolocation) {
      setCheckInError("Geolocation is not supported by your browser");
      setIsCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const pswLat = position.coords.latitude;
        const pswLng = position.coords.longitude;
        
        // Get client location from postal code
        const clientCoords = getCoordinatesFromPostalCode(shift.postalCode);
        
        if (!clientCoords) {
          setCheckInError("Unable to verify client location. Please contact the office.");
          setIsCheckingIn(false);
          return;
        }

        const proximityCheck = isPSWWithinCheckInProximity(pswLat, pswLng, clientCoords.lat, clientCoords.lng);

        if (!proximityCheck.withinProximity) {
          setCheckInError(proximityCheck.message);
          setIsCheckingIn(false);
          return;
        }

        const updated = checkInToShift(shift.id, { lat: pswLat, lng: pswLng });
        if (updated) {
          setShift(updated);
          toast.success("Checked in - Location verified");
        }
        setIsCheckingIn(false);
      },
      (error) => {
        let errorMessage = "You must be at the client's location to check in. ";
        if (error.code === error.PERMISSION_DENIED) {
          errorMessage += "Please enable location access in your browser settings.";
        } else {
          errorMessage += "If you are having GPS issues, contact the office.";
        }
        setCheckInError(errorMessage);
        setIsCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleEndShift = () => {
    setShowCareSheet(true);
  };

  const handleSubmitCareSheet = async (careSheet: CareSheetData) => {
    setIsSubmitting(true);

    // Use a mock email for demo
    const orderingClientEmail = "client@example.com";
    
    const completed = signOutFromShift(shift.id, careSheet, orderingClientEmail);
    
    if (completed) {
      setShift(completed);
      
      // Send care sheet email to client
      await sendCareSheetReportEmail(
        orderingClientEmail,
        completed.clientName,
        careSheet.pswFirstName,
        completed.scheduledDate,
        careSheet.tasksCompleted,
        careSheet.observations,
        OFFICE_PHONE_NUMBER
      );
      
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

        {/* Client Card */}
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-foreground">{shift.clientFirstName}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <MapPin className="w-4 h-4" />
                  <span>{shift.patientAddress}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
          onClick={launchNavigation}
        >
          <Navigation className="w-5 h-5 mr-2 text-primary" />
          Launch Navigation
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
                GPS will verify you're within {PSW_CHECKIN_PROXIMITY_METERS}m of the client
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
        </>
      ) : (
        <PSWCareSheet
          services={shift.services}
          pswFirstName={pswFirstName}
          onSubmit={handleSubmitCareSheet}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
};
