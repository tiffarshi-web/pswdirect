import { useState, useRef, useMemo } from "react";
import { TermsOfServiceDialog } from "@/components/client/TermsOfServiceDialog";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Upload, AlertCircle, User, Users, MapPin, Calendar, Clock, DoorOpen, Shield, Zap, Stethoscope, Camera, Building, Phone, Plus, X, Globe, Loader2, Hospital, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  formatDuration,
  getPricing,
} from "@/lib/businessConfig";
import { useLivePricing } from "@/hooks/useLivePricing";
import { calculateActiveSurgeMultiplier } from "@/lib/surgeScheduleUtils";
import {
  isValidCanadianPostalCode,
  formatPostalCode,
  isWithinAnyPSWCoverageAsync,
} from "@/lib/postalCodeUtils";
import { initializePSWProfiles } from "@/lib/pswProfileStore";
import { LanguageSelector } from "@/components/LanguageSelector";
import type { GenderPreference } from "@/lib/shiftStore";
import { useServiceTasks } from "@/hooks/useServiceTasks";
import { addBooking, type BookingData } from "@/lib/bookingStore";
import { toast } from "sonner";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { StripePaymentForm } from "@/components/client/StripePaymentForm";
import { InstallAppPrompt } from "@/components/client/InstallAppPrompt";

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
  { id: 4, title: "Review", icon: Check },
  { id: 5, title: "Payment", icon: CreditCard },
];

// Icon mapping for service categories - checks task name for keywords
const getIconForTask = (taskName: string) => {
  const lowerName = taskName.toLowerCase();
  if (lowerName.includes("doctor") || lowerName.includes("escort")) return Stethoscope;
  if (lowerName.includes("hospital") || lowerName.includes("discharge")) return Hospital;
  if (lowerName.includes("personal") || lowerName.includes("care")) return User;
  if (lowerName.includes("respite")) return Shield;
  if (lowerName.includes("companion")) return Users;
  if (lowerName.includes("meal") || lowerName.includes("prep")) return Calendar;
  if (lowerName.includes("medication")) return Clock;
  if (lowerName.includes("housekeeping") || lowerName.includes("light")) return DoorOpen;
  if (lowerName.includes("transport")) return MapPin;
  return Calendar;
};

// Postal code validation handled by postalCodeUtils

