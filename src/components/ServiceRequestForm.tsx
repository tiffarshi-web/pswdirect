import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, Upload, AlertCircle, User, MapPin, Phone, Mail, Calendar, Clock, DoorOpen, FileText, Shield, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  SERVICE_RADIUS_KM, 
  isWithinServiceRadius, 
  calculateTotalPrice,
  getPricing,
  type PricingConfig 
} from "@/lib/businessConfig";

interface ServiceRequestFormProps {
  onBack: () => void;
}

const steps = [
  { id: 1, title: "Client & Patient", icon: User },
  { id: 2, title: "Service Details", icon: Calendar },
  { id: 3, title: "Access Info", icon: DoorOpen },
  { id: 4, title: "Policy & Terms", icon: Shield },
  { id: 5, title: "Confirmation", icon: Check },
];

// Simulated geocoding - in production, use Google Maps Geocoding API
const simulateGeocode = async (address: string): Promise<{ lat: number; lng: number } | null> => {
  const lowerAddress = address.toLowerCase();
  if (lowerAddress.includes("toronto") || lowerAddress.includes("mississauga") || 
      lowerAddress.includes("brampton") || lowerAddress.includes("markham") ||
      lowerAddress.includes("vaughan") || lowerAddress.includes("richmond hill") ||
      lowerAddress.includes("oakville") || lowerAddress.includes("burlington")) {
    return { lat: 43.6532 + (Math.random() * 0.2 - 0.1), lng: -79.3832 + (Math.random() * 0.2 - 0.1) };
  }
  if (lowerAddress.includes("ottawa") || lowerAddress.includes("montreal") || 
      lowerAddress.includes("london") || lowerAddress.includes("windsor")) {
    return { lat: 45.4215, lng: -75.6972 }; // Far away
  }
  return { lat: 43.7, lng: -79.4 };
};

