import { useState, useRef, useMemo, useEffect } from "react";
import { CareConditionsChecklist } from "@/components/client/CareConditionsChecklist";
import { detectContactInfo } from "@/lib/careConditions";
import { TermsOfServiceDialog } from "@/components/client/TermsOfServiceDialog";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, AlertCircle, User, Users, MapPin, Calendar, Clock, DoorOpen, Shield, Stethoscope, Camera, Eye, EyeOff, Lock, DollarSign, Hospital, Globe, CreditCard, Loader2, Plus } from "lucide-react";
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
  calculateMultiServicePrice,
  getPricing,
} from "@/lib/businessConfig";
import { getRatesForCategory, fetchPricingRatesFromDB } from "@/lib/pricingConfigStore";
import {
  isValidCanadianPostalCode,
  formatPostalCode,
  isWithinAnyPSWCoverageAsync,
} from "@/lib/postalCodeUtils";
import { logUnservedOrder } from "@/lib/unservedOrderLogger";
import { initializePSWProfiles } from "@/lib/pswProfileStore";
import { addBooking, type BookingData } from "@/lib/bookingStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getTasks, calculateTimeRemaining, calculateTaskBasedPrice, getServiceCategoryForTasks, type TaskConfig, type ServiceCategory } from "@/lib/taskConfig";
import { useServiceTasks } from "@/hooks/useServiceTasks";
import { TimeMeter } from "./TimeMeter";
import { checkPrivacy, type PrivacyCheckResult } from "@/lib/privacyFilter";
import { LanguageSelector } from "@/components/LanguageSelector";
import { StripePaymentForm } from "@/components/client/StripePaymentForm";
import { InstallAppPrompt } from "@/components/client/InstallAppPrompt";
import type { GenderPreference } from "@/lib/shiftStore";

interface GuestBookingFlowProps {
  onBack: () => void;
  existingClient?: {
    name: string;
    email: string;
    phone: string;
  } | null;
}

type ServiceForType = "myself" | "someone-else" | null;

const steps = [
  { id: 1, title: "Who Is This For?", icon: Users },
  { id: 2, title: "Your Details", icon: User },
  { id: 3, title: "Address", icon: MapPin },
  { id: 4, title: "Service", icon: Calendar },
  { id: 5, title: "Confirm", icon: Check },
  { id: 6, title: "Payment", icon: CreditCard },
];

// Icon mapping for service categories
const getIconForTask = (taskName: string): typeof User => {
  const name = taskName.toLowerCase();
  if (name.includes("doctor") || name.includes("appointment")) return Stethoscope;
  if (name.includes("hospital") || name.includes("discharge")) return Hospital;
  if (name.includes("companion")) return Users;
  if (name.includes("meal") || name.includes("prep")) return Calendar;
  if (name.includes("medication") || name.includes("reminder")) return Clock;
  if (name.includes("housekeeping") || name.includes("cleaning")) return DoorOpen;
  if (name.includes("mobility") || name.includes("assist")) return MapPin;
  if (name.includes("respite")) return Shield;
  if (name.includes("bath") || name.includes("hygiene") || name.includes("personal")) return User;
  return User; // Default icon
};

// Helper to build service options from database tasks
const buildServiceOptionsFromTasks = (tasks: TaskConfig[]) => {
  return tasks.map(task => ({
    value: task.id,
    label: task.name,
    icon: getIconForTask(task.name),
    baseCost: task.baseCost,
    includedMinutes: task.includedMinutes,
    isHospitalDoctor: task.isHospitalDoctor,
    serviceCategory: task.serviceCategory,
    applyHST: task.applyHST,
  }));
};

// Postal code validation removed in favor of postalCodeUtils

// Postal code validation removed in favor of postalCodeUtils

