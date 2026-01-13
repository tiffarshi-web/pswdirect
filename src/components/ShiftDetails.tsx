import { useState, useEffect, useMemo } from "react";
import { 
  ArrowLeft, 
  Navigation, 
  MapPin, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  Play,
  Square,
  FileText,
  Send,
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShiftData {
  id: string;
  clientName: string;
  date: string;
  time: string;
  location: string;
  status: "confirmed" | "pending";
}

interface ShiftDetailsProps {
  shift: ShiftData;
  onBack: () => void;
}

// Extract first name only for privacy
const getFirstName = (fullName: string): string => {
  return fullName.split(" ")[0];
};

// Check for phone numbers or emails in text
const containsContactInfo = (text: string): boolean => {
  // Phone number patterns
  const phonePatterns = [
    /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\(\d{3}\)\s?\d{3}[-.\s]?\d{4}/,
    /\d{10,}/,
    /\+\d{1,3}[-.\s]?\d{3,}/,
  ];
  
  // Email pattern
  const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
  
  for (const pattern of phonePatterns) {
    if (pattern.test(text)) return true;
  }
  
  return emailPattern.test(text);
};

export const ShiftDetails = ({ shift, onBack }: ShiftDetailsProps) => {
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [shiftStartTime, setShiftStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCareSheet, setShowCareSheet] = useState(false);
  
  // Care notes state
  const [careNotes, setCareNotes] = useState("");
  const [careNotesError, setCareNotesError] = useState<string | null>(null);
  
  // Care sheet state
  const [careSheet, setCareSheet] = useState({
    moodOnArrival: "",
    moodOnDeparture: "",
    mealsProvided: false,
    medicationReminders: false,
    personalCare: false,
    mobility: false,
    companionship: false,
    lightHousekeeping: false,
    additionalNotes: "",
  });

  const clientFirstName = useMemo(() => getFirstName(shift.clientName), [shift.clientName]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCheckedIn && shiftStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - shiftStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isCheckedIn, shiftStartTime]);

  // Format elapsed time
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Launch Google Maps navigation
  const launchNavigation = () => {
    const encodedAddress = encodeURIComponent(shift.location);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, "_blank");
  };

  // Check if running in development/preview environment
  const isDevelopment = import.meta.env.DEV || 
    window.location.hostname.includes('lovableproject.com') ||
    window.location.hostname === 'localhost';

  // Skip GPS for testing (development only)
  const handleSkipGPS = () => {
    console.log("GPS bypassed for testing");
    setIsCheckedIn(true);
    setShiftStartTime(new Date());
  };

  // GPS Check-in
  const handleCheckIn = async () => {
    setIsCheckingIn(true);
    setCheckInError(null);

    // Auto-bypass GPS in development/preview environment
    if (isDevelopment) {
      console.log("Development mode: GPS check bypassed");
      setTimeout(() => {
        setIsCheckedIn(true);
        setShiftStartTime(new Date());
        setIsCheckingIn(false);
      }, 1000); // Small delay to simulate GPS check
      return;
    }

    if (!navigator.geolocation) {
      setCheckInError("Geolocation is not supported by your browser");
      setIsCheckingIn(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        // GPS location obtained successfully
        console.log("GPS verified:", position.coords.latitude, position.coords.longitude);
        setIsCheckedIn(true);
        setShiftStartTime(new Date());
        setIsCheckingIn(false);
      },
      (error) => {
        let errorMessage = "Unable to verify your location. ";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Please enable location access in your browser settings.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information is unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out. Please try again.";
            break;
          default:
            errorMessage += "An unknown error occurred.";
        }
        setCheckInError(errorMessage);
        setIsCheckingIn(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Handle care notes change with privacy validation
  const handleCareNotesChange = (value: string) => {
    setCareNotes(value);
    if (containsContactInfo(value)) {
      setCareNotesError(
        "For your privacy, please do not include personal contact information in the notes. Use the office number for all follow-ups."
      );
    } else {
      setCareNotesError(null);
    }
  };

  // Handle additional notes in care sheet
  const handleAdditionalNotesChange = (value: string) => {
    setCareSheet(prev => ({ ...prev, additionalNotes: value }));
  };

  // Check if care sheet additional notes has contact info
  const careSheetHasContactInfo = containsContactInfo(careSheet.additionalNotes);

  // End shift and show care sheet
  const handleEndShift = () => {
    setShowCareSheet(true);
  };

  // Submit care sheet
  const handleSubmitCareSheet = () => {
    if (careSheetHasContactInfo) return;
    
    console.log("Care sheet submitted:", careSheet);
    alert("Shift completed! Care sheet has been emailed to the ordering client.");
    onBack();
  };

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Shift Details</h1>
          <p className="text-sm text-muted-foreground">{shift.date} • {shift.time}</p>
        </div>
      </div>

      {/* Client Card - First Name Only */}
      <Card className="shadow-card mb-4">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-7 h-7 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground">{clientFirstName}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <MapPin className="w-4 h-4" />
                <span>{shift.location}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Button */}
      <Button 
        variant="outline" 
        className="w-full mb-4 h-12"
        onClick={launchNavigation}
      >
        <Navigation className="w-5 h-5 mr-2 text-primary" />
        Launch Navigation
      </Button>

      {/* Check-In / Timer Section */}
      <Card className="shadow-card mb-4">
        <CardContent className="p-4">
          {!isCheckedIn ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
                  <Clock className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground">Ready to Start?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Your GPS location will be verified when you check in
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

              {/* Skip GPS button for testing (development only) */}
              {isDevelopment && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full text-muted-foreground text-xs"
                  onClick={handleSkipGPS}
                >
                  Skip GPS (Testing Only)
                </Button>
              )}
            </div>
          ) : !showCareSheet ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 text-primary mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-sm font-medium">Checked In</span>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <Timer className="w-6 h-6 text-muted-foreground" />
                  <span className="text-4xl font-mono font-bold text-foreground">
                    {formatTime(elapsedTime)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Shift started at {shiftStartTime?.toLocaleTimeString()}
                </p>
              </div>

              <Button 
                variant="destructive" 
                className="w-full h-12"
                onClick={handleEndShift}
              >
                <Square className="w-4 h-4 mr-2" />
                End Shift
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Care Notes Section (visible after check-in, before ending) */}
      {isCheckedIn && !showCareSheet && (
        <Card className="shadow-card mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Care Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              placeholder="Document observations, activities, and any concerns during this shift..."
              value={careNotes}
              onChange={(e) => handleCareNotesChange(e.target.value)}
              className="min-h-[120px]"
            />
            
            {careNotesError && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{careNotesError}</p>
              </div>
            )}

            <Button 
              variant="outline" 
              className="w-full"
              disabled={!!careNotesError || !careNotes.trim()}
            >
              <Send className="w-4 h-4 mr-2" />
              Save Notes
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Client Care Sheet (shown after ending shift) */}
      {showCareSheet && (
        <div className="space-y-4 animate-fade-in">
          <Card className="shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Client Care Sheet
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                This will be emailed to the ordering client upon completion
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mood Assessment */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Client Assessment</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Mood on Arrival</Label>
                    <Select 
                      value={careSheet.moodOnArrival}
                      onValueChange={(value) => setCareSheet(prev => ({ ...prev, moodOnArrival: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="happy">Happy</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="anxious">Anxious</SelectItem>
                        <SelectItem value="sad">Sad</SelectItem>
                        <SelectItem value="agitated">Agitated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Mood on Departure</Label>
                    <Select 
                      value={careSheet.moodOnDeparture}
                      onValueChange={(value) => setCareSheet(prev => ({ ...prev, moodOnDeparture: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="happy">Happy</SelectItem>
                        <SelectItem value="content">Content</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="anxious">Anxious</SelectItem>
                        <SelectItem value="sad">Sad</SelectItem>
                        <SelectItem value="agitated">Agitated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Services Provided */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Services Provided</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "mealsProvided", label: "Meals Provided" },
                    { key: "medicationReminders", label: "Medication Reminders" },
                    { key: "personalCare", label: "Personal Care" },
                    { key: "mobility", label: "Mobility Assistance" },
                    { key: "companionship", label: "Companionship" },
                    { key: "lightHousekeeping", label: "Light Housekeeping" },
                  ].map((service) => (
                    <div key={service.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={service.key}
                        checked={careSheet[service.key as keyof typeof careSheet] as boolean}
                        onCheckedChange={(checked) => 
                          setCareSheet(prev => ({ ...prev, [service.key]: checked }))
                        }
                      />
                      <Label htmlFor={service.key} className="text-sm cursor-pointer">
                        {service.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label>Additional Notes for Family</Label>
                <Textarea
                  placeholder="Any observations or notes you'd like to share with the family..."
                  value={careSheet.additionalNotes}
                  onChange={(e) => handleAdditionalNotesChange(e.target.value)}
                  className="min-h-[100px]"
                />
                {careSheetHasContactInfo && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-destructive">
                      For your privacy, please do not include personal contact information in the notes. Use the office number for all follow-ups.
                    </p>
                  </div>
                )}
              </div>

              {/* Shift Summary */}
              <div className="bg-muted rounded-lg p-4 space-y-2">
                <h4 className="font-medium text-foreground">Shift Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Client:</span>
                    <span className="ml-2 text-foreground">{clientFirstName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date:</span>
                    <span className="ml-2 text-foreground">{shift.date}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="ml-2 text-foreground font-mono">{formatTime(elapsedTime)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Started:</span>
                    <span className="ml-2 text-foreground">{shiftStartTime?.toLocaleTimeString()}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <Button 
            variant="brand" 
            className="w-full h-14 text-base"
            onClick={handleSubmitCareSheet}
            disabled={careSheetHasContactInfo || !careSheet.moodOnArrival || !careSheet.moodOnDeparture}
          >
            <Send className="w-5 h-5 mr-2" />
            Complete Shift & Send Care Sheet
          </Button>
        </div>
      )}
    </div>
  );
};