export const ServiceRequestForm = ({ onBack }: ServiceRequestFormProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isDifferentOrderer, setIsDifferentOrderer] = useState(false);
  const [entryPhoto, setEntryPhoto] = useState<File | null>(null);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [isAsap, setIsAsap] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    // Patient Info
    patientName: "",
    patientAddress: "",
    patientPhone: "",
    patientEmail: "",
    // Ordering Client Info
    clientName: "",
    clientPhone: "",
    clientEmail: "",
    clientRelationship: "",
    clientAddress: "",
    // Service Details
    serviceDate: "",
    startTime: "",
    endTime: "",
    serviceType: "",
    specialNotes: "",
    // Access Info
    entryPoint: "",
    accessCode: "",
    accessNotes: "",
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear address error when address is changed
    if (field === "patientAddress") {
      setAddressError(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEntryPhoto(file);
    }
  };

  // Check if address is within service radius
  const validateAddress = async (): Promise<boolean> => {
    if (!formData.patientAddress.trim()) return true;
    
    setIsCheckingAddress(true);
    setAddressError(null);
    
    try {
      const coords = await simulateGeocode(formData.patientAddress);
      if (!coords) {
        setAddressError("Unable to verify address. Please check and try again.");
        setIsCheckingAddress(false);
        return false;
      }
      
      if (!isWithinServiceRadius(coords.lat, coords.lng)) {
        setAddressError(`Address outside of ${SERVICE_RADIUS_KM}km service radius.`);
        setIsCheckingAddress(false);
        return false;
      }
      
      setIsCheckingAddress(false);
      return true;
    } catch {
      setAddressError("Error validating address. Please try again.");
      setIsCheckingAddress(false);
      return false;
    }
  };

  const nextStep = async () => {
    // Validate address when leaving step 1
    if (currentStep === 1) {
      const isValid = await validateAddress();
      if (!isValid) return;
    }
    if (currentStep < 5) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  // Calculate pricing
  const calculateHours = (): number => {
    if (!formData.startTime || !formData.endTime) return 0;
    const [startH, startM] = formData.startTime.split(":").map(Number);
    const [endH, endM] = formData.endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    return Math.max(0, (endMinutes - startMinutes) / 60);
  };

  const getEstimatedPrice = () => {
    const hours = calculateHours();
    if (!formData.serviceType || hours === 0) return null;
    return calculateTotalPrice(
      formData.serviceType as keyof PricingConfig["baseHourlyRates"],
      hours,
      isAsap
    );
  };

  const handleSubmit = () => {
    // Handle form submission with all ordering client info
    const submissionData = {
      ...formData,
      isAsap,
      orderingClient: {
        name: isDifferentOrderer ? formData.clientName : formData.patientName,
        address: isDifferentOrderer ? formData.clientAddress : formData.patientAddress,
        phone: isDifferentOrderer ? formData.clientPhone : formData.patientPhone,
        email: isDifferentOrderer ? formData.clientEmail : formData.patientEmail,
      },
      estimatedPrice: getEstimatedPrice(),
    };
    console.log("Form submitted:", submissionData);
    alert("Service request submitted successfully! Confirmation will be sent to the ordering client's email.");
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
          <h1 className="text-xl font-semibold text-foreground">Request New Service</h1>
          <p className="text-sm text-muted-foreground">Complete all steps to submit your request</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          {/* Progress Line */}
          <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
          <div 
            className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300"
            style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}
          />
          
          {steps.map((step) => {
            const StepIcon = step.icon;
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <div key={step.id} className="flex flex-col items-center relative z-10">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isCompleted
                      ? "bg-primary text-primary-foreground"
                      : isCurrent
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                      : "bg-card border-2 border-border text-muted-foreground"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </div>
                <span className={`text-xs mt-2 font-medium ${
                  isCurrent ? "text-primary" : "text-muted-foreground"
                }`}>
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="animate-fade-in">
        {currentStep === 1 && (
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Client & Patient Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Patient Info */}
              <div className="space-y-4">
                <h3 className="font-medium text-foreground">Patient Details</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="patientName" className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Full Name
                    </Label>
                    <Input
                      id="patientName"
                      placeholder="Enter patient's full name"
                      value={formData.patientName}
                      onChange={(e) => updateFormData("patientName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patientAddress" className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Address
                    </Label>
                    <Textarea
                      id="patientAddress"
                      placeholder="Enter complete address"
                      value={formData.patientAddress}
                      onChange={(e) => updateFormData("patientAddress", e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="patientPhone" className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        Phone
                      </Label>
                      <Input
                        id="patientPhone"
                        type="tel"
                        placeholder="(555) 123-4567"
                        value={formData.patientPhone}
                        onChange={(e) => updateFormData("patientPhone", e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="patientEmail" className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-muted-foreground" />
                        Email
                      </Label>
                      <Input
                        id="patientEmail"
                        type="email"
                        placeholder="patient@email.com"
                        value={formData.patientEmail}
                        onChange={(e) => updateFormData("patientEmail", e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Different Ordering Client Toggle */}
              <div className="border-t border-border pt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="differentOrderer"
                    checked={isDifferentOrderer}
                    onCheckedChange={(checked) => setIsDifferentOrderer(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="differentOrderer" className="font-medium cursor-pointer">
                      Someone else is ordering this service
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Check this if you're booking on behalf of the patient
                    </p>
                  </div>
                </div>
              </div>

              {/* Ordering Client Info (conditional) */}
              {isDifferentOrderer && (
                <div className="space-y-4 pt-2 animate-fade-in">
                  <h3 className="font-medium text-foreground">Ordering Client Details</h3>
                  <div className="grid gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="clientName">Your Full Name</Label>
                      <Input
                        id="clientName"
                        placeholder="Enter your full name"
                        value={formData.clientName}
                        onChange={(e) => updateFormData("clientName", e.target.value)}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="clientPhone">Your Phone</Label>
                        <Input
                          id="clientPhone"
                          type="tel"
                          placeholder="(555) 123-4567"
                          value={formData.clientPhone}
                          onChange={(e) => updateFormData("clientPhone", e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="clientEmail">Your Email</Label>
                        <Input
                          id="clientEmail"
                          type="email"
                          placeholder="you@email.com"
                          value={formData.clientEmail}
                          onChange={(e) => updateFormData("clientEmail", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="clientRelationship">Relationship to Patient</Label>
                      <Select 
                        value={formData.clientRelationship}
                        onValueChange={(value) => updateFormData("clientRelationship", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="family">Family Member</SelectItem>
                          <SelectItem value="spouse">Spouse</SelectItem>
                          <SelectItem value="child">Son/Daughter</SelectItem>
                          <SelectItem value="guardian">Legal Guardian</SelectItem>
                          <SelectItem value="caregiver">Caregiver</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Service Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="serviceType">Type of Service</Label>
                  <Select 
                    value={formData.serviceType}
                    onValueChange={(value) => updateFormData("serviceType", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="personal-care">Personal Care Assistance</SelectItem>
                      <SelectItem value="companionship">Companionship Visit</SelectItem>
                      <SelectItem value="meal-prep">Meal Preparation</SelectItem>
                      <SelectItem value="medication">Medication Reminders</SelectItem>
                      <SelectItem value="light-housekeeping">Light Housekeeping</SelectItem>
                      <SelectItem value="transportation">Transportation Assistance</SelectItem>
                      <SelectItem value="respite">Respite Care</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serviceDate" className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Service Date
                  </Label>
                  <Input
                    id="serviceDate"
                    type="date"
                    value={formData.serviceDate}
                    onChange={(e) => updateFormData("serviceDate", e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="startTime" className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Start Time
                    </Label>
                    <Input
                      id="startTime"
                      type="time"
                      value={formData.startTime}
                      onChange={(e) => updateFormData("startTime", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endTime" className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      End Time
                    </Label>
                    <Input
                      id="endTime"
                      type="time"
                      value={formData.endTime}
                      onChange={(e) => updateFormData("endTime", e.target.value)}
                    />
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Flexible scheduling:</span> You can select any start and end time. Minimum booking is 2 hours.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="specialNotes" className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    Special Instructions (Optional)
                  </Label>
                  <Textarea
                    id="specialNotes"
                    placeholder="Any specific requirements or notes for the caregiver..."
                    value={formData.specialNotes}
                    onChange={(e) => updateFormData("specialNotes", e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <DoorOpen className="w-5 h-5 text-primary" />
                Access Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="entryPoint">Entry Point</Label>
                  <Select 
                    value={formData.entryPoint}
                    onValueChange={(value) => updateFormData("entryPoint", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select entry point" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front">Front Door</SelectItem>
                      <SelectItem value="side">Side Door</SelectItem>
                      <SelectItem value="back">Back Door</SelectItem>
                      <SelectItem value="garage">Garage Entrance</SelectItem>
                      <SelectItem value="unit">Building Unit #</SelectItem>
                      <SelectItem value="lobby">Building Lobby</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessCode">Access/Buzz Code (if applicable)</Label>
                  <Input
                    id="accessCode"
                    placeholder="e.g., #1234 or Apt 5B"
                    value={formData.accessCode}
                    onChange={(e) => updateFormData("accessCode", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Entry Photo</Label>
                  <div 
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                    {entryPhoto ? (
                      <div className="space-y-2">
                        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-lg flex items-center justify-center">
                          <Check className="w-8 h-8 text-primary" />
                        </div>
                        <p className="text-sm font-medium text-foreground">{entryPhoto.name}</p>
                        <p className="text-xs text-muted-foreground">Click to change photo</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-16 h-16 mx-auto bg-muted rounded-lg flex items-center justify-center">
                          <Upload className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <p className="text-sm font-medium text-foreground">Upload Entry Photo</p>
                        <p className="text-xs text-muted-foreground">
                          Help our caregiver find the entrance easily
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessNotes">Additional Access Notes</Label>
                  <Textarea
                    id="accessNotes"
                    placeholder="e.g., Ring doorbell twice, gate code is 1234, etc."
                    value={formData.accessNotes}
                    onChange={(e) => updateFormData("accessNotes", e.target.value)}
                    className="min-h-[80px]"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 4 && (
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Privacy & Legal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Refund Policy */}
              <div className="bg-muted rounded-xl p-5 space-y-4">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-primary" />
                  Cancellation & Refund Policy
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-role-client-light rounded-lg">
                    <Check className="w-5 h-5 text-role-client shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Full Refund</p>
                      <p className="text-sm text-muted-foreground">
                        Cancel <span className="font-semibold text-foreground">4+ hours before</span> the scheduled service time
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground">Full Charge</p>
                      <p className="text-sm text-muted-foreground">
                        Cancel <span className="font-semibold text-foreground">less than 4 hours before</span> the scheduled service time
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documentation Notice */}
              <div className="bg-secondary/5 border border-secondary/20 rounded-xl p-5 space-y-2">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-secondary" />
                  Documentation Notice
                </h3>
                <p className="text-sm text-muted-foreground">
                  All service documentation, receipts, and care summaries will be sent to the{" "}
                  <span className="font-semibold text-foreground">Ordering Client's email address</span>,
                  not the patient (unless they are the same person).
                </p>
              </div>

              {/* Agreement Checkbox */}
              <div className="border-t border-border pt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="agreeToPolicy"
                    checked={agreedToPolicy}
                    onCheckedChange={(checked) => setAgreedToPolicy(checked as boolean)}
                  />
                  <div className="space-y-1">
                    <Label htmlFor="agreeToPolicy" className="font-medium cursor-pointer">
                      I understand and agree to the cancellation policy
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      By checking this box, you acknowledge the refund terms stated above
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {currentStep === 5 && (
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" />
                Review & Confirm
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Patient Summary */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground text-sm uppercase tracking-wide text-muted-foreground">
                  Patient Information
                </h3>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="font-medium text-foreground">{formData.patientName || "Not provided"}</p>
                  <p className="text-sm text-muted-foreground">{formData.patientAddress || "Address not provided"}</p>
                  <p className="text-sm text-muted-foreground">{formData.patientPhone} • {formData.patientEmail}</p>
                </div>
              </div>

              {/* Ordering Client (if different) */}
              {isDifferentOrderer && (
                <div className="space-y-3">
                  <h3 className="font-medium text-foreground text-sm uppercase tracking-wide text-muted-foreground">
                    Ordering Client
                  </h3>
                  <div className="bg-muted rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">{formData.clientName || "Not provided"}</p>
                    <p className="text-sm text-muted-foreground">{formData.clientPhone} • {formData.clientEmail}</p>
                    <p className="text-sm text-muted-foreground">Relationship: {formData.clientRelationship}</p>
                  </div>
                </div>
              )}

              {/* Service Summary */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground text-sm uppercase tracking-wide text-muted-foreground">
                  Service Details
                </h3>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="font-medium text-foreground capitalize">
                    {formData.serviceType?.replace("-", " ") || "Service type not selected"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formData.serviceDate || "Date not set"} • {formData.startTime || "--:--"} - {formData.endTime || "--:--"}
                  </p>
                  {formData.specialNotes && (
                    <p className="text-sm text-muted-foreground mt-2 pt-2 border-t border-border">
                      {formData.specialNotes}
                    </p>
                  )}
                </div>
              </div>

              {/* Access Summary */}
              <div className="space-y-3">
                <h3 className="font-medium text-foreground text-sm uppercase tracking-wide text-muted-foreground">
                  Access Information
                </h3>
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <p className="font-medium text-foreground capitalize">
                    Entry: {formData.entryPoint?.replace("-", " ") || "Not specified"}
                  </p>
                  {formData.accessCode && (
                    <p className="text-sm text-muted-foreground">Code: {formData.accessCode}</p>
                  )}
                  {entryPhoto && (
                    <p className="text-sm text-primary flex items-center gap-1">
                      <Check className="w-4 h-4" /> Photo uploaded
                    </p>
                  )}
                </div>
              </div>

              {/* Documentation Notice */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                <p className="text-sm text-foreground">
                  <span className="font-semibold">📧 Documentation will be sent to:</span>{" "}
                  {isDifferentOrderer ? formData.clientEmail : formData.patientEmail || "Email not provided"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur-sm border-t border-border">
        <div className="max-w-lg mx-auto flex gap-3">
          {currentStep > 1 && (
            <Button variant="outline" onClick={prevStep} className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          {currentStep < 5 ? (
            <Button variant="brand" onClick={nextStep} className="flex-1">
              Continue
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              variant="brand" 
              onClick={handleSubmit} 
              className="flex-1"
              disabled={!agreedToPolicy}
            >
              <Check className="w-4 h-4 mr-2" />
              Submit Request
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
