import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, Upload, AlertCircle, User, Users, MapPin, Calendar, Clock, DoorOpen, Shield, Zap, Stethoscope, Camera, Building, Phone, Plus, X } from "lucide-react";
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
  calculateMultiServicePrice,
  formatDuration,
  getPricing,
  type PricingConfig 
} from "@/lib/businessConfig";

interface ClientBookingFlowProps {
  onBack: () => void;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

type ServiceForType = "myself" | "someone-else" | null;

const steps = [
  { id: 1, title: "Who Is This For?", icon: Users },
  { id: 2, title: "Patient & Address", icon: User },
  { id: 3, title: "Service Details", icon: Calendar },
  { id: 4, title: "Confirm", icon: Check },
];

// Service types with the new options - now supporting multi-select
const serviceTypes = [
  { value: "doctor-escort", label: "Doctor Appointment Escort", icon: Stethoscope },
  { value: "personal-care", label: "Personal Care", icon: User },
  { value: "respite", label: "Respite Care", icon: Shield },
  { value: "companionship", label: "Companion Visit", icon: Users },
  { value: "meal-prep", label: "Meal Preparation", icon: Calendar },
  { value: "medication", label: "Medication Reminders", icon: Clock },
  { value: "light-housekeeping", label: "Light Housekeeping", icon: DoorOpen },
];

// Simulated geocoding
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
    return { lat: 45.4215, lng: -75.6972 };
  }
  return { lat: 43.7, lng: -79.4 };
};

