// Multi-Step PSW Signup Form with Secure Onboarding
// Step 1: Legal Name, Phone, Email, Photo
// Step 2: HSCPOA Number & Police Check
// Step 3: Select up to 5 Languages
// Step 4: Secure Bank Info / E-Transfer Email

import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Heart, CheckCircle, Upload, FileText, Camera, Shield, Award, Globe, CreditCard, Lock, User, Phone, Mail, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import {
  isValidCanadianPostalCode,
  formatPostalCode,
} from "@/lib/postalCodeUtils";
import { LanguageSelector } from "@/components/LanguageSelector";
import { updatePSWLanguages } from "@/lib/languageConfig";
import { savePSWProfile, fileToDataUrl, type PSWGender, type VehicleDisclaimerAcceptance } from "@/lib/pswProfileStore";
import { savePSWBanking } from "@/lib/securityStore";

const VEHICLE_DISCLAIMER_VERSION = "1.0";
const VEHICLE_DISCLAIMER_TEXT = "I understand that if I use my personal vehicle for hospital/doctor pickups or client transport, it is my sole responsibility to maintain valid commercial or 'business use' insurance as per Ontario law. I acknowledge that the platform does not provide auto insurance for private transport.";

const TOTAL_STEPS = 4;

const PSWSignup = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);
  
  // File upload refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const policeCheckInputRef = useRef<HTMLInputElement>(null);
  const voidChequeInputRef = useRef<HTMLInputElement>(null);
  
  // File states
  const [profilePhoto, setProfilePhoto] = useState<{ url: string; name: string } | null>(null);
  const [policeCheck, setPoliceCheck] = useState<{ url: string; name: string } | null>(null);
  const [voidCheque, setVoidCheque] = useState<{ url: string; name: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [policeCheckError, setPoliceCheckError] = useState<string | null>(null);
  const [voidChequeError, setVoidChequeError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    gender: "",
    // Address (optional for display)
    streetAddress: "",
    city: "",
    province: "ON",
    postalCode: "",
    // Step 2: Compliance
    hscpoaNumber: "",
    policeCheckDate: "", // Date the police check was issued
    // Step 3: Languages (handled by selectedLanguages state)
    // Step 4: Banking
    eTransferEmail: "",
    bankInstitution: "",
    bankTransit: "",
    bankAccount: "",
    // Additional info
    yearsExperience: "",
    certifications: "",
    hasOwnTransport: "",
    licensePlate: "",
    availableShifts: "",
  });
  
  // Vehicle disclaimer state
  const [vehicleDisclaimerAccepted, setVehicleDisclaimerAccepted] = useState(false);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "postalCode") {
      setPostalCodeError(null);
    }
  };

  const handlePostalCodeChange = (value: string) => {
    const formatted = formatPostalCode(value);
    updateFormData("postalCode", formatted);
    setPostalCodeError(null);
  };

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please upload an image file (JPG, PNG, etc.)");
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      setPhotoError("Image must be less than 5MB");
      return;
    }
    
    try {
      const dataUrl = await fileToDataUrl(file);
      setProfilePhoto({ url: dataUrl, name: file.name });
      setPhotoError(null);
    } catch {
      setPhotoError("Failed to process image");
    }
  };

  // Handle police check upload
  const handlePoliceCheckUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setPoliceCheckError("Please upload a PDF or image file");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setPoliceCheckError("File must be less than 10MB");
      return;
    }
    
    try {
      const dataUrl = await fileToDataUrl(file);
      setPoliceCheck({ url: dataUrl, name: file.name });
      setPoliceCheckError(null);
    } catch {
      setPoliceCheckError("Failed to process file");
    }
  };

  // Handle void cheque upload
  const handleVoidChequeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setVoidChequeError("Please upload a PDF or image file");
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      setVoidChequeError("File must be less than 10MB");
      return;
    }
    
    try {
      const dataUrl = await fileToDataUrl(file);
      setVoidCheque({ url: dataUrl, name: file.name });
      setVoidChequeError(null);
    } catch {
      setVoidChequeError("Failed to process file");
    }
  };

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.firstName && formData.lastName && formData.email && formData.phone && formData.gender && profilePhoto);
      case 2:
        // If PSW has a car, they must accept the vehicle disclaimer
        if (formData.hasOwnTransport === "yes-car" && !vehicleDisclaimerAccepted) {
          return false;
        }
        return true; // HSCPOA and police check are optional but encouraged
      case 3:
        return selectedLanguages.length > 0;
      case 4:
        return !!(formData.eTransferEmail || (formData.bankInstitution && formData.bankTransit && formData.bankAccount));
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS && canProceedFromStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!profilePhoto) {
      setPhotoError("Profile photo is required");
      toast.error("Please upload a profile photo");
      return;
    }
    
    if (!agreedToPolicy) {
      toast.error("Please agree to the platform policy");
      return;
    }

    setIsLoading(true);
    
    const tempPswId = `PSW-PENDING-${Date.now()}`;
    
    // Save language preferences
    updatePSWLanguages(tempPswId, selectedLanguages);
    
    // Save the PSW profile with compliance data
    savePSWProfile({
      id: tempPswId,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      gender: formData.gender as PSWGender,
      profilePhotoUrl: profilePhoto.url,
      profilePhotoName: profilePhoto.name,
      hscpoaNumber: formData.hscpoaNumber,
      policeCheckUrl: policeCheck?.url,
      policeCheckName: policeCheck?.name,
      policeCheckDate: formData.policeCheckDate || undefined,
      languages: selectedLanguages,
      vettingStatus: "pending",
      appliedAt: new Date().toISOString(),
      yearsExperience: formData.yearsExperience,
      certifications: formData.certifications,
      hasOwnTransport: formData.hasOwnTransport,
      licensePlate: formData.hasOwnTransport === "yes-car" ? formData.licensePlate || undefined : undefined,
      availableShifts: formData.availableShifts,
      vehicleDisclaimer: formData.hasOwnTransport === "yes-car" && vehicleDisclaimerAccepted ? {
        accepted: true,
        acceptedAt: new Date().toISOString(),
        disclaimerVersion: VEHICLE_DISCLAIMER_VERSION,
      } : undefined,
    });
    
    // Save banking info securely (encrypted)
    if (formData.eTransferEmail || formData.bankInstitution) {
      await savePSWBanking(tempPswId, {
        legalName: `${formData.firstName} ${formData.lastName}`,
        eTransferEmail: formData.eTransferEmail,
        institutionNumber: formData.bankInstitution,
        transitNumber: formData.bankTransit,
        accountNumber: formData.bankAccount,
        voidChequeUrl: voidCheque?.url,
      });
    }
    
    // Simulate API call
    setTimeout(() => {
      console.log("PSW Application submitted:", {
        ...formData,
        languages: selectedLanguages,
        tempPswId,
        hasProfilePhoto: !!profilePhoto,
        hasPoliceCheck: !!policeCheck,
        hasBankingInfo: !!(formData.eTransferEmail || formData.bankInstitution),
        status: "pending",
        appliedAt: new Date().toISOString(),
      });
      setIsLoading(false);
      setIsSubmitted(true);
    }, 1500);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
              <span className="font-semibold text-foreground">PSW Direct</span>
            </Link>
          </div>
        </header>

        <main className="px-4 py-12 max-w-md mx-auto">
          <Card className="shadow-card text-center">
            <CardContent className="pt-8 pb-8 space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-amber-600" />
              </div>
              
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Application Received!
                </h1>
                <p className="text-muted-foreground">
                  Thank you for applying, {formData.firstName}.
                </p>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-foreground font-medium mb-2">What happens next?</p>
                <p className="text-sm text-muted-foreground">
                  Your application is being reviewed by our Admin team. 
                  You will be notified via email once you are vetted and activated.
                </p>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>Status:</strong> Pending Review
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  You cannot access the PSW portal until your application is approved.
                </p>
              </div>

              <Button 
                variant="outline" 
                onClick={() => navigate("/")}
                className="w-full"
              >
                Return to Home
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Profile Photo */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Camera className="w-5 h-5 text-primary" />
                  Profile Photo *
                </CardTitle>
                <CardDescription>Upload a clear, professional photo</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24 mb-4 cursor-pointer" onClick={() => photoInputRef.current?.click()}>
                    {profilePhoto ? (
                      <AvatarImage src={profilePhoto.url} alt="Profile preview" />
                    ) : null}
                    <AvatarFallback className="bg-muted">
                      <Camera className="w-8 h-8 text-muted-foreground" />
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={photoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => photoInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {profilePhoto ? "Change Photo" : "Upload Photo"}
                  </Button>
                  {profilePhoto && (
                    <p className="text-xs text-muted-foreground mt-2">{profilePhoto.name}</p>
                  )}
                  {photoError && (
                    <p className="text-xs text-destructive mt-2">{photoError}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Legal First Name *</Label>
                    <Input
                      id="firstName"
                      placeholder="Sarah"
                      value={formData.firstName}
                      onChange={(e) => updateFormData("firstName", e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Legal Last Name *</Label>
                    <Input
                      id="lastName"
                      placeholder="Johnson"
                      value={formData.lastName}
                      onChange={(e) => updateFormData("lastName", e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    Email Address *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="sarah.johnson@email.com"
                    value={formData.email}
                    onChange={(e) => updateFormData("email", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone" className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    Phone Number *
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(613) 555-1234"
                    value={formData.phone}
                    onChange={(e) => updateFormData("phone", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender *</Label>
                  <Select 
                    value={formData.gender}
                    onValueChange={(value) => updateFormData("gender", value)}
                  >
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
                  <p className="text-xs text-muted-foreground">
                    Some clients may request a specific gender for personal care services
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" />
                  HSCPOA Registration
                </CardTitle>
                <CardDescription>Health and Supportive Care Providers Oversight Authority</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hscpoaNumber">HSCPOA Registration Number</Label>
                  <Input
                    id="hscpoaNumber"
                    placeholder="e.g., HSCPOA-2024-12345"
                    value={formData.hscpoaNumber}
                    onChange={(e) => updateFormData("hscpoaNumber", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    If you don't have this yet, you can submit without it
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Police Check
                </CardTitle>
                <CardDescription>Vulnerable Sector Check document</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                  <input
                    ref={policeCheckInputRef}
                    type="file"
                    accept=".pdf,image/*"
                    className="hidden"
                    onChange={handlePoliceCheckUpload}
                  />
                  {policeCheck ? (
                    <div className="space-y-2">
                      <FileText className="w-8 h-8 text-primary mx-auto" />
                      <p className="text-sm text-foreground font-medium">{policeCheck.name}</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => policeCheckInputRef.current?.click()}
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto" />
                      <p className="text-sm text-muted-foreground">
                        Upload your police check document
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => policeCheckInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Select File
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Accepts PDF or image files (max 10MB)
                      </p>
                    </div>
                  )}
                  {policeCheckError && (
                    <p className="text-xs text-destructive mt-2">{policeCheckError}</p>
                  )}
                </div>
                
                {/* Police Check Date */}
                <div className="space-y-2">
                  <Label htmlFor="policeCheckDate">Date of Police Check Issue</Label>
                  <Input
                    id="policeCheckDate"
                    type="date"
                    value={formData.policeCheckDate}
                    onChange={(e) => updateFormData("policeCheckDate", e.target.value)}
                    max={new Date().toISOString().split('T')[0]}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the date your police check was issued. Police checks must be renewed yearly.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Experience */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Experience & Availability</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="yearsExperience">Years of Experience</Label>
                  <Select 
                    value={formData.yearsExperience}
                    onValueChange={(value) => updateFormData("yearsExperience", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select experience level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0-1">Less than 1 year</SelectItem>
                      <SelectItem value="1-3">1-3 years</SelectItem>
                      <SelectItem value="3-5">3-5 years</SelectItem>
                      <SelectItem value="5+">5+ years</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="certifications">Certifications / Credentials</Label>
                  <Textarea
                    id="certifications"
                    placeholder="e.g., PSW Certificate, First Aid, CPR, Dementia Care Training..."
                    value={formData.certifications}
                    onChange={(e) => updateFormData("certifications", e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hasOwnTransport" className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-muted-foreground" />
                    Transportation
                  </Label>
                  <Select 
                    value={formData.hasOwnTransport}
                    onValueChange={(value) => updateFormData("hasOwnTransport", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Do you have transportation?" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes-car">Yes, I have a car</SelectItem>
                      <SelectItem value="yes-transit">Yes, I use public transit</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Vehicle Insurance Disclaimer & License Plate - Only shown if PSW has a car */}
                {formData.hasOwnTransport === "yes-car" && (
                  <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex items-start gap-2">
                        <Shield className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-200">Vehicle Insurance Disclaimer</p>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-2">
                            {VEHICLE_DISCLAIMER_TEXT}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3 p-3 bg-white dark:bg-background rounded-lg border border-amber-200">
                        <Checkbox
                          id="vehicleDisclaimer"
                          checked={vehicleDisclaimerAccepted}
                          onCheckedChange={(checked) => setVehicleDisclaimerAccepted(checked as boolean)}
                        />
                        <Label htmlFor="vehicleDisclaimer" className="text-sm font-medium cursor-pointer">
                          I Accept - I understand and agree to the above terms *
                        </Label>
                      </div>
                      {formData.hasOwnTransport === "yes-car" && !vehicleDisclaimerAccepted && (
                        <p className="text-xs text-destructive">
                          You must accept this disclaimer to continue if you have a vehicle
                        </p>
                      )}
                      
                      {/* License Plate Field */}
                      <div className="space-y-2 pt-2 border-t border-amber-200">
                        <Label htmlFor="licensePlate" className="text-amber-800 dark:text-amber-200">
                          License Plate Number (Optional)
                        </Label>
                        <Input
                          id="licensePlate"
                          placeholder="e.g., ABCD 123"
                          value={formData.licensePlate}
                          onChange={(e) => updateFormData("licensePlate", e.target.value.toUpperCase())}
                          className="font-mono bg-white dark:bg-background"
                        />
                        <p className="text-xs text-amber-700 dark:text-amber-300">
                          Your license plate will be shared with clients for hospital/doctor pickup appointments.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-primary" />
                  Languages Spoken
                </CardTitle>
                <CardDescription>
                  Select up to 5 languages you can communicate in with clients
                </CardDescription>
              </CardHeader>
              <CardContent>
                <LanguageSelector
                  selectedLanguages={selectedLanguages}
                  onLanguagesChange={setSelectedLanguages}
                  maxLanguages={5}
                  label=""
                  description="This helps us match you with clients who prefer your language."
                  placeholder="Add languages you speak..."
                />
              </CardContent>
            </Card>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                <strong>Why languages matter:</strong> We prioritize matching PSWs with clients 
                who share a common language. Speaking multiple languages increases your job opportunities.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  Payroll Information
                </CardTitle>
                <CardDescription>
                  Provide your banking details for secure payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* E-Transfer Email */}
                <div className="space-y-2">
                  <Label htmlFor="eTransferEmail" className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    E-Transfer Email
                  </Label>
                  <Input
                    id="eTransferEmail"
                    type="email"
                    placeholder="your.email@bank.com"
                    value={formData.eTransferEmail}
                    onChange={(e) => updateFormData("eTransferEmail", e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Preferred method for quick payments
                  </p>
                </div>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or provide bank details</span>
                  </div>
                </div>

                {/* Bank Details */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="bankInstitution">Institution #</Label>
                    <Input
                      id="bankInstitution"
                      placeholder="001"
                      value={formData.bankInstitution}
                      onChange={(e) => updateFormData("bankInstitution", e.target.value)}
                      maxLength={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankTransit">Transit #</Label>
                    <Input
                      id="bankTransit"
                      placeholder="12345"
                      value={formData.bankTransit}
                      onChange={(e) => updateFormData("bankTransit", e.target.value)}
                      maxLength={5}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankAccount">Account #</Label>
                    <Input
                      id="bankAccount"
                      placeholder="1234567"
                      value={formData.bankAccount}
                      onChange={(e) => updateFormData("bankAccount", e.target.value)}
                    />
                  </div>
                </div>

                {/* Void Cheque Upload */}
                <div className="space-y-2">
                  <Label>Void Cheque (Optional)</Label>
                  <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                    <input
                      ref={voidChequeInputRef}
                      type="file"
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={handleVoidChequeUpload}
                    />
                    {voidCheque ? (
                      <div className="space-y-2">
                        <FileText className="w-6 h-6 text-primary mx-auto" />
                        <p className="text-sm text-foreground">{voidCheque.name}</p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => voidChequeInputRef.current?.click()}
                        >
                          Change
                        </Button>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => voidChequeInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Void Cheque
                      </Button>
                    )}
                    {voidChequeError && (
                      <p className="text-xs text-destructive mt-2">{voidChequeError}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <Lock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">AES-256 Encryption</p>
                <p className="text-xs text-muted-foreground">
                  Your banking information is encrypted and stored securely for payroll purposes only. 
                  Only authorized admin personnel can access this data.
                </p>
              </div>
            </div>

            {/* Platform Policy */}
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Platform Policy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
                  <p className="font-medium text-foreground">Please read carefully:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>All PSWs must maintain valid certifications</li>
                    <li>Missed shifts without 24-hour notice may result in removal</li>
                    <li>Client confidentiality must be maintained at all times</li>
                    <li>Professional conduct is expected during all interactions</li>
                  </ul>
                </div>

                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreePolicy"
                    checked={agreedToPolicy}
                    onCheckedChange={(checked) => setAgreedToPolicy(checked as boolean)}
                  />
                  <Label htmlFor="agreePolicy" className="text-sm text-muted-foreground cursor-pointer">
                    I understand and agree to the PSW Direct platform policies
                  </Label>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  const getStepTitle = (step: number) => {
    switch (step) {
      case 1: return "Personal Info";
      case 2: return "Credentials";
      case 3: return "Languages";
      case 4: return "Banking & Submit";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => currentStep > 1 ? prevStep() : navigate("/")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <Link to="/" className="flex items-center gap-2">
              <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
            </Link>
          </div>
          <span className="text-sm text-muted-foreground">Step {currentStep} of {TOTAL_STEPS}</span>
        </div>
      </header>

      {/* Progress */}
      <div className="px-4 py-4 max-w-md mx-auto">
        <Progress value={(currentStep / TOTAL_STEPS) * 100} className="h-2" />
        <p className="text-sm font-medium text-foreground mt-2">{getStepTitle(currentStep)}</p>
      </div>

      {/* Main Content */}
      <main className="px-4 pb-32 max-w-md mx-auto">
        {/* Welcome (Step 1 only) */}
        {currentStep === 1 && (
          <div className="text-center mb-6">
            <div className="w-16 h-16 mx-auto rounded-full gradient-brand flex items-center justify-center mb-4">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Join Our Team</h1>
            <p className="text-muted-foreground mt-1">
              Apply to become a PSW Direct care provider
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {renderStepContent()}
        </form>
      </main>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
        <div className="max-w-md mx-auto flex gap-3">
          {currentStep > 1 && (
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {currentStep < TOTAL_STEPS ? (
            <Button
              type="button"
              variant="brand"
              onClick={nextStep}
              disabled={!canProceedFromStep(currentStep)}
              className="flex-1"
            >
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button
              type="submit"
              variant="brand"
              onClick={handleSubmit}
              disabled={isLoading || !agreedToPolicy || !canProceedFromStep(4)}
              className="flex-1"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : (
                "Submit Application"
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PSWSignup;