export const ClientBookingFlow = ({ 
  onBack, 
  clientName, 
  clientEmail, 
  clientPhone 
}: ClientBookingFlowProps) => {
  const navigate = useNavigate();
  
  // Get auth context for email fallback
  const { user } = useSupabaseAuth();
  
  // Resolve email from props or auth context
  const resolvedEmail = clientEmail || user?.email || "";
  const resolvedName = clientName || user?.user_metadata?.full_name || "";
  const resolvedPhone = clientPhone || "";
  
  // Fetch service tasks from database (for UI display only)
  const { tasks: serviceTasks, loading: tasksLoading } = useServiceTasks();

  // Live pricing from Supabase — single source of truth
  const {
    tasks: livePricingTasks,
    config: livePricingConfig,
    calculateBookingPrice,
  } = useLivePricing();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [serviceFor, setServiceFor] = useState<ServiceForType>(null);
  const [entryPhoto, setEntryPhoto] = useState<File | null>(null);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);
  const [pickupPostalCodeError, setPickupPostalCodeError] = useState<string | null>(null);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [isAsap, setIsAsap] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<BookingData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    // Patient info
    patientName: "",
    patientRelationship: "",
    // Address breakdown
    streetAddress: "",
    unitNumber: "",
    city: "",
    province: "ON",
    postalCode: "",
    buzzerCode: "",
    entryPoint: "",
    // Service details
    serviceDate: "",
    startTime: "",
    specialNotes: "",
    // Doctor appointment / Hospital pickup specific
    doctorOfficeName: "",
    doctorSuiteNumber: "",
    pickupAddress: "",
    pickupPostalCode: "",
    // Caregiver preferences
    preferredGender: "no-preference" as GenderPreference,
  });
  
  // Build service options from database tasks
  const serviceTypes = useMemo(() => {
    return serviceTasks.map(task => ({
      value: task.id,
      label: task.name,
      icon: getIconForTask(task.name),
      isHospitalDoctor: task.isHospitalDoctor,
    }));
  }, [serviceTasks]);
  
  // Check if any selected service is a hospital/doctor transport service
  const includesDoctorEscort = useMemo(() => {
    return selectedServices.some(serviceId => {
      const service = serviceTasks.find(s => s.id === serviceId);
      return service?.isHospitalDoctor === true;
    });
  }, [selectedServices, serviceTasks]);
  
  // Language preferences for caregiver
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]);

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "streetAddress" || field === "city" || field === "postalCode") {
      setAddressError(null);
      setPostalCodeError(null);
    }
  };

  const handlePostalCodeChange = (value: string) => {
    const formatted = formatPostalCode(value);
    updateFormData("postalCode", formatted);
    setPostalCodeError(null);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEntryPhoto(file);
  };

  const getFullAddress = () => {
    const parts = [formData.streetAddress];
    if (formData.unitNumber) parts.push(`Unit ${formData.unitNumber}`);
    if (formData.city) parts.push(formData.city);
    if (formData.province) parts.push(formData.province);
    if (formData.postalCode) parts.push(formData.postalCode);
    return parts.join(", ");
  };

  const validateAddress = async (): Promise<boolean> => {
    if (!formData.streetAddress.trim() || !formData.city.trim()) return true;
    
    // Validate postal code format
    if (!formData.postalCode.trim()) {
      setPostalCodeError("Postal code is required");
      return false;
    }
    
    if (!isValidCanadianPostalCode(formData.postalCode)) {
      setPostalCodeError("Please enter a valid Canadian postal code (e.g., K8N 1A1)");
      return false;
    }
    
    setIsCheckingAddress(true);
    setAddressError(null);
    setPostalCodeError(null);
    
    // Ensure PSW profiles are loaded before checking coverage
    initializePSWProfiles();
    
    try {
      // Check if postal code is within any approved PSW's DYNAMIC service radius
      const coverageCheck = await isWithinAnyPSWCoverageAsync(formData.postalCode);
      
      if (!coverageCheck.withinCoverage) {
        setAddressError(coverageCheck.message);
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
    
    // Validate transport booking fields on Step 3
    if (currentStep === 3 && includesDoctorEscort) {
      if (!formData.pickupAddress.trim()) {
        setPickupPostalCodeError("Pick-up address is required for hospital/doctor services");
        return;
      }
      if (!formData.pickupPostalCode.trim()) {
        setPickupPostalCodeError("Pick-up postal code is required for PSW geofencing");
        return;
      }
      if (!isValidCanadianPostalCode(formData.pickupPostalCode)) {
        setPickupPostalCodeError("Please enter a valid Canadian postal code");
        return;
      }
    }
    
    if (currentStep < 5) setCurrentStep(prev => prev + 1);
  };

  const proceedToPayment = () => {
    if (!agreedToPolicy) {
      toast.error("Please agree to the cancellation policy");
      return;
    }
    
    if (!resolvedEmail?.trim()) {
      toast.error("Missing email address", {
        description: "Unable to retrieve your email. Please log out and back in."
      });
      return;
    }
    
    const pricing = getEstimatedPricing();
    if (!pricing || pricing.total < 20) {
      toast.error("Minimum booking amount is $20");
      return;
    }
    
    setShowPaymentStep(true);
    setCurrentStep(5);
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
    // Calculate surge multiplier from scheduling rules + ASAP
    let surgeMultiplier = 1;
    if (formData.serviceDate && formData.startTime) {
      const surgeInfo = calculateActiveSurgeMultiplier(formData.serviceDate, formData.startTime);
      surgeMultiplier = surgeInfo.multiplier;
    }
    if (isAsap) {
      // ASAP: 1.25x or admin configured multiplier — use 1.25 default if no config
      surgeMultiplier = Math.max(surgeMultiplier, 1.25);
    }
    return calculateBookingPrice(selectedServices, surgeMultiplier);
  };

  const getCalculatedEndTime = () => {
    if (!formData.startTime || selectedServices.length === 0) return "";
    const pricing = getEstimatedPricing();
    if (!pricing) return "";
    
    const [hours, mins] = formData.startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + pricing.baseMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (paidIntentId?: string) => {
    setIsSubmitting(true);
    
    // Validate email before submission
    if (!resolvedEmail?.trim()) {
      toast.error("Missing email address", {
        description: "Unable to retrieve your email. Please log out and back in."
      });
      setIsSubmitting(false);
      return;
    }
    
    try {
      const pricing = getEstimatedPricing();
      
      // Get service names from the selected service IDs
      const serviceNames = selectedServices.map(id => {
        const service = serviceTasks.find(s => s.id === id);
        return service?.name || id;
      });
      
      // For ASAP bookings, set date to today and time to now + 15 minutes
      let bookingDate = formData.serviceDate;
      let bookingStartTime = formData.startTime;
      let bookingEndTime = getCalculatedEndTime();
      
      if (isAsap || !bookingDate || !bookingStartTime) {
        const now = new Date();
        // Set date to today in YYYY-MM-DD format
        bookingDate = now.toISOString().split("T")[0];
        
        // Set start time to now + 15 minutes
        now.setMinutes(now.getMinutes() + 15);
        const startHours = now.getHours().toString().padStart(2, "0");
        const startMins = now.getMinutes().toString().padStart(2, "0");
        bookingStartTime = `${startHours}:${startMins}`;
        
        // Calculate end time based on service duration
        const totalMinutes = pricing?.baseMinutes || 60;
        now.setMinutes(now.getMinutes() + totalMinutes);
        const endHours = now.getHours().toString().padStart(2, "0");
        const endMins = now.getMinutes().toString().padStart(2, "0");
        bookingEndTime = `${endHours}:${endMins}`;
      }
      
      const bookingData: Omit<BookingData, "id" | "createdAt"> = {
        paymentStatus: paidIntentId ? "paid" : "invoice-pending",
        stripePaymentIntentId: paidIntentId || undefined,
        serviceType: serviceNames,
        date: bookingDate,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        status: "pending",
        hours: pricing ? pricing.baseMinutes / 60 : 1,
        hourlyRate: pricing ? pricing.baseCost : 35,
        subtotal: pricing?.subtotal || 0,
        surgeAmount: pricing?.surgeAmount || 0,
        total: pricing?.total || 0,
        isAsap,
        wasRefunded: false,
        orderingClient: {
          name: resolvedName,
          address: getFullAddress(),
          postalCode: formData.postalCode,
          phone: resolvedPhone,
          email: resolvedEmail,
          isNewAccount: false,
        },
        patient: {
          name: serviceFor === "myself" ? resolvedName : formData.patientName,
          address: getFullAddress(),
          postalCode: formData.postalCode,
          relationship: serviceFor === "myself" ? "Self" : formData.patientRelationship,
          preferredLanguages: preferredLanguages.length > 0 ? preferredLanguages : undefined,
          preferredGender: formData.preferredGender as GenderPreference,
        },
        // Transport: Pickup = Hospital, Dropoff = Patient address (already in patient fields)
        pickupAddress: includesDoctorEscort ? formData.pickupAddress : undefined,
        pickupPostalCode: includesDoctorEscort ? formData.pickupPostalCode : undefined,
        isTransportBooking: includesDoctorEscort,
        pswAssigned: null,
        specialNotes: formData.specialNotes,
        doctorOfficeName: formData.doctorOfficeName || undefined,
        doctorSuiteNumber: formData.doctorSuiteNumber || undefined,
        entryPhoto: entryPhoto?.name,
        buzzerCode: formData.buzzerCode || undefined,
        entryPoint: formData.entryPoint || undefined,
        emailNotifications: {
          confirmationSent: true,
          confirmationSentAt: new Date().toISOString(),
          reminderSent: false,
        },
        adminNotifications: {
          notified: true,
          notifiedAt: new Date().toISOString(),
        },
      };

      const savedBooking = await addBooking(bookingData);
      console.log("✅ BOOKING CONFIRMED:", savedBooking);
      toast.success("Booking confirmed! Check your email for details.");
      setCompletedBooking(savedBooking);
      setBookingComplete(true);
    } catch (error) {
      console.error("Booking submission error:", error);
      toast.error("Failed to save booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (intentId: string) => {
    setPaymentIntentId(intentId);
    await handleSubmit(intentId);
  };

  const handlePaymentError = (error: string) => {
    toast.error("Payment failed", { description: error });
  };
  // Booking Complete Screen
  if (bookingComplete && completedBooking) {
    return (
      <Card className="shadow-card text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Booking Confirmed!
            </h1>
            <p className="text-muted-foreground">
              Thank you, {resolvedName.split(" ")[0]}!
            </p>
          </div>

          {/* Booking ID */}
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Your Booking ID</p>
            <p className="text-2xl font-mono font-bold text-primary">
              {completedBooking.id}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Save this ID for your records
            </p>
          </div>

          {/* Booking Summary */}
          <div className="p-4 bg-muted rounded-lg text-left space-y-2">
            <h3 className="font-medium text-foreground mb-3">Booking Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">{completedBooking.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium text-foreground">
                {completedBooking.startTime} - {completedBooking.endTime}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Services</span>
              <span className="font-medium text-foreground text-right">
                {completedBooking.serviceType.length} service(s)
              </span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-primary">${completedBooking.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Status</span>
              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
                Paid
              </Badge>
            </div>
          </div>

          {/* What's Next */}
          <div className="p-4 bg-muted rounded-lg text-left">
            <p className="text-foreground font-medium mb-2">What's next?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Confirmation email sent to {resolvedEmail}</li>
              <li>• A PSW will be assigned to your booking</li>
              <li>• You'll receive a reminder before your appointment</li>
            </ul>
          </div>

          {/* Google Review Prompt */}
          <div className="p-5 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl text-center space-y-3">
            <p className="text-foreground font-semibold text-lg">
              ⭐ Enjoying our service?
            </p>
            <p className="text-muted-foreground text-sm">
              We'd love to hear about your experience!
            </p>
            <Button
              variant="brand"
              className="w-full"
              onClick={() => window.open("https://g.page/r/CfuKfStrS_hoEAI/review", "_blank")}
            >
              Rate your experience on Google
            </Button>
          </div>

          {/* Install App Prompt for mobile users */}
          <InstallAppPrompt clientName={resolvedName.split(" ")[0]} />

          <Button 
            variant="outline" 
            onClick={onBack}
            className="w-full"
          >
            Go to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

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
                    placeholder="Belleville"
                    value={formData.city}
                    onChange={(e) => updateFormData("city", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal Code *</Label>
                  <Input
                    id="postalCode"
                    placeholder="K8N 1A1"
                    value={formData.postalCode}
                    onChange={(e) => handlePostalCodeChange(e.target.value)}
                    maxLength={7}
                    className={postalCodeError ? "border-destructive" : ""}
                  />
                  {postalCodeError && (
                    <p className="text-xs text-destructive">{postalCodeError}</p>
                  )}
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

            {/* Caregiver Preferences Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Caregiver Preferences (Optional)</h3>
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferredGender">Preferred Gender of Caregiver</Label>
                <Select 
                  value={formData.preferredGender}
                  onValueChange={(value) => updateFormData("preferredGender", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-preference">No Preference</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  We'll try to match you with a caregiver of your preferred gender when possible
                </p>
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  Preferred Languages (Optional)
                </Label>
                <LanguageSelector
                  selectedLanguages={preferredLanguages}
                  onLanguagesChange={setPreferredLanguages}
                  maxLanguages={3}
                  label=""
                  description="Select languages you'd prefer your caregiver to speak"
                  placeholder="Add preferred languages..."
                />
              </div>
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
              {tasksLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading services...</span>
                </div>
              ) : (
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
              )}
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
                

                {includesDoctorEscort && (
                  <p className="text-xs text-blue-600 flex items-center gap-1 mt-1">
                    <Stethoscope className="w-3 h-3" />
                    Doctor/Hospital visits: Final price adjusted based on actual visit duration.
                  </p>
                )}
              </div>
            )}

            {/* Hospital/Doctor Transport Details - Conditional */}
            {includesDoctorEscort && (
              <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg animate-fade-in">
                <div className="flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-blue-900">Hospital/Doctor Pick-up Details</h4>
                </div>
                
                {/* Pick-up Address */}
                <div className="space-y-2">
                  <Label htmlFor="pickupAddress" className="text-blue-800">
                    Pick-up Address (Hospital/Clinic) *
                  </Label>
                  <Input
                    id="pickupAddress"
                    placeholder="e.g., Belleville General Hospital, 265 Dundas St E"
                    value={formData.pickupAddress}
                    onChange={(e) => updateFormData("pickupAddress", e.target.value)}
                    className="bg-white"
                  />
                </div>
                
                {/* Pick-up Postal Code */}
                <div className="space-y-2">
                  <Label htmlFor="pickupPostalCode" className="text-blue-800">
                    Pick-up Location Postal Code *
                  </Label>
                  <Input
                    id="pickupPostalCode"
                    placeholder="K8N 1A1"
                    value={formData.pickupPostalCode}
                    onChange={(e) => {
                      const formatted = formatPostalCode(e.target.value);
                      updateFormData("pickupPostalCode", formatted);
                      setPickupPostalCodeError(null);
                    }}
                    maxLength={7}
                    className={`bg-white ${pickupPostalCodeError ? "border-destructive" : ""}`}
                  />
                  {pickupPostalCodeError && (
                    <p className="text-xs text-destructive">{pickupPostalCodeError}</p>
                  )}
                  <p className="text-xs text-blue-600">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    PSW must be within 200m of this location to start the shift
                  </p>
                </div>
                
                {/* Doctor's Office Details */}
                <div className="space-y-2">
                  <Label htmlFor="doctorOfficeName" className="text-blue-800">
                    Doctor's Office Name & Suite Number (Optional)
                  </Label>
                  <Textarea
                    id="doctorOfficeName"
                    placeholder="e.g., Dr. Smith Family Clinic, Suite 302"
                    value={formData.doctorOfficeName}
                    onChange={(e) => updateFormData("doctorOfficeName", e.target.value)}
                    className="bg-white"
                    rows={2}
                  />
                </div>
                
                <p className="text-xs text-blue-600 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" />
                  Final price adjusted based on actual visit duration.
                </p>
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
                  <span className="text-muted-foreground">Base Duration:</span>
                  <span className="font-bold text-primary">
                    {formatDuration(getEstimatedPricing()?.baseMinutes || 60)}
                  </span>
                  <span className="text-muted-foreground">
                    ({formData.startTime} - {getCalculatedEndTime()})
                  </span>
                </div>
              </div>
            )}

            {/* Pricing Estimate - Live from DB */}
            {getEstimatedPricing() && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Base Hour Charge</span>
                  <span className="text-xl font-bold text-foreground">
                    ${getEstimatedPricing()?.grandTotal.toFixed(2)}
                  </span>
                </div>
                
                {/* Breakdown */}
                <div className="text-xs text-muted-foreground space-y-1">
                  <div className="flex justify-between">
                    <span>Base rate (1 hr @ ${getEstimatedPricing()?.baseCost.toFixed(2)}/hr)</span>
                    <span>${getEstimatedPricing()?.baseCharge.toFixed(2)}</span>
                  </div>
                  {(getEstimatedPricing()?.hstAmount || 0) > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>HST (13%)</span>
                      <span>+${getEstimatedPricing()?.hstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {(getEstimatedPricing()?.surgeAmount || 0) > 0 && (
                    <div className="flex justify-between text-amber-600">
                      <span>{isAsap ? "ASAP" : "Surge"} Fee</span>
                      <span>+${getEstimatedPricing()?.surgeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {getEstimatedPricing()?.isMinimumFeeApplied && (
                    <div className="flex justify-between text-green-600">
                      <span>Minimum Booking Fee Applied</span>
                      <span>${livePricingConfig?.minimumBookingFee.toFixed(2)}</span>
                    </div>
                  )}
                </div>
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
              {/* Hospital Pick-up Address for Transport */}
              {includesDoctorEscort && formData.pickupAddress && (
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Pick-up Location</span>
                  <div className="text-right max-w-[60%]">
                    <span className="font-medium text-foreground text-sm block">
                      {formData.pickupAddress}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formData.pickupPostalCode}
                    </span>
                  </div>
                </div>
              )}
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
                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Base rate (1 hr @ ${getEstimatedPricing()?.baseCost.toFixed(2)}/hr)</span>
                      <span>${getEstimatedPricing()?.baseCharge.toFixed(2)}</span>
                    </div>
                    {(getEstimatedPricing()?.hstAmount || 0) > 0 && (
                      <div className="flex justify-between">
                        <span>HST (13%)</span>
                        <span>+${getEstimatedPricing()?.hstAmount.toFixed(2)}</span>
                      </div>
                    )}
                    {(getEstimatedPricing()?.surgeAmount || 0) > 0 && (
                      <div className="flex justify-between text-amber-600">
                        <span>{isAsap ? "ASAP" : "Surge"} Fee</span>
                        <span>+${getEstimatedPricing()?.surgeAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-between pt-2 border-t border-border">
                    <span className="font-medium text-foreground">Total</span>
                    <span className="text-xl font-bold text-primary">
                      ${getEstimatedPricing()?.grandTotal.toFixed(2)}
                    </span>
                  </div>
                  {getEstimatedPricing()?.isMinimumFeeApplied && (
                    <p className="text-xs text-green-600">
                      Minimum booking fee of ${livePricingConfig?.minimumBookingFee} applied.
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
                <li>Minimum booking fee: ${getPricing().minimumBookingFee}</li>
                <li>Up to 14 minutes over: No extra charge</li>
                <li>15+ minutes over: Billed in 15-minute blocks ($/4 of hourly rate)</li>
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
            <TermsOfServiceDialog />

            <div className="text-xs text-muted-foreground bg-muted p-3 rounded">
              Final price adjusted based on actual visit duration.
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 5: Payment */}
      {currentStep === 5 && showPaymentStep && (
        <StripePaymentForm
          amount={Math.max(20, getEstimatedPricing()?.total || 20)}
          customerEmail={resolvedEmail}
          customerName={resolvedName}
          bookingDetails={{
            serviceDate: formData.serviceDate,
            services: selectedServices.map(id => {
              const service = serviceTasks.find(s => s.id === id);
              return service?.name || id;
            }).join(", "),
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onCancel={() => {
            setShowPaymentStep(false);
            setCurrentStep(4);
          }}
        />
      )}

      {/* Navigation Buttons */}
      {serviceFor && !showPaymentStep && (
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
              onClick={proceedToPayment}
              disabled={!agreedToPolicy || isSubmitting}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          )}
        </div>
      )}
    </div>
  );
};