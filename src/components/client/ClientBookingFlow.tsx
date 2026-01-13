import { useState, useRef } from "react";
import { ArrowLeft, ArrowRight, Check, Upload, AlertCircle, User, Users, MapPin, Phone, Mail, Calendar, Clock, DoorOpen, FileText, Shield, Zap } from "lucide-react";
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

interface ClientBookingFlowProps {
  onBack: () => void;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

type ServiceForType = "myself" | "someone-else" | null;

const steps = [
  { id: 1, title: "Who Is This For?", icon: Users },
  { id: 2, title: "Patient Details", icon: User },
  { id: 3, title: "Service Details", icon: Calendar },
  { id: 4, title: "Access Info", icon: DoorOpen },
  { id: 5, title: "Confirm", icon: Check },
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    patientName: "",
    patientAddress: "",
    patientPhone: "",
    patientRelationship: "",
    serviceDate: "",
    startTime: "",
    endTime: "",
    serviceType: "",
    specialNotes: "",
    entryPoint: "",
    accessCode: "",
    accessNotes: "",
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "patientAddress") {
      setAddressError(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEntryPhoto(file);
  };

  const validateAddress = async (): Promise<boolean> => {
    const addressToCheck = serviceFor === "myself" ? formData.patientAddress : formData.patientAddress;
    if (!addressToCheck.trim()) return true;
    
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
    if (currentStep < 5) setCurrentStep(prev => prev + 1);
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
    const submissionData = {
      ...formData,
      isAsap,
      serviceFor,
      orderingClient: {
        name: clientName,
        email: clientEmail,
        phone: clientPhone,
      },
      patient: serviceFor === "myself" 
        ? { name: clientName, address: formData.patientAddress }
        : { name: formData.patientName, address: formData.patientAddress, relationship: formData.patientRelationship },
      estimatedPrice: getEstimatedPrice(),
    };
    console.log("Booking submitted:", submissionData);
    alert("Service request submitted successfully! Confirmation will be sent to your email.");
    onBack();
  };

  const currentSteps = serviceFor === null ? steps.slice(0, 1) : steps;

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

      {/* Step 2: Patient Details */}
      {currentStep === 2 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {serviceFor === "myself" ? "Your Details" : "Patient Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceFor === "someone-else" && (
              <>
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
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="patientAddress" className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                {serviceFor === "myself" ? "Your Address" : "Patient's Address"}
              </Label>
              <Textarea
                id="patientAddress"
                placeholder="Enter complete address where service will be provided"
                value={formData.patientAddress}
                onChange={(e) => updateFormData("patientAddress", e.target.value)}
                className="min-h-[80px]"
              />
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
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
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
                  Immediate requests are non-refundable and may incur a 25%+ surge fee.
                </p>
              </div>
            </div>

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
                <Label htmlFor="endTime">End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => updateFormData("endTime", e.target.value)}
                />
              </div>
            </div>

            {/* Pricing Estimate */}
            {getEstimatedPrice() && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Estimated Total</span>
                  <span className="text-xl font-bold text-foreground">
                    ${getEstimatedPrice()?.total.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {calculateHours()} hours × {isAsap ? "ASAP rate" : "standard rate"}
                </p>
              </div>
            )}

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

      {/* Step 4: Access Info */}
      {currentStep === 4 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <DoorOpen className="w-5 h-5 text-primary" />
              Access Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entryPoint">Entry Point</Label>
              <Select 
                value={formData.entryPoint}
                onValueChange={(value) => updateFormData("entryPoint", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="How should the caregiver enter?" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="front-door">Front Door</SelectItem>
                  <SelectItem value="side-door">Side Door</SelectItem>
                  <SelectItem value="back-door">Back Door</SelectItem>
                  <SelectItem value="lobby">Building Lobby</SelectItem>
                  <SelectItem value="garage">Garage</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code (if applicable)</Label>
              <Input
                id="accessCode"
                placeholder="Building code, gate code, etc."
                value={formData.accessCode}
                onChange={(e) => updateFormData("accessCode", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accessNotes">Additional Access Notes</Label>
              <Textarea
                id="accessNotes"
                placeholder="Any special instructions for finding or entering the location..."
                value={formData.accessNotes}
                onChange={(e) => updateFormData("accessNotes", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Entry Point Photo (Optional)</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                {entryPhoto ? entryPhoto.name : "Upload Photo"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirmation */}
      {currentStep === 5 && (
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
              <div className="flex justify-between">
                <span className="text-muted-foreground">Service</span>
                <span className="font-medium text-foreground">{formData.serviceType}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">{formData.serviceDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Time</span>
                <span className="font-medium text-foreground">
                  {formData.startTime} - {formData.endTime}
                </span>
              </div>
              {getEstimatedPrice() && (
                <div className="flex justify-between pt-2 border-t border-border">
                  <span className="font-medium text-foreground">Total</span>
                  <span className="text-xl font-bold text-primary">
                    ${getEstimatedPrice()?.total.toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Billing Info */}
            <div className="p-3 bg-primary/5 rounded-lg text-sm">
              <p className="font-medium text-foreground mb-1">Billing & Reports sent to:</p>
              <p className="text-muted-foreground">{clientName}</p>
              <p className="text-muted-foreground">{clientEmail}</p>
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
              Prices are subject to final adjustment by admin based on service requirements.
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
          
          {currentStep < 5 ? (
            <Button 
              variant="brand" 
              className="flex-1" 
              onClick={nextStep}
              disabled={isCheckingAddress}
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
