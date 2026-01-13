import { useState } from "react";
import { Clock, MapPin, User, CheckCircle2, FileText, Navigation, LogOut as LogOutIcon, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  isPSWWithinCheckInProximity, 
  getCoordinatesFromPostalCode,
  PSW_CHECKIN_PROXIMITY_METERS 
} from "@/lib/postalCodeUtils";

interface ActiveShift {
  id: string;
  clientName: string;
  startTime: string;
  scheduledEnd: string;
  location: string;
  postalCode: string;
  services: string[];
  status: "not-started" | "checked-in" | "in-progress" | "completed";
  checkInTime?: string;
}

// Mock active shift data
const mockActiveShift: ActiveShift = {
  id: "shift-1",
  clientName: "Margaret Thompson",
  startTime: "9:00 AM",
  scheduledEnd: "10:00 AM",
  location: "123 Maple Street, Belleville",
  postalCode: "K8N 2B3",
  services: ["Personal Care", "Meal Prep"],
  status: "not-started",
};

export const ActiveShiftTab = () => {
  const [shift, setShift] = useState<ActiveShift>(mockActiveShift);
  const [careNotes, setCareNotes] = useState("");
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  // Check if running in development/preview environment
  const isDevelopment = import.meta.env.DEV || 
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname === 'localhost';

  const handleCheckIn = () => {
    setIsCheckingIn(true);
    setCheckInError(null);

    // Auto-bypass GPS in development/preview environment
    if (isDevelopment) {
      console.log("Development mode: GPS proximity check bypassed");
      setTimeout(() => {
        const now = new Date().toLocaleTimeString("en-US", { 
          hour: "numeric", 
          minute: "2-digit",
          hour12: true 
        });
        setShift(prev => ({ ...prev, status: "checked-in", checkInTime: now }));
        setIsGpsActive(true);
        setIsCheckingIn(false);
        toast.success(`Checked in at ${now}`);
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

        const now = new Date().toLocaleTimeString("en-US", { 
          hour: "numeric", 
          minute: "2-digit",
          hour12: true 
        });
        
        setShift(prev => ({ ...prev, status: "checked-in", checkInTime: now }));
        setIsGpsActive(true);
        setIsCheckingIn(false);
        toast.success(`Checked in at ${now} - Location verified`);
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

  const handleSignOut = () => {
    if (!careNotes.trim()) {
      toast.error("Please add care notes before signing out");
      return;
    }
    
    setShift(prev => ({ ...prev, status: "completed" }));
    setIsGpsActive(false);
    toast.success("Shift completed successfully!");
  };

  const handleGpsToggle = () => {
    setIsGpsActive(!isGpsActive);
    toast.info(isGpsActive ? "GPS tracking paused" : "GPS tracking resumed");
  };

  if (shift.status === "completed") {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Shift Completed</h2>
          <p className="text-muted-foreground">Great work! Your shift has been submitted.</p>
        </div>
      </div>
    );
  }

  if (shift.status === "not-started") {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Active Shift</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Ready to start your scheduled visit
          </p>
        </div>

        <Card className="shadow-card">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{shift.clientName}</CardTitle>
                <p className="text-sm text-muted-foreground">{shift.startTime} - {shift.scheduledEnd}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{shift.location}</span>
            </div>
            <p className="text-xs text-muted-foreground">Postal Code: {shift.postalCode}</p>
            
            <div className="flex flex-wrap gap-2">
              {shift.services.map((service, i) => (
                <Badge key={i} variant="secondary">{service}</Badge>
              ))}
            </div>

            {checkInError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{checkInError}</p>
              </div>
            )}

            <Button 
              variant="brand" 
              size="lg" 
              className="w-full"
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
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Check In
                </>
              )}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              You must be within {PSW_CHECKIN_PROXIMITY_METERS}m of the client's address
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Checked-in state
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Active Shift</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Currently at {shift.clientName}'s
        </p>
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
              Checked in: {shift.checkInTime}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-foreground">{shift.clientName}</p>
              <p className="text-sm text-muted-foreground">{shift.location}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* GPS Tracking */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isGpsActive ? "bg-primary/10" : "bg-muted"
              }`}>
                <Navigation className={`w-5 h-5 ${isGpsActive ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <div>
                <p className="font-medium text-foreground">GPS Tracking</p>
                <p className="text-sm text-muted-foreground">
                  {isGpsActive ? "Location is being recorded" : "Tracking paused"}
                </p>
              </div>
            </div>
            <Button 
              variant={isGpsActive ? "outline" : "brand"}
              size="sm"
              onClick={handleGpsToggle}
            >
              {isGpsActive ? "Pause" : "Resume"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Care Notes */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Care Notes
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <Textarea
            placeholder="Document the care provided, client condition, and any observations..."
            value={careNotes}
            onChange={(e) => setCareNotes(e.target.value)}
            className="min-h-[120px]"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Required before signing out
          </p>
        </CardContent>
      </Card>

      {/* Sign Out Button */}
      <Button 
        variant="brand" 
        size="lg" 
        className="w-full"
        onClick={handleSignOut}
      >
        <LogOutIcon className="w-5 h-5 mr-2" />
        Sign Out & Complete Shift
      </Button>
    </div>
  );
};
