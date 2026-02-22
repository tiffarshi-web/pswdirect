import { useState, useEffect, useMemo } from "react";
import { Clock, MapPin, User, ChevronRight, Calendar, Briefcase, Globe, AlertTriangle, DollarSign, Navigation } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ClaimShiftDialog } from "./ClaimShiftDialog";
import { 
  getAvailableShifts, 
  claimShift, 
  initializeDemoShifts,
  syncBookingsToShifts,
  hasActiveShifts,
  type ShiftRecord 
} from "@/lib/shiftStore";
import { getBookings } from "@/lib/bookingStore";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getPSWLanguages, 
  getLanguageName, 
  shouldOpenToAllPSWs,
  pswMatchesClientLanguages 
} from "@/lib/languageConfig";
import { getPSWProfileByIdFromDB, type PSWProfile } from "@/lib/pswDatabaseStore";
import { calculateDistanceBetweenPostalCodes } from "@/lib/postalCodeUtils";
import { getApplicableSurgeZone, getPricing } from "@/lib/businessConfig";

// PSW base hourly rate
const BASE_PSW_RATE = 25;
const PSW_RADIUS_KM = 75;

export const PSWAvailableJobsTab = () => {
  const { user } = useAuth();
  const [availableShifts, setAvailableShifts] = useState<ShiftRecord[]>([]);
  const [selectedShift, setSelectedShift] = useState<ShiftRecord | null>(null);
  const [showClaimDialog, setShowClaimDialog] = useState(false);
  const [pswProfile, setPswProfile] = useState<PSWProfile | null>(null);
  const [isApproved, setIsApproved] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Fetch PSW profile from database
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

  // Load available shifts and sync bookings
  useEffect(() => {
    initializeDemoShifts();
    // Sync any bookings that don't have corresponding shifts
    syncBookingsToShifts(getBookings());
    loadShifts();
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      syncBookingsToShifts(getBookings());
      loadShifts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadShifts = () => {
    const shifts = getAvailableShifts();
    setAvailableShifts(shifts);
  };

  // Calculate PSW payout including urban bonus
  const calculatePSWPayout = (shift: ShiftRecord): { 
    basePay: number; 
    urbanBonus: number; 
    flatBonus: number;
    total: number; 
    hasUrbanBonus: boolean;
  } => {
    const [startH, startM] = shift.scheduledStart.split(":").map(Number);
    const [endH, endM] = shift.scheduledEnd.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const hoursWorked = (endMinutes - startMinutes) / 60;
    
    const basePay = hoursWorked * BASE_PSW_RATE;
    
    // Check for urban bonus
    const surgeZone = getApplicableSurgeZone(undefined, shift.postalCode);
    const hourlyBonus = surgeZone ? surgeZone.pswBonus * hoursWorked : 0;
    const flatBonus = surgeZone ? (surgeZone.pswFlatBonus || 0) : 0;
    
    return { 
      basePay, 
      urbanBonus: hourlyBonus, 
      flatBonus,
      total: basePay + hourlyBonus + flatBonus,
      hasUrbanBonus: !!surgeZone,
    };
  };

  // Calculate distance from PSW home to job
  const getDistanceToJob = (shift: ShiftRecord): number | null => {
    if (!pswProfile?.homePostalCode) return null;
    return calculateDistanceBetweenPostalCodes(pswProfile.homePostalCode, shift.postalCode);
  };

  // Filtering helper functions
  const isLanguageMatch = (shift: ShiftRecord): boolean => {
    if (!shift.preferredLanguages || shift.preferredLanguages.length === 0) return false;
    return pswMatchesClientLanguages(user?.id || "", shift.preferredLanguages);
  };

  const isWithinRadius = (shift: ShiftRecord): boolean => {
    if (!pswProfile?.homePostalCode) return true;
    const distance = getDistanceToJob(shift);
    if (distance === null) return true;
    return distance <= PSW_RADIUS_KM;
  };

  const isGenderMatch = (shift: ShiftRecord): boolean => {
    if (!shift.preferredGender || shift.preferredGender === "no-preference") return true;
    if (!pswProfile?.gender || pswProfile.gender === "prefer-not-to-say" || pswProfile.gender === "other") {
      return false;
    }
    return pswProfile.gender === shift.preferredGender;
  };

  const isShiftVisibleToPSW = (shift: ShiftRecord): boolean => {
    if (!isWithinRadius(shift)) return false;
    if (!isGenderMatch(shift)) return false;
    if (!shift.preferredLanguages || shift.preferredLanguages.length === 0) return true;
    if (isLanguageMatch(shift)) return true;
    if (shouldOpenToAllPSWs(shift.bookingId)) return true;
    return false;
  };

  // Filter shifts - this useMemo MUST be before any early returns
  const visibleShifts = useMemo(() => {
    if (!isApproved) return [];
    return availableShifts.filter(isShiftVisibleToPSW);
  }, [availableShifts, pswLanguages, pswProfile?.homePostalCode, isApproved]);

  const handleClaimClick = (shift: ShiftRecord) => {
    setSelectedShift(shift);
    setShowClaimDialog(true);
  };

  const handleConfirmClaim = () => {
    if (!selectedShift || !user) return;

    const pswId = user.id || "psw-001";
    console.log("PSWAvailableJobsTab - Claiming shift with PSW ID:", pswId);

    // Check if PSW has any active (checked-in) shifts
    if (hasActiveShifts(pswId)) {
      toast.error("Complete your active shift first", {
        description: "You must complete your current shift and submit the care sheet before accepting a new job.",
      });
      setShowClaimDialog(false);
      setSelectedShift(null);
      return;
    }

    // Get PSW photo and vehicle details from profile
    const pswPhotoUrl = pswProfile?.profilePhotoUrl;
    const pswVehiclePhotoUrl = pswProfile?.vehiclePhotoUrl;
    const pswLicensePlate = pswProfile?.licensePlate;

    const claimed = claimShift(
      selectedShift.id, 
      pswId, 
      user.name || "PSW User",
      pswPhotoUrl,
      pswVehiclePhotoUrl,
      pswLicensePlate
    );

    if (claimed) {
      console.log("PSWAvailableJobsTab - Shift claimed successfully:", selectedShift.id);

      toast.success("Job accepted!", {
        description: `${selectedShift.clientFirstName}'s full address and phone number are now visible in your schedule.`,
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

  // Loading state
  if (isLoadingProfile) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Available Jobs</h2>
          <p className="text-sm text-muted-foreground mt-1">Loading...</p>
        </div>
      </div>
    );
  }

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
          {!pswProfile?.homePostalCode && (
            <p className="text-xs text-amber-600 mt-2">
              Set your home address in Profile to see distance-filtered jobs
            </p>
          )}
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
          const payout = calculatePSWPayout(shift);
          const generalLocation = getGeneralLocation(shift.patientAddress);
          const distance = getDistanceToJob(shift);
          
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
                    {distance !== null && (
                      <Badge variant="outline" className="text-xs ml-1">
                        <Navigation className="w-3 h-3 mr-1" />
                        {Math.round(distance)}km
                      </Badge>
                    )}
                  </div>
                  {hasLanguagePreference && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <span>
                        Preferred: {shift.preferredLanguages?.map(getLanguageName).join(", ")}
                      </span>
                    </div>
                  )}
                  
                  {/* PSW Payout with Urban Bonus */}
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <DollarSign className="w-4 h-4" />
                    <span>Est. ${payout.total.toFixed(2)}</span>
                    {payout.hasUrbanBonus && (
                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                        +${(payout.urbanBonus + payout.flatBonus).toFixed(0)} Urban Bonus
                      </Badge>
                    )}
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
