import { useState, useEffect, useRef } from "react";
import { 
  User, AlertTriangle, LogOut, FileText, Clock, MapPin, Save, Users, 
  Phone, Mail, Car, Globe, Award, Shield, Camera, Upload, Calendar,
  AlertCircle, CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getPSWProfile, 
  updatePSWHomeLocation,
  updatePSWHomeLocationWithRevetting,
  updatePSWGender, 
  updatePSWTransport,
  updatePSWContact,
  updatePSWLanguages,
  updatePSWCertifications,
  updatePSWPhoto,
  updatePSWPoliceCheck,
  checkAndExpirePoliceChecks,
  isPoliceCheckExpired,
  getDaysUntilPoliceCheckExpires,
  fileToDataUrl,
  type PSWGender,
  type PSWProfile,
  type VehicleDisclaimerAcceptance
} from "@/lib/pswProfileStore";
import { isValidCanadianPostalCode, formatPostalCode } from "@/lib/postalCodeUtils";
import { LanguageSelector } from "@/components/LanguageSelector";
import { RevettingWarningModal } from "./RevettingWarningModal";
import { VehicleDisclaimerModal, VEHICLE_DISCLAIMER_VERSION } from "./VehicleDisclaimerModal";

export const PSWProfileTab = () => {
  const { user, logout } = useAuth();
  const firstName = user?.firstName || "Worker";
  
  // Profile data state
  const [profile, setProfile] = useState<PSWProfile | null>(null);
  const [homePostalCode, setHomePostalCode] = useState("");
  const [homeCity, setHomeCity] = useState("");
  const [gender, setGender] = useState<PSWGender | "">("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [languages, setLanguages] = useState<string[]>([]);
  const [certifications, setCertifications] = useState("");
  const [hasOwnTransport, setHasOwnTransport] = useState("");
  const [licensePlate, setLicensePlate] = useState("");
  
  // Editing states
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [isEditingGender, setIsEditingGender] = useState(false);
  const [isEditingContact, setIsEditingContact] = useState(false);
  const [isEditingLanguages, setIsEditingLanguages] = useState(false);
  const [isEditingCertifications, setIsEditingCertifications] = useState(false);
  const [isEditingTransport, setIsEditingTransport] = useState(false);
  
  // Modal states
  const [showRevettingWarning, setShowRevettingWarning] = useState(false);
  const [revettingFieldType, setRevettingFieldType] = useState<"policeCheck" | "address">("address");
  const [showVehicleDisclaimer, setShowVehicleDisclaimer] = useState(false);
  const [pendingTransportValue, setPendingTransportValue] = useState("");
  
  // File upload refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const policeCheckInputRef = useRef<HTMLInputElement>(null);
  
  // Police check state
  const [policeCheckDate, setPoliceCheckDate] = useState("");
  const [pendingPoliceCheck, setPendingPoliceCheck] = useState<{ url: string; name: string } | null>(null);

  // Check for expired police checks and load profile
  useEffect(() => {
    checkAndExpirePoliceChecks();
    
    if (user?.id) {
      const loadedProfile = getPSWProfile(user.id);
      if (loadedProfile) {
        setProfile(loadedProfile);
        setHomePostalCode(loadedProfile.homePostalCode || "");
        setHomeCity(loadedProfile.homeCity || "");
        setGender(loadedProfile.gender || "");
        setPhone(loadedProfile.phone || "");
        setEmail(loadedProfile.email || "");
        setLanguages(loadedProfile.languages || []);
        setCertifications(loadedProfile.certifications || "");
        setHasOwnTransport(loadedProfile.hasOwnTransport || "");
        setLicensePlate(loadedProfile.licensePlate || "");
        setPoliceCheckDate(loadedProfile.policeCheckDate || "");
      }
    }
  }, [user?.id]);

  // Reload profile after updates
  const reloadProfile = () => {
    if (user?.id) {
      const loadedProfile = getPSWProfile(user.id);
      if (loadedProfile) {
        setProfile(loadedProfile);
      }
    }
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }
    
    try {
      const dataUrl = await fileToDataUrl(file);
      const updated = updatePSWPhoto(user.id, dataUrl, file.name);
      if (updated) {
        reloadProfile();
        toast.success("Profile photo updated");
      }
    } catch {
      toast.error("Failed to upload photo");
    }
  };

  // Handle police check upload
  const handlePoliceCheckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a PDF or image file");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be less than 10MB");
      return;
    }
    
    try {
      const dataUrl = await fileToDataUrl(file);
      setPendingPoliceCheck({ url: dataUrl, name: file.name });
      // Show re-vetting warning
      setRevettingFieldType("policeCheck");
      setShowRevettingWarning(true);
    } catch {
      toast.error("Failed to process file");
    }
  };

  // Confirm police check update with re-vetting
  const confirmPoliceCheckUpdate = () => {
    if (!user?.id || !pendingPoliceCheck || !policeCheckDate) {
      toast.error("Please select a date for your police check");
      setShowRevettingWarning(false);
      return;
    }
    
    const updated = updatePSWPoliceCheck(
      user.id,
      pendingPoliceCheck.url,
      pendingPoliceCheck.name,
      policeCheckDate
    );
    
    if (updated) {
      reloadProfile();
      setPendingPoliceCheck(null);
      setShowRevettingWarning(false);
      toast.success("Police check uploaded", {
        description: "Your profile is now pending admin review.",
      });
    } else {
      toast.error("Failed to update police check");
    }
  };

  // Handle address save with re-vetting
  const handleSaveAddressWithRevetting = () => {
    if (!user?.id) return;

    if (homePostalCode && !isValidCanadianPostalCode(homePostalCode)) {
      toast.error("Invalid postal code", {
        description: "Please enter a valid Canadian postal code (e.g., M5V 1J9)",
      });
      return;
    }

    const formattedPostal = homePostalCode ? formatPostalCode(homePostalCode) : "";
    
    // Check if this is a first-time address or an update
    const hadPreviousAddress = profile?.homePostalCode;
    
    if (hadPreviousAddress) {
      // Show re-vetting warning for address changes
      setRevettingFieldType("address");
      setShowRevettingWarning(true);
    } else {
      // First time setting address - no re-vetting needed
      const updated = updatePSWHomeLocation(user.id, formattedPostal, homeCity || undefined);
      if (updated) {
        setHomePostalCode(formattedPostal);
        setIsEditingAddress(false);
        reloadProfile();
        toast.success("Home address saved");
      }
    }
  };

  // Confirm address update with re-vetting
  const confirmAddressUpdate = () => {
    if (!user?.id) return;
    
    const formattedPostal = homePostalCode ? formatPostalCode(homePostalCode) : "";
    
    const updated = updatePSWHomeLocationWithRevetting(user.id, formattedPostal, homeCity || undefined);
    
    if (updated) {
      setHomePostalCode(formattedPostal);
      setIsEditingAddress(false);
      setShowRevettingWarning(false);
      reloadProfile();
      toast.success("Address updated", {
        description: "Your profile is now pending admin review.",
      });
    } else {
      toast.error("Failed to update address");
    }
  };

  const handleSaveGender = () => {
    if (!user?.id || !gender) return;

    const updated = updatePSWGender(user.id, gender as PSWGender);
    
    if (updated) {
      setIsEditingGender(false);
      reloadProfile();
      toast.success("Gender preference saved");
    } else {
      toast.error("Failed to save gender preference");
    }
  };

  const handleSaveContact = () => {
    if (!user?.id) return;

    if (!phone || !email) {
      toast.error("Please fill in all contact fields");
      return;
    }

    const updated = updatePSWContact(user.id, phone, email);
    
    if (updated) {
      setIsEditingContact(false);
      reloadProfile();
      toast.success("Contact information updated");
    } else {
      toast.error("Failed to update contact information");
    }
  };

  const handleSaveLanguages = () => {
    if (!user?.id) return;

    const updated = updatePSWLanguages(user.id, languages);
    
    if (updated) {
      setIsEditingLanguages(false);
      reloadProfile();
      toast.success("Languages updated");
    } else {
      toast.error("Failed to update languages");
    }
  };

  const handleSaveCertifications = () => {
    if (!user?.id) return;

    const updated = updatePSWCertifications(user.id, certifications);
    
    if (updated) {
      setIsEditingCertifications(false);
      reloadProfile();
      toast.success("Certifications updated");
    } else {
      toast.error("Failed to update certifications");
    }
  };

  const handleTransportChange = (value: string) => {
    if (value === "yes-car" && hasOwnTransport !== "yes-car") {
      // Need to show vehicle disclaimer
      setPendingTransportValue(value);
      setShowVehicleDisclaimer(true);
    } else {
      // No disclaimer needed
      setHasOwnTransport(value);
    }
  };

  const confirmVehicleDisclaimer = () => {
    if (!user?.id) return;
    
    const disclaimer: VehicleDisclaimerAcceptance = {
      accepted: true,
      acceptedAt: new Date().toISOString(),
      disclaimerVersion: VEHICLE_DISCLAIMER_VERSION,
    };
    
    const updated = updatePSWTransport(user.id, pendingTransportValue, licensePlate || undefined, disclaimer);
    
    if (updated) {
      setHasOwnTransport(pendingTransportValue);
      setShowVehicleDisclaimer(false);
      setIsEditingTransport(false);
      reloadProfile();
      toast.success("Transport status updated");
    } else {
      toast.error("Failed to update transport status");
    }
  };

  const handleSaveTransport = () => {
    if (!user?.id) return;

    const updated = updatePSWTransport(user.id, hasOwnTransport, licensePlate || undefined);
    
    if (updated) {
      setIsEditingTransport(false);
      reloadProfile();
      toast.success("Transport status updated");
    } else {
      toast.error("Failed to update transport status");
    }
  };

  const getGenderLabel = (g: PSWGender | ""): string => {
    switch (g) {
      case "female": return "Female";
      case "male": return "Male";
      case "other": return "Other";
      case "prefer-not-to-say": return "Prefer not to say";
      default: return "Not set";
    }
  };

  const getTransportLabel = (t: string): string => {
    switch (t) {
      case "yes-car": return "Own Vehicle";
      case "yes-transit": return "Public Transit";
      case "no": return "No Transportation";
      default: return "Not set";
    }
  };

  // Check if profile is pending due to police check expiry
  const isPendingDueToExpiry = profile?.expiredDueToPoliceCheck && profile?.vettingStatus === "pending";
  const isPending = profile?.vettingStatus === "pending";
  const daysUntilExpiry = profile ? getDaysUntilPoliceCheckExpires(profile) : null;
  const policeCheckExpired = profile ? isPoliceCheckExpired(profile) : false;

  return (
    <div className="space-y-6">
      {/* Pending Status Warning Banner */}
      {isPending && (
        <Card className="border-amber-400 bg-amber-50 dark:bg-amber-950/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-amber-800 dark:text-amber-200">
                  Account Pending - Action Required
                </p>
                {isPendingDueToExpiry ? (
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Your police clearance check has expired. You must upload a new police check to continue claiming shifts.
                  </p>
                ) : (
                  <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                    Your profile is pending admin review. You cannot claim new shifts until approved.
                  </p>
                )}
                <ul className="text-sm text-amber-700 dark:text-amber-300 mt-2 space-y-1 list-disc list-inside">
                  <li>You cannot claim new shifts</li>
                  <li>You can complete already claimed shifts</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Profile Header with Photo */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-20 h-20 cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                {profile?.profilePhotoUrl ? (
                  <AvatarImage src={profile.profilePhotoUrl} alt="Profile" />
                ) : null}
                <AvatarFallback className="bg-primary/10 text-primary text-xl">
                  {firstName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <Button
                variant="outline"
                size="icon"
                className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full"
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera className="w-3 h-3" />
              </Button>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">{profile?.firstName || firstName}</h2>
              <p className="text-sm text-muted-foreground">Personal Support Worker</p>
              {profile?.vettingStatus === "approved" && (
                <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Approved
                </Badge>
              )}
              {profile?.vettingStatus === "pending" && (
                <Badge variant="outline" className="mt-1 bg-amber-50 text-amber-700 border-amber-200">
                  Pending Review
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gender Selection */}
      <Card className={`shadow-card ${!gender ? "ring-2 ring-amber-400" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            Gender
            {!gender && (
              <span className="text-xs text-amber-600 font-normal">(Required for job matching)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingGender ? (
            <div className="space-y-3">
              <Select value={gender} onValueChange={(value) => setGender(value as PSWGender)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select your gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                  <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button onClick={handleSaveGender} className="flex-1" disabled={!gender}>
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingGender(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <p className={`font-medium ${gender ? "text-foreground" : "text-amber-600"}`}>
                {getGenderLabel(gender)}
              </p>
              <Button variant="outline" size="sm" onClick={() => setIsEditingGender(true)}>
                {gender ? "Edit" : "Set"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Police Clearance Check - with expiry warning */}
      <Card className={`shadow-card ${policeCheckExpired ? "ring-2 ring-destructive" : ""}`}>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Police Clearance Check
            {policeCheckExpired && (
              <Badge variant="destructive" className="ml-2">Expired</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {policeCheckExpired && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-sm text-destructive font-medium">
                Your police check has expired. Upload a new one to continue working.
              </p>
            </div>
          )}
          
          {profile?.policeCheckUrl ? (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                <span className="font-medium">{profile.policeCheckName || "Police Check"}</span>
              </div>
              {profile.policeCheckDate && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Issued: {new Date(profile.policeCheckDate).toLocaleDateString()}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4" />
                    <span className={policeCheckExpired ? "text-destructive font-medium" : "text-muted-foreground"}>
                      Expires: {new Date(new Date(profile.policeCheckDate).setFullYear(new Date(profile.policeCheckDate).getFullYear() + 1)).toLocaleDateString()}
                    </span>
                  </div>
                  {!policeCheckExpired && daysUntilExpiry !== null && daysUntilExpiry <= 30 && (
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      Expires in {daysUntilExpiry} days
                    </Badge>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">No police check uploaded</p>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="policeCheckDate">Date of Police Check Issue</Label>
              <Input
                id="policeCheckDate"
                type="date"
                value={policeCheckDate}
                onChange={(e) => setPoliceCheckDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-300">
                ⚠️ Updating your police check will require admin re-approval. Police checks must be renewed yearly.
              </p>
            </div>
            
            <input
              ref={policeCheckInputRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={handlePoliceCheckUpload}
            />
            <Button
              variant="outline"
              className="w-full"
              onClick={() => policeCheckInputRef.current?.click()}
              disabled={!policeCheckDate}
            >
              <Upload className="w-4 h-4 mr-2" />
              {profile?.policeCheckUrl ? "Upload New Check" : "Upload Police Check"}
            </Button>
            {!policeCheckDate && (
              <p className="text-xs text-muted-foreground text-center">
                Please select the issue date before uploading
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Home Address - with re-vetting warning */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="w-4 h-4 text-primary" />
            Home Address
            {profile?.homePostalCode && (
              <span className="text-xs text-amber-600 font-normal">(Changing requires re-approval)</span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingAddress ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code</Label>
                <Input
                  id="postalCode"
                  placeholder="M5V 1J9"
                  value={homePostalCode}
                  onChange={(e) => setHomePostalCode(e.target.value.toUpperCase())}
                  maxLength={7}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City (optional)</Label>
                <Input
                  id="city"
                  placeholder="Toronto"
                  value={homeCity}
                  onChange={(e) => setHomeCity(e.target.value)}
                />
              </div>
              {profile?.homePostalCode && (
                <p className="text-xs text-amber-600">
                  ⚠️ Changing your address will require admin re-approval
                </p>
              )}
              <div className="flex gap-2">
                <Button onClick={handleSaveAddressWithRevetting} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingAddress(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div>
                {homePostalCode ? (
                  <>
                    <p className="font-medium text-foreground">{homePostalCode}</p>
                    {homeCity && <p className="text-sm text-muted-foreground">{homeCity}</p>}
                  </>
                ) : (
                  <p className="text-muted-foreground">No address set</p>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditingAddress(true)}>
                {homePostalCode ? "Edit" : "Add"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Phone className="w-4 h-4 text-primary" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingContact ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(416) 555-1234"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveContact} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingContact(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">{phone || "No phone set"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-muted-foreground" />
                    <span className="text-sm">{email || "No email set"}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditingContact(true)}>
                  Edit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transportation */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            Transportation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingTransport ? (
            <div className="space-y-3">
              <Select value={hasOwnTransport} onValueChange={handleTransportChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select transportation" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes-car">Yes, I have a car</SelectItem>
                  <SelectItem value="yes-transit">Yes, I use public transit</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
              
              {/* License Plate field - only shown when car is selected */}
              {hasOwnTransport === "yes-car" && (
                <div className="space-y-2">
                  <Label htmlFor="licensePlate">License Plate Number</Label>
                  <Input
                    id="licensePlate"
                    placeholder="e.g., ABCD 123"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value.toUpperCase())}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required for hospital/doctor pickup appointments
                  </p>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button onClick={handleSaveTransport} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingTransport(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{getTransportLabel(hasOwnTransport)}</p>
                  {hasOwnTransport === "yes-car" && licensePlate && (
                    <p className="text-sm text-muted-foreground font-mono">
                      License Plate: {licensePlate}
                    </p>
                  )}
                  {hasOwnTransport === "yes-car" && !licensePlate && (
                    <p className="text-xs text-amber-600">
                      No license plate on file - add for transport shifts
                    </p>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsEditingTransport(true)}>
                  Edit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Languages */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            Languages
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingLanguages ? (
            <div className="space-y-3">
              <LanguageSelector
                selectedLanguages={languages}
                onLanguagesChange={setLanguages}
                maxLanguages={5}
                label=""
                description="Select up to 5 languages you speak"
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveLanguages} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingLanguages(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex flex-wrap gap-1">
                {languages.length > 0 ? (
                  languages.map(lang => (
                    <Badge key={lang} variant="secondary">{lang.toUpperCase()}</Badge>
                  ))
                ) : (
                  <span className="text-muted-foreground">No languages set</span>
                )}
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsEditingLanguages(true)}>
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card className="shadow-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            Certifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isEditingCertifications ? (
            <div className="space-y-3">
              <Textarea
                placeholder="e.g., PSW Certificate, First Aid, CPR, Dementia Care Training..."
                value={certifications}
                onChange={(e) => setCertifications(e.target.value)}
                rows={3}
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveCertifications} className="flex-1">
                  <Save className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button variant="outline" onClick={() => setIsEditingCertifications(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <p className="text-sm">{certifications || "No certifications listed"}</p>
              <Button variant="outline" size="sm" onClick={() => setIsEditingCertifications(true)}>
                Edit
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <Clock className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">32</p>
            <p className="text-xs text-muted-foreground">Hours This Week</p>
          </CardContent>
        </Card>
        <Card className="shadow-card">
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 text-primary mx-auto mb-2" />
            <p className="text-2xl font-bold text-foreground">8</p>
            <p className="text-xs text-muted-foreground">Shifts Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Missed Shift Policy */}
      <Card className="shadow-card border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertTriangle className="w-4 h-4" />
            Missed Shift Policy
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ul className="text-sm text-amber-800/90 dark:text-amber-200/90 space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>First missed shift: Written warning</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Second missed shift: Suspension for 1 week</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Third missed shift: Termination of contract</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>24-hour notice required for cancellations</span>
            </li>
          </ul>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
            Emergency situations will be reviewed on a case-by-case basis.
          </p>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Button 
        variant="outline" 
        className="w-full border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={logout}
      >
        <LogOut className="w-4 h-4 mr-2" />
        Sign Out
      </Button>

      {/* Modals */}
      <RevettingWarningModal
        isOpen={showRevettingWarning}
        onClose={() => {
          setShowRevettingWarning(false);
          setPendingPoliceCheck(null);
        }}
        onConfirm={revettingFieldType === "policeCheck" ? confirmPoliceCheckUpdate : confirmAddressUpdate}
        fieldType={revettingFieldType}
      />

      <VehicleDisclaimerModal
        isOpen={showVehicleDisclaimer}
        onClose={() => {
          setShowVehicleDisclaimer(false);
          setPendingTransportValue("");
        }}
        onConfirm={confirmVehicleDisclaimer}
      />
    </div>
  );
};
