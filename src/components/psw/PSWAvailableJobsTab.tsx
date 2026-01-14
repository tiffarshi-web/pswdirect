import { useState, useEffect, useMemo } from "react";
import { Clock, MapPin, User, ChevronRight, Calendar, Briefcase, Globe, AlertTriangle, DollarSign } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClaimShiftDialog } from "./ClaimShiftDialog";
import { 
  getAvailableShifts, 
  claimShift, 
  initializeDemoShifts,
  type ShiftRecord 
} from "@/lib/shiftStore";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getPSWLanguages, 
  getLanguageName, 
  shouldOpenToAllPSWs,
  pswMatchesClientLanguages 
} from "@/lib/languageConfig";
import { isPSWApproved, initializePSWProfiles } from "@/lib/pswProfileStore";

// Hourly rate for estimate
const HOURLY_RATE = 25;
const PSW_RADIUS_KM = 75;

export const PSWAvailableJobsTab = () => {
  const { user } = useAuth();
  const [availableShifts, setAvailableShifts] = useState<ShiftRecord[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);

  // Get current PSW's languages
  const pswLanguages = useMemo(() => {
    if (!user?.id) return ["en"];
    return getPSWLanguages(user.id);
  }, [user?.id]);

  // Check if PSW is approved
  const isApproved = useMemo(() => {
    if (!user?.id) return false;
    initializePSWProfiles();
    return isPSWApproved(user.id);
  }, [user?.id]);

  // Load available shifts
  useEffect(() => {
    initializeDemoShifts();
    loadShifts();
    // Refresh every 30 seconds
    const interval = setInterval(loadShifts, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadShifts = () => {
    const shifts = getAvailableShifts();
    setAvailableShifts(shifts);
  };

  // Calculate estimated pay for a shift
  const calculateEstimatedPay = (shift: ShiftRecord): number => {
    const [startH, startM] = shift.scheduledStart.split(":").map(Number);
    const [endH, endM] = shift.scheduledEnd.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const hoursWorked = (endMinutes - startMinutes) / 60;
    return Math.round(hoursWorked * HOURLY_RATE * 100) / 100;
  };

  // If PSW is not approved, show message
  if (!isApproved) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Available Jobs</h2>
          <p className="text-sm text-muted-foreground mt-1">Jobs within {PSW_RADIUS_KM}km of your location</p>
        </div>
        
        <Card className="shadow-card border-amber-200 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-amber-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-amber-800 dark:text-amber-200 mb-2">
              Pending Approval
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Your application is being reviewed. You will be able to see and accept jobs once approved.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if a shift matches PSW's language
  const isLanguageMatch = (shift: ShiftRecord): boolean => {
    if (!shift.preferredLanguages || shift.preferredLanguages.length === 0) return false;
    return pswMatchesClientLanguages(user?.id || "", shift.preferredLanguages);
  };

  // Check if shift should be visible to this PSW
  const isShiftVisibleToPSW = (shift: ShiftRecord): boolean => {
    // No language preference = visible to all
    if (!shift.preferredLanguages || shift.preferredLanguages.length === 0) return true;
    
    // If PSW matches language = always visible
    if (isLanguageMatch(shift)) return true;
    
    // If 2 hours passed = visible to all
    if (shouldOpenToAllPSWs(shift.bookingId)) return true;
    
    return false;
  };

  // Filter shifts that should be visible to this PSW
  const visibleShifts = useMemo(() => {
    return availableShifts.filter(isShiftVisibleToPSW);
  }, [availableShifts, pswLanguages]);

  const handleClaimClick = (shift: ShiftRecord) => {
    setSelectedShift(shift);
    setShowClaimDialog(true);
  };

  const handleConfirmClaim = () => {
    if (!selectedShift || !user) return;

    const claimed = claimShift(
      selectedShift.id, 
      user.id || "psw-001", 
      user.name || "PSW User"
    );

    if (claimed) {
      toast.success("Job accepted!", {
        description: `${selectedShift.clientFirstName}'s full address is now visible in your schedule.`,
      });
      loadShifts();
    } else {
      toast.error("Failed to accept job. It may have been claimed by someone else.");
    }

    setShowClaimDialog(false);
    setSelectedShift(null);
  };

  // Get general location (city only) from address
  const getGeneralLocation = (address: string): string => {
    const parts = address.split(",");
    if (parts.length >= 2) {
      return parts[parts.length - 2].trim();
    }
    return "Area within radius";
  };

  if (visibleShifts.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Available Jobs</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Jobs within {PSW_RADIUS_KM}km of your location
          </p>
        </div>
        
        <div className="text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Briefcase className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">No Available Jobs</h3>
          <p className="text-muted-foreground">Check back later for new opportunities</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Available Jobs</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {visibleShifts.length} job{visibleShifts.length !== 1 ? "s" : ""} within {PSW_RADIUS_KM}km
        </p>
      </div>

      <div className="space-y-3">
        {visibleShifts.map((shift) => {
          const hasLanguageMatch = isLanguageMatch(shift);
          const hasLanguagePreference = shift.preferredLanguages && shift.preferredLanguages.length > 0;
          const estimatedPay = calculateEstimatedPay(shift);
          const generalLocation = getGeneralLocation(shift.patientAddress);
          
          return (
            <Card key={shift.id} className={`shadow-card ${hasLanguageMatch ? "ring-2 ring-primary/50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      {/* Only show first name before claim - client last name masked */}
                      <h3 className="font-medium text-foreground">{shift.clientFirstName}</h3>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        <span>{shift.scheduledDate}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 items-end">
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      Available
                    </Badge>
                    {hasLanguageMatch && (
                      <Badge className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        Language Match
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm mb-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{shift.scheduledStart} - {shift.scheduledEnd}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {/* Only show general location before claim */}
                    <span>{generalLocation}</span>
                    <span className="text-xs italic">(full address after accepting)</span>
                  </div>
                  {hasLanguagePreference && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>
                        Preferred: {shift.preferredLanguages?.map(getLanguageName).join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <DollarSign className="w-4 h-4" />
                    <span>Est. ${estimatedPay.toFixed(2)}</span>
                  </div>
                </div>

                {/* Services */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {shift.services.map((service, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {service}
                    </Badge>
                  ))}
                </div>

                <Button 
                  variant="brand" 
                  className="w-full"
                  onClick={() => handleClaimClick(shift)}
                >
                  Accept Job
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Claim Dialog */}
      <ClaimShiftDialog
        isOpen={showClaimDialog}
        onClose={() => {
          setShowClaimDialog(false);
          setSelectedShift(null);
        }}
        onConfirm={handleConfirmClaim}
        shiftDetails={selectedShift ? {
          clientName: selectedShift.clientFirstName,
          date: selectedShift.scheduledDate,
          time: `${selectedShift.scheduledStart} - ${selectedShift.scheduledEnd}`,
        } : undefined}
      />
    </div>
  );
};