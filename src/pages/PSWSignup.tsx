import { useState, useRef } from "react";
import { ArrowLeft, Heart, CheckCircle, Upload, FileText, MapPin, Camera, Shield, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import {
  isValidCanadianPostalCode,
  formatPostalCode,
} from "@/lib/postalCodeUtils";
import { LanguageSelector } from "@/components/LanguageSelector";
import { updatePSWLanguages } from "@/lib/languageConfig";
import { savePSWProfile, fileToDataUrl } from "@/lib/pswProfileStore";

const PSWSignup = () => {
  const navigate = useNavigate();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]); // Default to English
  
  // File upload refs
  const photoInputRef = useRef<HTMLInputElement>(null);
  const policeCheckInputRef = useRef<HTMLInputElement>(null);
  
  // File states
  const [profilePhoto, setProfilePhoto] = useState<{ url: string; name: string } | null>(null);
  const [policeCheck, setPoliceCheck] = useState<{ url: string; name: string } | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [policeCheckError, setPoliceCheckError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    streetAddress: "",
    city: "",
    province: "ON",
    postalCode: "",
    yearsExperience: "",
    certifications: "",
    hasOwnTransport: "",
    availableShifts: "",
    coverLetter: "",
    hscpoaNumber: "",
  });

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
    
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setPhotoError("Please upload an image file (JPG, PNG, etc.)");
      return;
    }
    
    // Validate file size (max 5MB)
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
    
    // Validate file type (PDF or image)
    const validTypes = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      setPoliceCheckError("Please upload a PDF or image file");
      return;
    }
    
    // Validate file size (max 10MB)
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.firstName || !formData.lastName || !formData.email || !formData.phone || !formData.postalCode) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Validate profile photo (mandatory)
    if (!profilePhoto) {
      setPhotoError("Profile photo is required");
      toast.error("Please upload a profile photo");
      return;
    }

    if (!isValidCanadianPostalCode(formData.postalCode)) {
      setPostalCodeError("Please enter a valid Canadian postal code (e.g., K8N 1A1)");
      return;
    }
    
    if (!agreedToPolicy) {
      toast.error("Please agree to the platform policy");
      return;
    }

    setIsLoading(true);
    
    // Generate a temporary PSW ID for the application
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
      profilePhotoUrl: profilePhoto.url,
      profilePhotoName: profilePhoto.name,
      hscpoaNumber: formData.hscpoaNumber,
      policeCheckUrl: policeCheck?.url,
      policeCheckName: policeCheck?.name,
      languages: selectedLanguages,
      vettingStatus: "pending",
      appliedAt: new Date().toISOString(),
      yearsExperience: formData.yearsExperience,
      certifications: formData.certifications,
      hasOwnTransport: formData.hasOwnTransport,
      availableShifts: formData.availableShifts,
    });
    
    // Simulate API call
    setTimeout(() => {
      console.log("PSW Application submitted:", {
        ...formData,
        languages: selectedLanguages,
        tempPswId,
        hasProfilePhoto: !!profilePhoto,
        hasPoliceCheck: !!policeCheck,
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
        {/* Header */}
        <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
          <div className="flex items-center gap-3 px-4 h-16 max-w-md mx-auto">
            <img src={logo} alt="PSW Direct Logo" className="h-10 w-auto" />
            <span className="font-semibold text-foreground">PSW Direct</span>
          </div>
        </header>

        {/* Pending Status */}
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-16 max-w-md mx-auto">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <img src={logo} alt="PSW Direct Logo" className="h-8 w-auto" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 py-6 pb-24 max-w-md mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 mx-auto rounded-full gradient-brand flex items-center justify-center mb-4">
            <Heart className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Join Our Team</h1>
          <p className="text-muted-foreground mt-1">
            Apply to become a PSW Direct care provider
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Profile Photo Upload - Mandatory */}
          <Card className="shadow-card mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />
                Profile Photo *
              </CardTitle>
              <CardDescription>Upload a clear, professional photo of yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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

          <Card className="shadow-card mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Personal Information</CardTitle>
              <CardDescription>Tell us about yourself</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="Sarah"
                    value={formData.firstName}
                    onChange={(e) => updateFormData("firstName", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name *</Label>
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
                <Label htmlFor="email">Email Address *</Label>
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
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(613) 555-1234"
                  value={formData.phone}
                  onChange={(e) => updateFormData("phone", e.target.value)}
                  required
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Card */}
          <Card className="shadow-card mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                Your Address
              </CardTitle>
              <CardDescription>Where are you located?</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address</Label>
                <Input
                  id="streetAddress"
                  placeholder="123 Main Street"
                  value={formData.streetAddress}
                  onChange={(e) => updateFormData("streetAddress", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="Belleville"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Select 
                    value={formData.province}
                    onValueChange={(value) => updateFormData("province", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ON">Ontario</SelectItem>
                      <SelectItem value="QC">Quebec</SelectItem>
                      <SelectItem value="BC">British Columbia</SelectItem>
                      <SelectItem value="AB">Alberta</SelectItem>
                      <SelectItem value="MB">Manitoba</SelectItem>
                      <SelectItem value="SK">Saskatchewan</SelectItem>
                      <SelectItem value="NS">Nova Scotia</SelectItem>
                      <SelectItem value="NB">New Brunswick</SelectItem>
                      <SelectItem value="NL">Newfoundland</SelectItem>
                      <SelectItem value="PE">PEI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="postalCode">Postal Code *</Label>
                <Input
                  id="postalCode"
                  placeholder="K8N 1A1"
                  value={formData.postalCode}
                  onChange={(e) => handlePostalCodeChange(e.target.value)}
                  maxLength={7}
                  required
                  className={postalCodeError ? "border-destructive" : ""}
                />
                {postalCodeError && (
                  <p className="text-xs text-destructive">{postalCodeError}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Experience & Certifications</CardTitle>
              <CardDescription>Help us understand your qualifications</CardDescription>
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
                <Label htmlFor="hasOwnTransport">Do you have your own transportation?</Label>
                <Select 
                  value={formData.hasOwnTransport}
                  onValueChange={(value) => updateFormData("hasOwnTransport", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="yes-car">Yes, I have a car</SelectItem>
                    <SelectItem value="yes-transit">Yes, I use public transit</SelectItem>
                    <SelectItem value="no">No</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableShifts">Availability</Label>
                <Select 
                  value={formData.availableShifts}
                  onValueChange={(value) => updateFormData("availableShifts", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="When are you available?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekdays">Weekdays only</SelectItem>
                    <SelectItem value="weekends">Weekends only</SelectItem>
                    <SelectItem value="flexible">Flexible / Any time</SelectItem>
                    <SelectItem value="evenings">Evenings only</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="coverLetter">Why do you want to join PSW Direct? (Optional)</Label>
                <Textarea
                  id="coverLetter"
                  placeholder="Tell us about your passion for caregiving..."
                  value={formData.coverLetter}
                  onChange={(e) => updateFormData("coverLetter", e.target.value)}
                  rows={4}
                />
              </div>

              {/* Language Selection */}
              <div className="pt-4 border-t border-border">
                <LanguageSelector
                  selectedLanguages={selectedLanguages}
                  onLanguagesChange={setSelectedLanguages}
                  maxLanguages={5}
                  label="Languages Spoken Fluently"
                  description="Select up to 5 languages you can communicate in with clients. This helps us match you with clients who prefer your language."
                  placeholder="Add languages you speak..."
                />
              </div>
            </CardContent>
          </Card>

          {/* Compliance Documents Card */}
          <Card className="shadow-card mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Compliance Documents
              </CardTitle>
              <CardDescription>Required documentation for vetting</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* HSCPOA Number */}
              <div className="space-y-2">
                <Label htmlFor="hscpoaNumber" className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-primary" />
                  HSCPOA Registration Number
                </Label>
                <Input
                  id="hscpoaNumber"
                  placeholder="e.g., HSCPOA-2024-12345"
                  value={formData.hscpoaNumber}
                  onChange={(e) => updateFormData("hscpoaNumber", e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Health and Supportive Care Providers Oversight Authority registration number
                </p>
              </div>

              {/* Police Check Upload */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  Vulnerable Sector Police Check
                </Label>
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
              </div>
            </CardContent>
          </Card>

          {/* Platform Policy */}
          <Card className="shadow-card mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                Platform Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg text-sm space-y-2">
                <p className="font-medium text-foreground">Important: Please read carefully</p>
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
                  I understand and agree to the PSW Direct platform policies, including the removal policy for missed shifts and professional conduct requirements.
                </Label>
              </div>
            </CardContent>
          </Card>

          <Button
            type="submit"
            variant="brand"
            size="lg"
            className="w-full"
            disabled={isLoading || !agreedToPolicy}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              "Submit Application"
            )}
          </Button>
        </form>
      </main>
    </div>
  );
};

export default PSWSignup;