export const GuestBookingFlow = ({ onBack, existingClient }: GuestBookingFlowProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isReturningClient = !!existingClient;
  const { tasks: serviceTasks, loading: tasksLoading } = useServiceTasks();

  // Refresh pricing rates from DB on mount to prevent stale localStorage cache
  useEffect(() => {
    fetchPricingRatesFromDB();
  }, []);

  const [currentStep, setCurrentStep] = useState(1);
  const [serviceFor, setServiceFor] = useState<ServiceForType>(null);
  const [entryPhoto, setEntryPhoto] = useState<File | null>(null);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [isAsap, setIsAsap] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<BookingData | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]);
  const [preferredGender, setPreferredGender] = useState<GenderPreference>("no-preference");
  const [selectedDuration, setSelectedDuration] = useState<number>(1); // 1-8 hours
  const [careConditions, setCareConditions] = useState<string[]>([]);
  const [careConditionsOther, setCareConditionsOther] = useState("");
  const [careConditionsOtherError, setCareConditionsOtherError] = useState<string | null>(null);

  // Prefill from estimator router state
  const estimatorState = location.state as { category?: string; tasks?: string[]; duration?: number } | null;
  const prefillApplied = useRef(false);
  useEffect(() => {
    if (estimatorState && !prefillApplied.current && serviceTasks.length > 0) {
      prefillApplied.current = true;
      if (estimatorState.tasks?.length) {
        // Match task IDs from estimator to available tasks
        const validTasks = estimatorState.tasks.filter(id => 
          serviceTasks.some(t => t.id === id)
        );
        if (validTasks.length > 0) setSelectedServices(validTasks);
      }
      if (estimatorState.duration) setSelectedDuration(estimatorState.duration);
      // Jump to step 4 (service details) if prefilled
      setCurrentStep(4);
      setServiceFor("myself");
    }
  }, [estimatorState, serviceTasks]);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Memoize available service types based on loaded tasks
  const availableServiceTypes = useMemo(() => buildServiceOptionsFromTasks(serviceTasks), [serviceTasks]);

  const [formData, setFormData] = useState({
    // Client info (for guests)
    clientFirstName: existingClient?.name.split(" ")[0] || "",
    clientLastName: existingClient?.name.split(" ").slice(1).join(" ") || "",
    clientEmail: existingClient?.email || "",
    clientPhone: existingClient?.phone || "",
    createPassword: "",
    confirmPassword: "",
    // Patient info
    patientFirstName: "",
    patientLastName: "",
    patientRelationship: "",
    // Address breakdown (dropoff/home address)
    streetNumber: "",
    streetName: "",
    unitNumber: "",
    city: "",
    province: "ON",
    postalCode: "",
    buzzerCode: "",
    entryPoint: "",
    // Transport pickup fields (for hospital/doctor visits)
    pickupAddress: "",
    pickupPostalCode: "",
    // Service details
    serviceDate: "",
    startTime: "",
    specialNotes: "",
    doctorOfficeName: "",
    doctorSuiteNumber: "",
  });
  const [pickupPostalCodeError, setPickupPostalCodeError] = useState<string | null>(null);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);
  const [specialNotesError, setSpecialNotesError] = useState<string | null>(null);
  const [patientNameError, setPatientNameError] = useState<string | null>(null);

  // Check if any selected service is hospital/doctor type (requires transport pickup)
  const includesDoctorEscort = useMemo(() => {
    return selectedServices.some(serviceId => {
      const service = availableServiceTypes.find(s => s.value === serviceId);
      return service?.isHospitalDoctor || 
        service?.label.toLowerCase().includes("doctor") ||
        service?.label.toLowerCase().includes("hospital");
    });
  }, [selectedServices, availableServiceTypes]);
  
  // Privacy check for special notes - allow doctor office numbers only in doctor fields
  const includesDoctorEscortForPrivacy = includesDoctorEscort;
  
  const specialNotesPrivacyCheck = useMemo(() => 
    checkPrivacy(formData.specialNotes, "special-instructions", "client"), 
    [formData.specialNotes]
  );
  
  const patientFullName = `${formData.patientFirstName} ${formData.patientLastName}`.trim();
  const patientNamePrivacyCheck = useMemo(() => 
    checkPrivacy(patientFullName, "patient-info", "client"), 
    [patientFullName]
  );

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === "streetNumber" || field === "streetName" || field === "city" || field === "postalCode") {
      setAddressError(null);
      setPostalCodeError(null);
    }
    if (field === "specialNotes") {
      setSpecialNotesError(null);
    }
    if (field === "patientFirstName" || field === "patientLastName") {
      setPatientNameError(null);
    }
  };

  // Handle special notes with privacy check
  const handleSpecialNotesChange = (value: string) => {
    updateFormData("specialNotes", value);
    const check = checkPrivacy(value, "special-instructions", "client");
    if (check.shouldBlock) {
      setSpecialNotesError(check.message);
    } else {
      setSpecialNotesError(null);
    }
  };

  // Handle patient name with privacy check
  const handlePatientNameChange = (field: "patientFirstName" | "patientLastName", value: string) => {
    updateFormData(field, value);
    const fullName = field === "patientFirstName" 
      ? `${value} ${formData.patientLastName}`.trim()
      : `${formData.patientFirstName} ${value}`.trim();
    const check = checkPrivacy(fullName, "patient-info", "client");
    if (check.shouldBlock) {
      setPatientNameError(check.message);
    } else {
      setPatientNameError(null);
    }
  };

  const handlePostalCodeChange = (value: string) => {
    const formatted = formatPostalCode(value);
    updateFormData("postalCode", formatted);
    setPostalCodeError(null);
  };

  const handlePickupPostalCodeChange = (value: string) => {
    const formatted = formatPostalCode(value);
    updateFormData("pickupPostalCode", formatted);
    if (formatted.length === 7 && !isValidCanadianPostalCode(formatted)) {
      setPickupPostalCodeError("Please enter a valid Canadian postal code");
    } else {
      setPickupPostalCodeError(null);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setEntryPhoto(file);
  };

  const getStreetAddress = () => {
    return `${formData.streetNumber} ${formData.streetName}`.trim();
  };

  const getFullAddress = () => {
    const parts = [getStreetAddress()];
    if (formData.unitNumber) parts.push(`Unit ${formData.unitNumber}`);
    if (formData.city) parts.push(formData.city);
    if (formData.province) parts.push(formData.province);
    if (formData.postalCode) parts.push(formData.postalCode);
    return parts.join(", ");
  };

  const getClientFullName = () => {
    return `${formData.clientFirstName} ${formData.clientLastName}`.trim();
  };

  const validateAddress = async (): Promise<boolean> => {
    if (!getStreetAddress().trim() || !formData.city.trim()) return true;
    
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
        // Passively log unserved order — non-blocking
        logUnservedOrder({
          postalCode: formData.postalCode,
          city: formData.city || undefined,
          serviceType: selectedServices.map(id => {
            const svc = availableServiceTypes.find(s => s.value === id);
            return svc?.label;
          }).filter(Boolean).join(", ") || undefined,
          requestedStartTime: formData.serviceDate && formData.startTime ? `${formData.serviceDate}T${formData.startTime}` : undefined,
          radiusCheckedKm: coverageCheck.activeRadiusKm,
          pswCountFound: 0,
          clientName: `${formData.clientFirstName} ${formData.clientLastName}`.trim() || undefined,
            clientPhone: formData.clientPhone || undefined,
            clientEmail: formData.clientEmail || existingClient?.email || undefined,
            fullClientPayload: {
            clientFirstName: formData.clientFirstName,
            clientLastName: formData.clientLastName,
            clientName: `${formData.clientFirstName} ${formData.clientLastName}`.trim(),
            clientEmail: formData.clientEmail || existingClient?.email || "",
            clientPhone: formData.clientPhone || existingClient?.phone || "",
            streetNumber: formData.streetNumber,
            streetName: formData.streetName,
            streetAddress: getStreetAddress(),
            unitNumber: formData.unitNumber,
            city: formData.city,
            province: formData.province,
            postalCode: formData.postalCode,
            address: getFullAddress(),
            patientFirstName: serviceFor === "myself" ? formData.clientFirstName : formData.patientFirstName,
            patientLastName: serviceFor === "myself" ? formData.clientLastName : formData.patientLastName,
            patientName: serviceFor === "myself" ? getClientFullName() : patientFullName,
            patientRelationship: formData.patientRelationship,
            serviceDate: formData.serviceDate,
            startTime: formData.startTime,
            selectedServices,
            serviceType: selectedServices.map(id => {
              const svc = availableServiceTypes.find(s => s.value === id);
              return svc?.label || id;
            }),
            specialNotes: formData.specialNotes,
            buzzerCode: formData.buzzerCode,
            entryPoint: formData.entryPoint,
            isAsap,
            preferredGender,
            preferredLanguages,
            pickupAddress: formData.pickupAddress,
            pickupPostalCode: formData.pickupPostalCode,
          },
        });
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

  const canProceedFromStep = (step: number): boolean => {
    switch (step) {
      case 2:
        if (!isReturningClient) {
          if (serviceFor === "someone-else" && patientNamePrivacyCheck.shouldBlock) {
            return false;
          }
          if (serviceFor === "someone-else" && !formData.patientFirstName.trim()) {
            return false;
          }
          return !!(formData.clientFirstName && formData.clientEmail && formData.clientPhone);
        }
        return true;
      case 3:
        return !!(formData.streetNumber && formData.streetName && formData.city && formData.postalCode && isValidCanadianPostalCode(formData.postalCode));
      case 4:
        if (specialNotesPrivacyCheck.shouldBlock) {
          return false;
        }
        if (includesDoctorEscort) {
          if (!formData.pickupAddress || !formData.pickupPostalCode || !isValidCanadianPostalCode(formData.pickupPostalCode)) {
            return false;
          }
        }
        return selectedServices.length > 0 && !!formData.serviceDate && !!formData.startTime;
      default:
        return true;
    }
  };

  const nextStep = async () => {
    if (currentStep === 3) {
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
    if (type === "myself" && existingClient) {
      const parts = existingClient.name.split(" ");
      updateFormData("patientFirstName", parts[0] || "");
      updateFormData("patientLastName", parts.slice(1).join(" ") || "");
    }
    setCurrentStep(2);
  };

  const toggleService = (serviceValue: string) => {
    setSelectedServices(prev => {
      const isRemoving = prev.includes(serviceValue);
      if (isRemoving) return prev.filter(s => s !== serviceValue);

      // BUSINESS RULE: Doctor/Hospital must be separate orders
      const clickedTask = availableServiceTypes.find(s => s.value === serviceValue);
      const clickedIsSpecialty = clickedTask?.isHospitalDoctor;
      
      let next: string[];
      if (clickedIsSpecialty) {
        next = prev.filter(id => {
          const t = availableServiceTypes.find(s => s.value === id);
          return t?.isHospitalDoctor;
        });
        if (next.length < prev.length) {
          toast.info("Doctor/Hospital services must be booked separately from home care services.");
        }
      } else {
        next = prev.filter(id => {
          const t = availableServiceTypes.find(s => s.value === id);
          return !t?.isHospitalDoctor;
        });
        if (next.length < prev.length) {
          toast.info("Home care services must be booked separately from Doctor/Hospital services.");
        }
      }
      next.push(serviceValue);
      return next;
    });
  };

  // Calculate estimated care minutes from selected tasks
  const estimatedCareMinutes = useMemo(() => {
    return selectedServices.reduce((total, serviceId) => {
      const service = availableServiceTypes.find(s => s.value === serviceId);
      return total + (service?.includedMinutes || 30);
    }, 0);
  }, [selectedServices, availableServiceTypes]);

  const estimatedCareHours = Math.max(1, estimatedCareMinutes / 60);

  // Check if companionship is selected
  const hasCompanionship = useMemo(() => {
    return selectedServices.some(serviceId => {
      const service = availableServiceTypes.find(s => s.value === serviceId);
      return service?.label.toLowerCase().includes("companion");
    });
  }, [selectedServices, availableServiceTypes]);

  // Determine the dominant service category
  const dominantCategory = useMemo((): ServiceCategory => {
    if (selectedServices.length === 0) return "standard";
    return getServiceCategoryForTasks(selectedServices);
  }, [selectedServices]);

  // Auto-adjust duration when tasks push estimate above current selection
  useEffect(() => {
    if (estimatedCareHours > selectedDuration) {
      setSelectedDuration(estimatedCareHours);
    }
  }, [estimatedCareHours]); // eslint-disable-line react-hooks/exhaustive-deps

  const getEstimatedPricing = () => {
    if (selectedServices.length === 0) return null;
    const rates = getRatesForCategory(dominantCategory);
    const durationHours = Math.max(selectedDuration, 1);
    const additionalHalfHours = Math.max(0, Math.round((durationHours - 1) * 2));
    const baseCost = rates.firstHour + additionalHalfHours * rates.per30Min;

    // Apply surge
    const pricing = getPricing();
    let surgeAmount = 0;
    if (pricing.surgeMultiplier > 1) {
      surgeAmount = baseCost * (pricing.surgeMultiplier - 1);
    }

    // Regional surcharge
    let regionalSurcharge = 0;
    if (formData.postalCode && pricing.surgeZones) {
      const fsa = formData.postalCode.substring(0, 3).toUpperCase();
      const cityLower = formData.city?.toLowerCase() || "";
      for (const zone of pricing.surgeZones) {
        if (!zone.enabled) continue;
        const matchesPostal = zone.postalCodePrefixes?.some((p: string) => fsa.startsWith(p.toUpperCase()));
        const matchesCity = zone.cities?.some((c: string) => cityLower.includes(c.toLowerCase()));
        if (matchesPostal || matchesCity) {
          regionalSurcharge += (zone.clientSurcharge || 0) * durationHours;
          break;
        }
      }
    }

    const preHstTotal = baseCost + surgeAmount + regionalSurcharge;

    // Calculate taxable fraction based on selected tasks' applyHST flags
    let taxableFraction = 0;
    const selectedTaskObjects = selectedServices
      .map(id => availableServiceTypes.find(s => s.value === id))
      .filter(Boolean);
    if (selectedTaskObjects.length > 0) {
      const totalMin = selectedTaskObjects.reduce((s, t) => s + (t!.includedMinutes || 30), 0);
      const taxableMin = selectedTaskObjects.filter(t => t!.applyHST).reduce((s, t) => s + (t!.includedMinutes || 30), 0);
      taxableFraction = totalMin > 0 ? taxableMin / totalMin : 0;
    }

    const hstAmount = preHstTotal * Math.max(0, Math.min(1, taxableFraction)) * 0.13;
    const total = preHstTotal + hstAmount;

    return {
      subtotal: baseCost,
      surgeAmount,
      regionalSurcharge,
      hstAmount,
      total,
      totalHours: durationHours,
      totalMinutes: durationHours * 60,
      serviceCategory: dominantCategory,
      exceedsBaseHour: durationHours > 1,
    };
  };

  const getCalculatedEndTime = () => {
    if (!formData.startTime) return "";
    
    const [hours, mins] = formData.startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + (selectedDuration * 60);
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  // Validation for step 5 before proceeding to payment
  const validateBeforePayment = (): boolean => {
    const errors: string[] = [];
    
    // Check privacy violations first
    if (specialNotesPrivacyCheck.shouldBlock) {
      errors.push("Please remove contact information from special instructions");
    }
    if (patientNamePrivacyCheck.shouldBlock) {
      errors.push("Please remove contact information from patient name field");
    }
    
    // Validate all required fields
    if (!isReturningClient) {
      if (!formData.createPassword) {
        errors.push("Please create a password to save your information");
      } else if (formData.createPassword.length < 6) {
        errors.push("Password must be at least 6 characters");
      } else if (formData.createPassword !== formData.confirmPassword) {
        errors.push("Passwords do not match");
      }
    }

    if (!agreedToPolicy) {
      errors.push("Please agree to the cancellation policy");
    }

    // Show all validation errors
    if (errors.length > 0) {
      setValidationErrors(errors);
      errors.forEach(error => toast.error(error));
      return false;
    }

    setValidationErrors([]);
    return true;
  };

  // Handle proceeding to payment step
  const proceedToPayment = () => {
    if (validateBeforePayment()) {
      // CRITICAL: Resolve email/name from existingClient for returning clients, formData for guests
      const clientEmail = isReturningClient 
        ? existingClient?.email?.trim() 
        : formData.clientEmail?.trim();
      const clientName = isReturningClient 
        ? existingClient?.name?.trim() 
        : getClientFullName()?.trim();
      
      console.log("📧 Client email before payment:", clientEmail);
      console.log("👤 Client name before payment:", clientName);
      console.log("🔄 Is returning client:", isReturningClient);
      
      if (!clientEmail) {
        toast.error("Missing email address", {
          description: "Please go back and enter your email address."
        });
        setCurrentStep(2);
        return;
      }
      
      if (!clientName) {
        toast.error("Missing name", {
          description: "Please go back and enter your name."
        });
        setCurrentStep(2);
        return;
      }
      
      setShowPaymentStep(true);
      setCurrentStep(6);
    }
  };

  // Handle payment success - complete the booking
  const handlePaymentSuccess = async (intentId: string) => {
    setPaymentIntentId(intentId);
    await handleSubmit(intentId);
  };

  // Handle payment error
  const handlePaymentError = (error: string) => {
    toast.error(error);
  };

  // Go back from payment step
  const handlePaymentCancel = () => {
    setShowPaymentStep(false);
    setCurrentStep(5);
  };

  const handleSubmit = async (paidIntentId?: string) => {
    setIsSubmitting(true);
    
    let userId: string | null = null;
    
    // Create Supabase Auth account for new clients
    if (!isReturningClient && formData.createPassword) {
      try {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: formData.clientEmail,
          password: formData.createPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/client`,
            data: {
              first_name: formData.clientFirstName,
              last_name: formData.clientLastName,
              full_name: getClientFullName(),
              phone: formData.clientPhone,
            },
          },
        });
        
        if (signUpError) {
          console.error("Account creation error:", signUpError);
          // If user already exists, try to update their password
          if (signUpError.message.includes("already registered")) {
            console.log("User already exists, attempting password update via edge function...");
            try {
              const { error: updateError } = await supabase.functions.invoke('update-user-password', {
                body: { 
                  email: formData.clientEmail, 
                  newPassword: formData.createPassword 
                }
              });
              
              if (!updateError) {
                toast.success("Your password has been updated!");
                console.log("✅ Password updated for existing user:", formData.clientEmail);
              } else {
                console.error("Password update failed:", updateError);
                // Continue with booking anyway - they can use magic link or reset password
              }
            } catch (updateEx) {
              console.error("Password update exception:", updateEx);
              // Continue with booking anyway
            }
          } else {
            toast.error("Account creation failed", {
              description: signUpError.message,
            });
          }
        } else if (signUpData.user) {
          userId = signUpData.user.id;
          console.log("✅ Client account created:", signUpData.user.email);
          
          // Create client profile in database
          const { error: profileError } = await supabase
            .from("client_profiles")
            .insert({
              user_id: signUpData.user.id,
              email: formData.clientEmail,
              first_name: formData.clientFirstName,
              full_name: getClientFullName(),
              phone: formData.clientPhone,
              default_address: getFullAddress(),
              default_postal_code: formData.postalCode,
            });
          
          if (profileError) {
            console.error("Profile creation error:", profileError);
          }
        }
      } catch (error) {
        console.error("Auth signup exception:", error);
      }
    }
    
    // Create booking with "Invoice Pending" status (no payment integration yet)
    const pricing = getEstimatedPricing();
    
    // Use the memoized includesDoctorEscort which checks the database is_hospital_doctor flag
    const isTransportBooking = includesDoctorEscort;
    
    const bookingData: Omit<BookingData, "id" | "createdAt"> = {
      paymentStatus: paidIntentId ? "paid" : "invoice-pending",
      stripePaymentIntentId: paidIntentId || undefined,
      serviceType: selectedServices.map(id => {
        const svc = serviceTasks.find(t => t.id === id);
        return svc?.name || id;
      }),
      date: formData.serviceDate,
      startTime: formData.startTime,
      endTime: getCalculatedEndTime(),
      status: "pending", // Pending until PSW is assigned
      hours: pricing?.totalHours || 1,
      hourlyRate: pricing ? pricing.subtotal / (pricing.totalHours || 1) : 35,
      subtotal: pricing?.subtotal || 0,
      surgeAmount: pricing?.surgeAmount || 0,
      total: pricing?.total || 0,
      isAsap,
      wasRefunded: false,
      orderingClient: {
        name: isReturningClient ? existingClient?.name || "" : getClientFullName(),
        firstName: isReturningClient ? existingClient?.name.split(" ")[0] || "" : formData.clientFirstName,
        lastName: isReturningClient ? existingClient?.name.split(" ").slice(1).join(" ") || "" : formData.clientLastName,
        address: getFullAddress(),
        postalCode: formData.postalCode,
        phone: isReturningClient ? existingClient?.phone || "" : formData.clientPhone,
        email: isReturningClient ? existingClient?.email || "" : formData.clientEmail,
        isNewAccount: !isReturningClient,
        streetNumber: formData.streetNumber,
        streetName: formData.streetName,
      },
      patient: serviceFor === "myself" 
        ? { 
            name: isReturningClient ? existingClient?.name || "" : getClientFullName(),
            firstName: isReturningClient ? existingClient?.name.split(" ")[0] || "" : formData.clientFirstName,
            lastName: isReturningClient ? existingClient?.name.split(" ").slice(1).join(" ") || "" : formData.clientLastName,
            address: getFullAddress(),
            postalCode: formData.postalCode,
            relationship: "Self",
            preferredLanguages: preferredLanguages.length > 0 ? preferredLanguages : undefined,
            preferredGender: preferredGender,
          }
        : { 
            name: patientFullName,
            firstName: formData.patientFirstName,
            lastName: formData.patientLastName,
            address: getFullAddress(),
            postalCode: formData.postalCode,
            relationship: formData.patientRelationship,
            preferredLanguages: preferredLanguages.length > 0 ? preferredLanguages : undefined,
            preferredGender: preferredGender,
          },
      // Transport fields (for Hospital/Doctor visits)
      // Pickup = Hospital/Clinic address, Dropoff = Patient's home (stored in patient_address)
      pickupAddress: isTransportBooking ? formData.pickupAddress : undefined,
      pickupPostalCode: isTransportBooking ? formData.pickupPostalCode : undefined,
      isTransportBooking,
      pswAssigned: null,
      specialNotes: formData.specialNotes,
      careConditions: careConditions.length > 0 ? careConditions : undefined,
      careConditionsOther: careConditionsOther.trim() || undefined,
      doctorOfficeName: formData.doctorOfficeName || undefined,
      doctorSuiteNumber: formData.doctorSuiteNumber || undefined,
      entryPhoto: entryPhoto?.name,
      buzzerCode: formData.buzzerCode || undefined,
      entryPoint: formData.entryPoint || undefined,
      emailNotifications: {
        confirmationSent: true, // Simulated - would be sent by backend
        confirmationSentAt: new Date().toISOString(),
        reminderSent: false,
      },
      adminNotifications: {
        notified: true, // Simulated - admin is notified
        notifiedAt: new Date().toISOString(),
      },
    };

    // Call async addBooking function
    const saveAndNotify = async () => {
      const savedBooking = await addBooking(bookingData);
      console.log("✅ BOOKING CONFIRMED:", savedBooking);
      
      // Persist payment_method_id for future off-session charges (overtime)
      const savedPaymentMethodId = sessionStorage.getItem("last_payment_method_id");
      if (savedPaymentMethodId && savedBooking.bookingUuid) {
        supabase.from("bookings")
          .update({ stripe_payment_method_id: savedPaymentMethodId } as any)
          .eq("id", savedBooking.bookingUuid)
          .then(({ error: pmError }) => {
            if (pmError) console.warn("Failed to save payment method:", pmError);
            else console.log("💳 Payment method saved to booking for overtime billing");
          });
        sessionStorage.removeItem("last_payment_method_id");
      }
      
      setCompletedBooking(savedBooking);
      setIsSubmitting(false);
      setBookingComplete(true);
      
      toast.success("Booking confirmed! Check your email for details.");
    };

    saveAndNotify();
  };

  // includesDoctorEscort is now defined above as a memoized value

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
              Thank you, {formData.clientFirstName}!
            </p>
          </div>

          {/* Booking Code */}
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Your Booking Code</p>
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
              <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                Invoice Pending
              </Badge>
            </div>
          </div>

          {/* Cancellation Policy */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg text-left">
            <h4 className="font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Cancellation Policy
            </h4>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li>• <strong>4+ hours notice:</strong> Full refund available</li>
              <li>• <strong>Less than 4 hours:</strong> No refund (non-refundable)</li>
              <li>• <strong>ASAP bookings:</strong> Always non-refundable</li>
            </ul>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              To cancel, call our office or contact us through your account.
            </p>
          </div>

          {/* What's Next */}
          <div className="p-4 bg-muted rounded-lg text-left">
            <p className="text-foreground font-medium mb-2">What's next?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Confirmation email sent to {formData.clientEmail}</li>
              <li>• A PSW will be assigned to your booking</li>
              <li>• You'll receive a reminder before your appointment</li>
              <li>• Invoice will be sent after service completion</li>
            </ul>
          </div>

          {!isReturningClient && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <p className="text-sm text-foreground">
                <strong>Account Created!</strong> You can now sign in with your email and password for future bookings.
              </p>
            </div>
          )}

          {/* Install App Prompt for mobile users */}
          <InstallAppPrompt clientName={formData.clientFirstName} />

          <Button 
            variant="brand" 
            onClick={() => {
              // Clear checkout state and prevent back navigation
              window.history.replaceState(null, "", "/client");
              navigate("/client", { replace: true });
            }} 
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
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Request Caregiver – Immediate or Pre-Book a Date</h1>
        <p className="text-sm text-muted-foreground">
          {isReturningClient ? `Welcome back, ${existingClient?.name.split(" ")[0]}!` : "Book care for yourself or a loved one"}
        </p>
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted
                        ? "bg-primary text-primary-foreground"
                        : isCurrent
                        ? "bg-primary text-primary-foreground ring-4 ring-primary/20"
                        : "bg-card border-2 border-border text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : <StepIcon className="w-3 h-3" />}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 1: Who Is This For? */}
      {currentStep === 1 && !serviceFor && (
        <Card className="shadow-card bg-[hsl(220,40%,20%)] border-[hsl(220,40%,30%)] text-white relative overflow-hidden">
          <Plus className="absolute top-4 right-4 w-8 h-8 text-red-500" strokeWidth={3} />
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-white" />
              Who is this service for?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center gap-2 bg-[hsl(220,40%,15%)] border-[hsl(220,40%,25%)] text-white hover:bg-[hsl(220,40%,25%)] hover:border-[hsl(220,40%,35%)]"
              onClick={() => handleServiceForSelect("myself")}
            >
              <User className="w-7 h-7 text-white" />
              <span className="font-semibold text-base">Myself</span>
              <span className="text-sm text-white/70">I need care services</span>
            </Button>
            
            <Button
              variant="outline"
              className="w-full h-24 flex flex-col items-center justify-center gap-2 bg-[hsl(220,40%,15%)] border-[hsl(220,40%,25%)] text-white hover:bg-[hsl(220,40%,25%)] hover:border-[hsl(220,40%,35%)]"
              onClick={() => handleServiceForSelect("someone-else")}
            >
              <Users className="w-7 h-7 text-white" />
              <span className="font-semibold text-base">Someone Else</span>
              <span className="text-sm text-white/70">Booking for a family member or friend</span>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Client Details (for guests) */}
      {currentStep === 2 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {isReturningClient ? "Confirm Your Details" : "Your Contact Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isReturningClient ? (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground">{existingClient?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium text-foreground">{existingClient?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium text-foreground">{existingClient?.phone}</span>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="clientFirstName">First Name *</Label>
                    <Input
                      id="clientFirstName"
                      placeholder="Margaret"
                      value={formData.clientFirstName}
                      onChange={(e) => updateFormData("clientFirstName", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientLastName">Last Name</Label>
                    <Input
                      id="clientLastName"
                      placeholder="Thompson"
                      value={formData.clientLastName}
                      onChange={(e) => updateFormData("clientLastName", e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientEmail">Email Address *</Label>
                  <Input
                    id="clientEmail"
                    type="email"
                    placeholder="margaret@email.com"
                    value={formData.clientEmail}
                    onChange={(e) => updateFormData("clientEmail", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clientPhone">Phone Number *</Label>
                  <Input
                    id="clientPhone"
                    type="tel"
                    placeholder="(416) 555-1234"
                    value={formData.clientPhone}
                    onChange={(e) => updateFormData("clientPhone", e.target.value)}
                  />
                </div>
              </>
            )}

            {/* Patient info if booking for someone else */}
            {serviceFor === "someone-else" && (
              <div className="pt-4 border-t border-border space-y-4">
                <h3 className="font-medium text-foreground">Patient / Care Recipient Information</h3>
                <p className="text-xs text-muted-foreground">This is the person who will receive care.</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="patientFirstName">Patient First Name *</Label>
                    <Input
                      id="patientFirstName"
                      placeholder="Margaret"
                      value={formData.patientFirstName}
                      onChange={(e) => handlePatientNameChange("patientFirstName", e.target.value)}
                      className={patientNameError ? "border-destructive" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patientLastName">Patient Last Name</Label>
                    <Input
                      id="patientLastName"
                      placeholder="Thompson"
                      value={formData.patientLastName}
                      onChange={(e) => handlePatientNameChange("patientLastName", e.target.value)}
                      className={patientNameError ? "border-destructive" : ""}
                    />
                  </div>
                </div>
                {patientNameError && (
                  <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
                    <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                    <span className="text-xs text-destructive">{patientNameError}</span>
                  </div>
                )}
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

            {/* Caregiver Preferences Section */}
            <div className="pt-4 border-t border-border space-y-4">
              <h3 className="font-medium text-foreground flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Caregiver Preferences
              </h3>
              
              {/* Gender Preference */}
              <div className="space-y-2">
                <Label htmlFor="preferredGender">Preferred Gender of Caregiver</Label>
                <Select 
                  value={preferredGender}
                  onValueChange={(value) => setPreferredGender(value as GenderPreference)}
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

              {/* Language Preference */}
              <LanguageSelector
                selectedLanguages={preferredLanguages}
                onLanguagesChange={setPreferredLanguages}
                maxLanguages={2}
                label="Preferred Language(s)"
                description="English is the default. Select up to 2 additional languages if the patient prefers care in another language."
                placeholder="Add preferred language (optional)..."
                excludeEnglish={true}
              />
              <p className="text-xs text-muted-foreground">
                We'll try to match you with a PSW who speaks your preferred language.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Address */}
      {currentStep === 3 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Service Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="streetNumber">Street Number *</Label>
                <Input
                  id="streetNumber"
                  placeholder="123"
                  value={formData.streetNumber}
                  onChange={(e) => updateFormData("streetNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="streetName">Street Name *</Label>
                <Input
                  id="streetName"
                  placeholder="Main Street"
                  value={formData.streetName}
                  onChange={(e) => updateFormData("streetName", e.target.value)}
                />
              </div>
            </div>

            {/* Postal Code - Prominent placement */}
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code (e.g., K8N 1A1) *</Label>
              <Input
                id="postalCode"
                placeholder="K8N 1A1 or K8N1A1"
                value={formData.postalCode}
                onChange={(e) => handlePostalCodeChange(e.target.value)}
                maxLength={7}
                className={postalCodeError ? "border-destructive" : ""}
              />
              {postalCodeError && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {postalCodeError}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Accepts both formats: A1B 2C3 or A1B2C3
              </p>
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

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="buzzerCode">Buzzer Code</Label>
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

            {/* Address Error */}
            {addressError && (
              <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                <span className="text-sm text-destructive">{addressError}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4: Service Details */}
      {currentStep === 4 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Service Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* A. Services Needed */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Services Needed</Label>
              <p className="text-sm text-muted-foreground">Minimum booking is 1 hour.</p>
              {tasksLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-muted-foreground">Loading services...</span>
                </div>
              ) : (
              <div className="grid grid-cols-1 gap-2">
                {availableServiceTypes.map((service) => {
                  const Icon = service.icon;
                  const isSelected = selectedServices.includes(service.value);
                  return (
                    <button
                      key={service.value}
                      type="button"
                      onClick={() => toggleService(service.value)}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`flex-1 text-left text-sm ${isSelected ? "font-medium" : ""}`}>
                        {service.label}
                        <span className="text-muted-foreground font-normal"> ({service.includedMinutes} min)</span>
                        {service.applyHST && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium ml-1">+ HST</span>
                        )}
                      </span>
                      {isSelected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
              )}
            </div>

            {/* B. Estimated Care Time */}
            {selectedServices.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Estimated Care Time
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {estimatedCareMinutes >= 60
                      ? `${(estimatedCareMinutes / 60) % 1 === 0 ? (estimatedCareMinutes / 60) : (estimatedCareMinutes / 60).toFixed(1)} hours`
                      : `${estimatedCareMinutes} min`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on the services you selected
                </p>
              </div>
            )}


            {/* C. Choose Booking Duration */}
            {selectedServices.length > 0 && (
              <div className="space-y-2">
                <Label className="text-base font-semibold">Choose Booking Duration</Label>
                <p className="text-xs text-muted-foreground">
                  Choose how long you would like care. We'll estimate the time needed based on the services selected.
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 12].map((hours) => {
                    const isRecommended = hasCompanionship && [4, 6, 8, 12].includes(hours);
                    const isBelowEstimate = hours < estimatedCareHours;
                    return (
                      <button
                        key={hours}
                        type="button"
                        disabled={isBelowEstimate}
                        onClick={() => setSelectedDuration(hours)}
                        className={`p-2 rounded-lg border text-center text-sm transition-all ${
                          selectedDuration === hours
                            ? "border-primary bg-primary text-primary-foreground font-bold"
                            : isBelowEstimate
                            ? "border-border opacity-40 cursor-not-allowed"
                            : isRecommended
                            ? "border-primary/50 bg-primary/5 font-medium"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        {hours}h
                        {isRecommended && !isBelowEstimate && selectedDuration !== hours && (
                          <span className="block text-[10px] text-primary">★</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Transport Pickup Fields (for Hospital/Doctor visits) */}
            {includesDoctorEscort && (
              <div className="space-y-4 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                  <MapPin className="w-5 h-5" />
                  <Label className="font-medium">Pick-up Location (Required for Transport)</Label>
                </div>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Where should the PSW pick up the patient? This is required for security verification.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="pickupAddress">Pick-up Address *</Label>
                  <Input
                    id="pickupAddress"
                    placeholder="Hospital or doctor's office address"
                    value={formData.pickupAddress}
                    onChange={(e) => updateFormData("pickupAddress", e.target.value)}
                    className="bg-white dark:bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupPostalCode">Pick-up Postal Code *</Label>
                  <Input
                    id="pickupPostalCode"
                    placeholder="K8N 1A1"
                    value={formData.pickupPostalCode}
                    onChange={(e) => handlePickupPostalCodeChange(e.target.value)}
                    maxLength={7}
                    className={`bg-white dark:bg-background ${pickupPostalCodeError ? "border-destructive" : ""}`}
                  />
                  {pickupPostalCodeError && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {pickupPostalCodeError}
                    </p>
                  )}
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    PSW must be within 500m of this location to start the shift
                  </p>
                </div>

                <div className="space-y-3 pt-3 border-t border-amber-200 dark:border-amber-700">
                  <Label className="text-amber-800 dark:text-amber-200 font-medium">Doctor's Office Details</Label>
                  <Input
                    placeholder="Doctor's Office Name"
                    value={formData.doctorOfficeName}
                    onChange={(e) => updateFormData("doctorOfficeName", e.target.value)}
                    className="bg-white dark:bg-background"
                  />
                  <Input
                    placeholder="Suite Number (optional)"
                    value={formData.doctorSuiteNumber}
                    onChange={(e) => updateFormData("doctorSuiteNumber", e.target.value)}
                    className="bg-white dark:bg-background"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Drop-off address will be the service address entered earlier.
                </p>
              </div>
            )}

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="serviceDate">Date *</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={formData.serviceDate}
                  onChange={(e) => updateFormData("serviceDate", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time *</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => updateFormData("startTime", e.target.value)}
                />
              </div>
            </div>

            {/* ── Care Needs ── */}
            <CareConditionsChecklist
              selectedConditions={careConditions}
              onConditionsChange={setCareConditions}
              otherText={careConditionsOther}
              onOtherTextChange={setCareConditionsOther}
              otherTextError={careConditionsOtherError}
              onOtherTextErrorChange={setCareConditionsOtherError}
            />

            <div className="space-y-2">
              <Label htmlFor="specialNotes">Special Instructions (Optional)</Label>
              <Textarea
                id="specialNotes"
                placeholder="Entry instructions, parking notes, or other details for the caregiver..."
                value={formData.specialNotes}
                onChange={(e) => handleSpecialNotesChange(e.target.value)}
                rows={3}
                className={specialNotesError ? "border-destructive" : ""}
              />
              {specialNotesError && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <span className="text-xs text-destructive">{specialNotesError}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                For privacy, use our office line for communication with staff.
              </p>
            </div>

            {/* D. Price Breakdown */}
            {getEstimatedPricing() && (
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <h4 className="font-semibold text-foreground flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Price Estimate
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">
                      {selectedDuration} hour{selectedDuration !== 1 ? "s" : ""} of care
                    </span>
                    <span className="font-medium text-foreground">
                      ${getEstimatedPricing()?.subtotal.toFixed(2)}
                    </span>
                  </div>
                  {(getEstimatedPricing()?.surgeAmount ?? 0) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Surge Pricing</span>
                      <span className="font-medium text-amber-600">
                        +${getEstimatedPricing()?.surgeAmount.toFixed(2)}
                      </span>
                    </div>
                  )}
                  {(getEstimatedPricing()?.regionalSurcharge ?? 0) > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Regional Fee</span>
                      <span className="font-medium text-amber-600">
                        +${getEstimatedPricing()?.regionalSurcharge.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="border-t border-border pt-2 space-y-1">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium text-foreground">
                      ${((getEstimatedPricing()?.subtotal ?? 0) + (getEstimatedPricing()?.surgeAmount ?? 0) + (getEstimatedPricing()?.regionalSurcharge ?? 0)).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">HST (13%)</span>
                    <span className="font-medium text-foreground">
                      ${getEstimatedPricing()?.hstAmount.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <span className="font-semibold text-foreground">Total Estimate</span>
                    <span className="text-xl font-bold text-primary">
                      ${getEstimatedPricing()?.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 5: Confirmation & Account Creation */}
      {currentStep === 5 && (
        <div className="space-y-4">
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
                    {serviceFor === "myself" ? getClientFullName() : patientFullName}
                  </span>
                </div>
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Services</span>
                  <div className="text-right">
                    {selectedServices.map(serviceValue => {
                      const service = availableServiceTypes.find(s => s.value === serviceValue);
                      return (
                        <span key={serviceValue} className="block font-medium text-foreground text-sm">
                          {service?.label}
                        </span>
                      );
                    })}
                  </div>
                </div>
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
                  <span className="text-muted-foreground">Address</span>
                  <span className="font-medium text-foreground text-right text-sm max-w-[60%]">
                    {getFullAddress()}
                  </span>
                </div>
              </div>

              {/* Price Summary Card */}
              {getEstimatedPricing() && (
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                  <h4 className="font-medium text-foreground flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-primary" />
                    Price Summary
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Base Rate ({getPricing().minimumHours} Hour)</span>
                      <span className="font-medium text-foreground">
                        ${getEstimatedPricing()?.subtotal.toFixed(2)}
                      </span>
                    </div>
                    {getEstimatedPricing()?.exceedsBaseHour && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Additional Time (if needed)</span>
                        <span className="font-medium text-amber-600">
                          Billed at sign-out
                        </span>
                      </div>
                    )}
                    {getEstimatedPricing()?.surgeAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">Surge Pricing ({((getPricing().surgeMultiplier - 1) * 100).toFixed(0)}%)</span>
                        <span className="font-medium text-amber-600">
                          +${getEstimatedPricing()?.surgeAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="pt-3 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-foreground">Total{getEstimatedPricing()?.surgeAmount > 0 ? " (incl. Surge)" : ""}</span>
                      <span className="text-2xl font-bold text-primary">
                        ${getEstimatedPricing()?.total.toFixed(2)}
                      </span>
                    </div>
                    {getEstimatedPricing()?.surgeAmount > 0 && (
                      <p className="text-xs text-amber-600 mt-1">
                        High demand pricing is currently active
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Billing Info */}
              <div className="p-3 bg-primary/5 rounded-lg text-sm">
                <p className="font-medium text-foreground mb-1">Billing & Reports sent to:</p>
                <p className="text-muted-foreground">{getClientFullName()}</p>
                <p className="text-muted-foreground">{formData.clientEmail}</p>
              </div>

              {/* Billing Policy */}
              <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Billing Policy:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Bookings are charged based on selected duration ({selectedDuration} hour{selectedDuration > 1 ? 's' : ''})</li>
                  <li>Up to 14 minutes over: No extra charge</li>
                  <li>15+ minutes over: Billed in 30-minute blocks</li>
                </ul>
              </div>

              {/* Policy Agreement */}
              <div className={`flex items-start space-x-3 p-3 rounded-lg border ${!agreedToPolicy && validationErrors.length > 0 ? 'border-destructive bg-destructive/5' : 'border-transparent'}`}>
                <Checkbox
                  id="agreePolicy"
                  checked={agreedToPolicy}
                  onCheckedChange={(checked) => {
                    setAgreedToPolicy(checked as boolean);
                    if (checked) {
                      setValidationErrors(prev => prev.filter(e => !e.includes("cancellation policy")));
                    }
                  }}
                />
                <Label htmlFor="agreePolicy" className={`text-sm cursor-pointer ${!agreedToPolicy && validationErrors.length > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                  I agree to the cancellation policy. Cancellations within 4 hours and ASAP bookings are non-refundable.
                </Label>
              </div>
              <TermsOfServiceDialog />
              {!agreedToPolicy && validationErrors.includes("Please agree to the cancellation policy") && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  You must agree to the cancellation policy to continue
                </p>
              )}

              {/* Validation Errors Summary */}
              {validationErrors.length > 0 && (
                <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                  <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Please fix the following:
                  </p>
                  <ul className="text-sm text-destructive space-y-1">
                    {validationErrors.map((error, i) => (
                      <li key={i}>• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Account Creation for Guests */}
          {!isReturningClient && (
            <Card className="shadow-card">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Lock className="w-5 h-5 text-primary" />
                  Create Your Account
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Save your information for easy repeat bookings and access to invoices.
                </p>
                
                <div className="space-y-2">
                  <Label htmlFor="createPassword">Create Password *</Label>
                  <div className="relative">
                    <Input
                      id="createPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={formData.createPassword}
                      onChange={(e) => updateFormData("createPassword", e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    value={formData.confirmPassword}
                    onChange={(e) => updateFormData("confirmPassword", e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Step 6: Payment */}
      {currentStep === 6 && showPaymentStep && (
        <StripePaymentForm
          amount={Math.max(20, getEstimatedPricing()?.total || 20)}
          customerEmail={isReturningClient ? existingClient?.email || "" : formData.clientEmail}
          customerName={isReturningClient ? existingClient?.name || "" : getClientFullName()}
          bookingDetails={{
            serviceDate: formData.serviceDate,
            services: selectedServices.join(", "),
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onCancel={handlePaymentCancel}
        />
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
            <div className="flex-1 flex flex-col gap-1">
              <Button 
                variant="brand" 
                className="w-full" 
                onClick={nextStep}
                disabled={isCheckingAddress || !canProceedFromStep(currentStep)}
              >
                {isCheckingAddress ? "Checking..." : "Continue"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              {/* Show validation hint when button is disabled */}
              {!canProceedFromStep(currentStep) && currentStep === 3 && (
                <p className="text-xs text-destructive text-center">
                  {!formData.streetNumber ? "Please enter a street number" : 
                   !formData.streetName ? "Please enter a street name" :
                   !formData.city ? "Please enter a city" :
                   !formData.postalCode ? "Please enter a postal code" :
                   !isValidCanadianPostalCode(formData.postalCode) ? "Please enter a valid postal code (e.g., K8N 1A1)" : ""}
                </p>
              )}
              {!canProceedFromStep(currentStep) && currentStep === 2 && !isReturningClient && (
                <p className="text-xs text-destructive text-center">
                  {!formData.clientFirstName ? "Please enter your first name" : 
                   !formData.clientEmail ? "Please enter your email" :
                   !formData.clientPhone ? "Please enter your phone number" : ""}
                </p>
              )}
              {!canProceedFromStep(currentStep) && currentStep === 4 && (
                <p className="text-xs text-destructive text-center">
                  {selectedServices.length === 0 ? "Please select at least one service" : 
                   !formData.serviceDate ? "Please select a date" :
                   !formData.startTime ? "Please select a start time" : ""}
                </p>
              )}
            </div>
          ) : currentStep === 5 ? (
            <Button 
              variant="brand" 
              className="flex-1" 
              onClick={proceedToPayment}
              disabled={!agreedToPolicy || isSubmitting}
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Proceed to Payment
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
};