export const ClientBookingFlow = ({ 
  onBack, 
  clientName, 
  clientEmail, 
  clientPhone 
}: ClientBookingFlowProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [serviceFor, setServiceFor] = useState<ServiceForType>(null);
  const [entryPhoto, setEntryPhoto] = useState<File | null>(null);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [isAsap, setIsAsap] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    // Patient info
    patientName: "",
    patientRelationship: "",
    // Address breakdown
    streetAddress: "",
    unitNumber: "",
    city: "",
    buzzerCode: "",
    entryPoint: "",
    // Service details
    serviceDate: "",
    startTime: "",
    specialNotes: "",
    // Doctor appointment specific
    doctorOfficeName: "",
    doctorSuiteNumber: "",
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "streetAddress" || field === "city") {
      setAddressError(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEntryPhoto(file);
  };

  const getFullAddress = () => {
    const parts = [formData.streetAddress];
    if (formData.unitNumber) parts.push(`Unit ${formData.unitNumber}`);
    if (formData.city) parts.push(formData.city);
    return parts.join(", ");
  };

  const validateAddress = async (): Promise<boolean> => {
    const addressToCheck = getFullAddress();
    if (!addressToCheck.trim() || !formData.streetAddress.trim()) return true;
    
    setIsCheckingAddress(true);
    setAddressError(null);
    
    try {
      const coords = await simulateGeocode(addressToCheck);
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
    if (currentStep === 2) {
      const isValid = await validateAddress();
      if (!isValid) return;
    }
    if (currentStep < 4) setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(prev => prev - 1);
  };

  const handleServiceForSelect = (type: ServiceForType) => {
    setServiceFor(type);
    if (type === "myself") {
      updateFormData("patientName", clientName);
    }
    setCurrentStep(2);
  };

  const toggleService = (serviceValue: string) => {
    setSelectedServices(prev => 
      prev.includes(serviceValue)
        ? prev.filter(s => s !== serviceValue)
        : [...prev, serviceValue]
    );
  };

  const getEstimatedPricing = () => {
    if (selectedServices.length === 0) return null;
    return calculateMultiServicePrice(selectedServices, isAsap);
  };

  const getCalculatedEndTime = () => {
    if (!formData.startTime || selectedServices.length === 0) return "";
    const pricing = getEstimatedPricing();
    if (!pricing) return "";
    
    const [hours, mins] = formData.startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + pricing.totalMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  const handleSubmit = () => {
    const pricing = getEstimatedPricing();
    const submissionData = {
      ...formData,
      fullAddress: getFullAddress(),
      isAsap,
      serviceFor,
      selectedServices,
      calculatedDuration: pricing?.totalMinutes,
      calculatedEndTime: getCalculatedEndTime(),
      orderingClient: {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
      },
      patient: serviceFor === "myself" 
        ? { name: clientName, address: getFullAddress() }
        : { name: formData.patientName, address: getFullAddress(), relationship: formData.patientRelationship },
      estimatedPrice: pricing,
      entryPhoto: entryPhoto?.name,
    };
    console.log("Booking submitted:", submissionData);
    alert("Service request submitted successfully! Confirmation will be sent to your email.");
    onBack();
  };

  const includesDoctorEscort = selectedServices.includes("doctor-escort");

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Request New Service</h1>
          <p className="text-sm text-muted-foreground">Book care for yourself or a loved one</p>
        </div>
      </div>

      {/* Progress Steps */}
      {serviceFor && (
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
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
                    {isCompleted ? <Check className="w-5 h-5" /> : <StepIcon className="w-4 h-4" />}
                  </div>
                  <span className={`text-xs mt-2 font-medium hidden sm:block ${
                    isCurrent ? "text-primary" : "text-muted-foreground"
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1: Who Is This For? */}
      {currentStep === 1 && !serviceFor && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Who is this service for?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleServiceForSelect("myself")}
            >
              <User className="w-6 h-6 text-primary" />
              <span className="font-medium">Myself</span>
              <span className="text-xs text-muted-foreground">I need care services</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-20 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-primary/5"
              onClick={() => handleServiceForSelect("someone-else")}
            >
              <Users className="w-6 h-6 text-primary" />
              <span className="font-medium">Someone Else</span>
              <span className="text-xs text-muted-foreground">Booking for a family member or friend</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Patient Details & Address */}
      {currentStep === 2 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {serviceFor === "myself" ? "Your Details" : "Patient Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Patient Name & Relationship */}
            {serviceFor === "someone-else" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="patientName">Patient's Full Name</Label>
                  <Input
                    id="patientName"
                    placeholder="Enter patient's full name"
                    value={formData.patientName}
                    onChange={(e) => updateFormData("patientName", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientRelationship">Your Relationship to Patient</Label>
                  <Select 
                    value={formData.patientRelationship}
                    onValueChange={(value) => updateFormData("patientRelationship", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="spouse">Spouse</SelectItem>
                      <SelectItem value="child">Son/Daughter</SelectItem>
                      <SelectItem value="sibling">Sibling</SelectItem>
                      <SelectItem value="guardian">Legal Guardian</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Address Breakdown */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Service Address</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  placeholder="123 Main Street"
                  value={formData.streetAddress}
                  onChange={(e) => updateFormData("streetAddress", e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="unitNumber">Unit / Suite / Apt #</Label>
                  <Input
                    id="unitNumber"
                    placeholder="Unit 4B"
                    value={formData.unitNumber}
                    onChange={(e) => updateFormData("unitNumber", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Toronto"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="buzzerCode">Buzzer Code (Optional)</Label>
                  <Input
                    id="buzzerCode"
                    placeholder="e.g., #1234"
                    value={formData.buzzerCode}
                    onChange={(e) => updateFormData("buzzerCode", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entryPoint">Entry Point</Label>
                  <Select 
                    value={formData.entryPoint}
                    onValueChange={(value) => updateFormData("entryPoint", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select entry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front-door">Front Door</SelectItem>
                      <SelectItem value="side-door">Side Door</SelectItem>
                      <SelectItem value="back-door">Back Door</SelectItem>
                      <SelectItem value="concierge">Concierge / Lobby</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Entry Photo Upload */}
              <div className="flex items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  {entryPhoto ? entryPhoto.name : "Upload Entry Photo"}
                </Button>
                {entryPhoto && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEntryPhoto(null)}
                    className="text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a photo of the entry point to help the PSW find the location easily.
              </p>

              {/* Privacy Reminder */}
              <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Privacy Note:</strong> PSWs are instructed to only 
                  use the office line for access issues to protect your privacy.
                </p>
              </div>

              {/* Address Validation Error */}
              {isCheckingAddress && (
                <p className="text-sm text-muted-foreground">Verifying address...</p>
              )}
              {addressError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{addressError}</p>
                </div>
              )}
            </div>

            {serviceFor === "someone-else" && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Note:</strong> All confirmations, invoices, and 
                  care reports will be sent to your email ({clientEmail}).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Service Details */}
      {currentStep === 3 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Service Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Multi-Select Service Types */}
            <div className="space-y-2">
              <Label>Select Care Types (Choose all that apply)</Label>
              <div className="grid grid-cols-2 gap-2">
                {serviceTypes.map((service) => {
                  const ServiceIcon = service.icon;
                  const isSelected = selectedServices.includes(service.value);
                  return (
                    <Button
                      key={service.value}
                      variant={isSelected ? "default" : "outline"}
                      className={`h-auto py-3 flex flex-col items-center gap-1 relative ${
                        isSelected ? "bg-primary text-primary-foreground" : ""
                      }`}
                      onClick={() => toggleService(service.value)}
                    >
                      {isSelected && (
                        <div className="absolute top-1 right-1">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                      <ServiceIcon className="w-5 h-5" />
                      <span className="text-xs text-center leading-tight">{service.label}</span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Selected Services Summary */}
            {selectedServices.length > 0 && (
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">Selected Services:</span>
                  <span className="text-sm text-primary font-bold">
                    Base {getPricing().minimumHours} Hour
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {selectedServices.map(serviceValue => {
                    const service = serviceTypes.find(s => s.value === serviceValue);
                    const pricing = getPricing();
                    const duration = pricing.taskDurations[serviceValue as keyof typeof pricing.taskDurations] || 0;
                    return (
                      <span 
                        key={serviceValue}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      >
                        {service?.label} ({formatDuration(duration)})
                        <button 
                          onClick={() => toggleService(serviceValue)}
                          className="hover:bg-primary/20 rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
                
                {/* Warning if tasks exceed base hour */}
                {getEstimatedPricing()?.exceedsBaseHour && (
                  <div className="flex items-start gap-2 p-2 bg-amber-50 border border-amber-200 rounded-lg mt-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      {getEstimatedPricing()?.warningMessage}
                    </p>
                  </div>
                )}

                {includesDoctorEscort && (
                  <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                    <Stethoscope className="w-3 h-3" />
                    Doctor/Hospital visits: Final price adjusted based on actual visit duration.
                  </p>
                )}
              </div>
            )}

            {/* Doctor Appointment Details - Conditional */}
            {includesDoctorEscort && (
              <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in">
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Doctor Appointment Details</h4>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctorOfficeName" className="text-blue-800">
                    Doctor's Office Name & Suite Number
                  </Label>
                  <Textarea
                    id="doctorOfficeName"
                    placeholder="e.g., Dr. Smith Family Clinic, Suite 302, 456 Medical Plaza"
                    value={formData.doctorOfficeName}
                    onChange={(e) => updateFormData("doctorOfficeName", e.target.value)}
                    className="bg-white"
                  />
                </div>
              </div>
            )}

            {/* ASAP Option */}
            <div className="flex items-start space-x-3 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <Checkbox
                id="asapBooking"
                checked={isAsap}
                onCheckedChange={(checked) => setIsAsap(checked as boolean)}
              />
              <div className="space-y-1">
                <Label htmlFor="asapBooking" className="font-medium cursor-pointer flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Request ASAP Service
                </Label>
                <p className="text-xs text-orange-700">
                  Immediate requests are non-refundable.
                </p>
              </div>
            </div>

            {/* Date & Time */}
            <div className="space-y-2">
              <Label htmlFor="serviceDate">
                <Calendar className="w-4 h-4 text-muted-foreground inline mr-2" />
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
                <Label htmlFor="startTime">
                  <Clock className="w-4 h-4 text-muted-foreground inline mr-2" />
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
                <Label htmlFor="endTime">Calculated End Time</Label>
                <div className="h-10 px-3 py-2 bg-muted rounded-md border border-input flex items-center">
                  <span className={getCalculatedEndTime() ? "text-foreground" : "text-muted-foreground"}>
                    {getCalculatedEndTime() || "Auto-calculated"}
                  </span>
                </div>
              </div>
            </div>

            {/* Duration Summary */}
            {selectedServices.length > 0 && formData.startTime && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 text-primary" />
                  <span className="text-muted-foreground">Total Duration:</span>
                  <span className="font-bold text-primary">
                    {formatDuration(getEstimatedPricing()?.totalMinutes || 0)}
                  </span>
                  <span className="text-muted-foreground">
                    ({formData.startTime} - {getCalculatedEndTime()})
                  </span>
                </div>
              </div>
            )}

            {/* Pricing Estimate - Base Hour model */}
            {getEstimatedPricing() && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Base Hour Charge</span>
                  <span className="text-xl font-bold text-foreground">
                    ${getEstimatedPricing()?.total.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ${(getEstimatedPricing()?.total || 0 / getPricing().minimumHours).toFixed(2)}/hr × {getPricing().minimumHours} hour = ${getEstimatedPricing()?.total.toFixed(2)}
                </p>
                {getEstimatedPricing()?.exceedsBaseHour && (
                  <p className="text-xs text-amber-600 mt-1">
                    Note: Additional time may be billed in 30-minute increments if visit extends beyond 1 hour.
                  </p>
                )}
              </div>
            )}

            {/* Special Notes */}
            <div className="space-y-2">
              <Label htmlFor="specialNotes">Special Notes (Optional)</Label>
              <Textarea
                id="specialNotes"
                placeholder="Any special requirements or preferences..."
                value={formData.specialNotes}
                onChange={(e) => updateFormData("specialNotes", e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Confirmation */}
      {currentStep === 4 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Confirm Your Booking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium text-foreground">
                  {serviceFor === "myself" ? clientName : formData.patientName}
                </span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Services</span>
                <div className="text-right">
                  {selectedServices.map(serviceValue => {
                    const service = serviceTypes.find(s => s.value === serviceValue);
                    return (
                      <span key={serviceValue} className="block font-medium text-foreground text-sm">
                        {service?.label}
                      </span>
                    );
                  })}
                </div>
              </div>
              {includesDoctorEscort && formData.doctorOfficeName && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor's Office</span>
                  <span className="font-medium text-foreground text-right text-sm max-w-[60%]">
                    {formData.doctorOfficeName}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">{formData.serviceDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium text-foreground">
                  {formData.startTime} - {getCalculatedEndTime()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Base Hour</span>
                <span className="font-medium text-primary">
                  {getPricing().minimumHours} hour
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-foreground text-right text-sm max-w-[60%]">
                  {getFullAddress()}
                </span>
              </div>
              {formData.entryPoint && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry</span>
                  <span className="font-medium text-foreground capitalize">
                    {formData.entryPoint.replace("-", " ")}
                    {formData.buzzerCode && ` (Buzzer: ${formData.buzzerCode})`}
                  </span>
                </div>
              )}
              {entryPhoto && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Entry Photo</span>
                  <span className="text-primary text-sm">✓ Uploaded</span>
                </div>
              )}
              {getEstimatedPricing() && (
                <>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-medium text-foreground">Base Hour Total</span>
                    <span className="text-xl font-bold text-primary">
                      ${getEstimatedPricing()?.total.toFixed(2)}
                    </span>
                  </div>
                  {getEstimatedPricing()?.exceedsBaseHour && (
                    <p className="text-xs text-amber-600">
                      Additional time billed in 30-min increments if visit extends beyond 1 hour.
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Billing Info */}
            <div className="p-3 bg-primary/5 rounded-lg text-sm">
              <p className="font-medium text-foreground mb-1">Billing & Reports sent to:</p>
              <p className="text-muted-foreground">{clientName}</p>
              <p className="text-muted-foreground">{clientEmail}</p>
            </div>

            {/* Overtime Policy Note */}
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Billing Policy:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>All bookings include a 1-hour base charge</li>
                <li>Up to 14 minutes over: No extra charge</li>
                <li>15+ minutes over: Billed in 30-minute blocks</li>
              </ul>
            </div>

            {/* Policy Agreement */}
            <div className="flex items-start space-x-3">
              <Checkbox
                id="agreePolicy"
                checked={agreedToPolicy}
                onCheckedChange={(checked) => setAgreedToPolicy(checked as boolean)}
              />
              <Label htmlFor="agreePolicy" className="text-sm text-muted-foreground cursor-pointer">
                I agree to the cancellation policy. Cancellations within 4 hours and ASAP bookings are non-refundable.
              </Label>
            </div>

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              Final price adjusted based on actual visit duration.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation Buttons */}
      {serviceFor && (
        <div className="flex gap-3 mt-6">
          {currentStep > 1 && (
            <Button variant="outline" className="flex-1" onClick={prevStep}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          )}
          
          {currentStep < 4 ? (
            <Button 
              variant="brand" 
              className="flex-1" 
              onClick={nextStep}
              disabled={isCheckingAddress || (currentStep === 3 && selectedServices.length === 0)}
            >
              {isCheckingAddress ? "Checking..." : "Continue"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <Button 
              variant="brand" 
              className="flex-1" 
              onClick={handleSubmit}
              disabled={!agreedToPolicy}
            >
              <Check className="w-4 h-4 mr-2" />
              Confirm Booking
            </Button>
          )}
        </div>
      )}
    </div>
  );
};