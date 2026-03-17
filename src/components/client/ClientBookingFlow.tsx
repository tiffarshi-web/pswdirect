import { useState, useRef, useMemo } from "react";
import { TermsOfServiceDialog } from "@/components/client/TermsOfServiceDialog";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, AlertCircle, User, Users, MapPin, Calendar, Clock, DoorOpen, Shield, Zap, Stethoscope, Camera, Hospital, Phone, X, Loader2, CreditCard } from "lucide-react";
import { CareConditionsChecklist } from "@/components/client/CareConditionsChecklist";
import { detectContactInfo } from "@/lib/careConditions";
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
  calculateDurationBasedPrice,
  formatDuration,
  getPricing,
} from "@/lib/businessConfig";
import { getServiceCategoryForTasks, type ServiceCategory } from "@/lib/taskConfig";
import {
  isValidCanadianPostalCode,
  formatPostalCode,
  isWithinAnyPSWCoverageAsync,
} from "@/lib/postalCodeUtils";
import { logUnservedOrder } from "@/lib/unservedOrderLogger";
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
  { id: 3, title: "Services & Duration", icon: Calendar },
  { id: 4, title: "Review", icon: Check },
  { id: 5, title: "Payment", icon: CreditCard },
];

const getIconForTask = (taskName: string) => {
  const l = taskName.toLowerCase();
  if (l.includes("doctor") || l.includes("escort")) return Stethoscope;
  if (l.includes("hospital") || l.includes("discharge")) return Hospital;
  if (l.includes("personal") || l.includes("care") || l.includes("bath") || l.includes("hygiene")) return User;
  if (l.includes("respite")) return Shield;
  if (l.includes("companion") || l.includes("supervision")) return Users;
  if (l.includes("meal") || l.includes("prep")) return Calendar;
  if (l.includes("medication")) return Clock;
  if (l.includes("housekeeping") || l.includes("light")) return DoorOpen;
  if (l.includes("transport") || l.includes("mobility")) return MapPin;
  return Calendar;
};

// Duration options: 1h to 8h in 0.5h increments + 12h option
const DURATION_OPTIONS = [
  ...Array.from({ length: 15 }, (_, i) => {
    const hours = 1 + i * 0.5;
    return { value: hours, label: `${hours}h` };
  }),
  { value: 12, label: "12h" },
];

export const ClientBookingFlow = ({
  onBack,
  clientName,
  clientEmail,
  clientPhone,
}: ClientBookingFlowProps) => {
  const navigate = useNavigate();
  const { user } = useSupabaseAuth();

  const resolvedEmail = clientEmail || user?.email || "";
  const resolvedName = clientName || user?.user_metadata?.full_name || "";
  const resolvedPhone = clientPhone || "";

  const { tasks: serviceTasks, loading: tasksLoading } = useServiceTasks();

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
  const [selectedDuration, setSelectedDuration] = useState<number>(1); // hours
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<BookingData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferredLanguages, setPreferredLanguages] = useState<string[]>([]);
  const [careConditions, setCareConditions] = useState<string[]>([]);
  const [careConditionsOther, setCareConditionsOther] = useState("");
  const [careConditionsOtherError, setCareConditionsOtherError] = useState<string | null>(null);
  const [specialNotesError, setSpecialNotesError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    patientFirstName: "",
    patientLastName: "",
    patientRelationship: "",
    streetNumber: "",
    streetName: "",
    unitNumber: "",
    city: "",
    province: "ON",
    postalCode: "",
    buzzerCode: "",
    entryPoint: "",
    serviceDate: "",
    startTime: "",
    specialNotes: "",
    doctorOfficeName: "",
    doctorSuiteNumber: "",
    pickupAddress: "",
    pickupPostalCode: "",
    preferredGender: "no-preference" as GenderPreference,
  });

  // Separate home-care tasks from doctor/hospital tasks
  const homeCareTasksList = useMemo(
    () => serviceTasks.filter((t) => !t.isHospitalDoctor),
    [serviceTasks]
  );
  const doctorHospitalTasks = useMemo(
    () => serviceTasks.filter((t) => t.isHospitalDoctor),
    [serviceTasks]
  );

  // Check if selected services include doctor/hospital
  const includesDoctorEscort = useMemo(
    () =>
      selectedServices.some((id) => {
        const t = serviceTasks.find((s) => s.id === id);
        return t?.isHospitalDoctor;
      }),
    [selectedServices, serviceTasks]
  );

  // Estimated care time from selected tasks
  const estimatedCareMinutes = useMemo(() => {
    return selectedServices.reduce((sum, id) => {
      const task = serviceTasks.find((t) => t.id === id);
      return sum + (task?.includedMinutes ?? 30);
    }, 0);
  }, [selectedServices, serviceTasks]);

  const estimatedCareHours = Math.max(estimatedCareMinutes / 60, 1); // min 1h

  // Check if companionship is selected
  const hasCompanionship = useMemo(
    () =>
      selectedServices.some((id) => {
        const t = serviceTasks.find((s) => s.id === id);
        return t?.name.toLowerCase().includes("companion") || t?.name.toLowerCase().includes("supervision");
      }),
    [selectedServices, serviceTasks]
  );

  // Service category for pricing
  const serviceCategory: ServiceCategory = useMemo(
    () => getServiceCategoryForTasks(selectedServices),
    [selectedServices]
  );

  // Auto-adjust duration when tasks change
  const minDuration = Math.max(1, Math.ceil(estimatedCareMinutes / 30) * 0.5);

  // Pricing calculation using new duration-based function
  // Calculate taxable fraction based on selected tasks' applyHST flags
  const taxableFraction = useMemo(() => {
    if (selectedServices.length === 0 || serviceTasks.length === 0) return 0;
    const selected = selectedServices.map(id => serviceTasks.find(t => t.id === id)).filter(Boolean);
    if (selected.length === 0) return 0;
    const totalMinutes = selected.reduce((sum, t) => sum + (t!.includedMinutes || 30), 0);
    if (totalMinutes === 0) return 0;
    const taxableMinutes = selected.filter(t => t!.applyHST).reduce((sum, t) => sum + (t!.includedMinutes || 30), 0);
    return taxableMinutes / totalMinutes;
  }, [selectedServices, serviceTasks]);

  const pricing = useMemo(() => {
    if (selectedServices.length === 0) return null;
    return calculateDurationBasedPrice(
      selectedDuration,
      serviceCategory,
      isAsap,
      formData.city,
      formData.postalCode,
      formData.serviceDate,
      formData.startTime,
      taxableFraction
    );
  }, [selectedServices, selectedDuration, serviceCategory, isAsap, formData.city, formData.postalCode, formData.serviceDate, formData.startTime, taxableFraction]);

  const updateFormData = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "streetNumber" || field === "streetName" || field === "city" || field === "postalCode") {
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
  const getStreetAddress = () => `${formData.streetNumber} ${formData.streetName}`.trim();

  const getFullAddress = () => {
    const parts = [getStreetAddress()];
    if (formData.unitNumber) parts.push(`Unit ${formData.unitNumber}`);
    if (formData.city) parts.push(formData.city);
    if (formData.province) parts.push(formData.province);
    if (formData.postalCode) parts.push(formData.postalCode);
    return parts.join(", ");
  };

  const validateAddress = async (): Promise<boolean> => {
    if (!getStreetAddress().trim() || !formData.city.trim()) return true;
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
    initializePSWProfiles();
    try {
      const coverageCheck = await isWithinAnyPSWCoverageAsync(formData.postalCode);
      if (!coverageCheck.withinCoverage) {
        logUnservedOrder({
          postalCode: formData.postalCode,
          city: formData.city || undefined,
          serviceType: selectedServices.map((id) => serviceTasks.find((t) => t.id === id)?.name).filter(Boolean).join(", ") || undefined,
          requestedStartTime: formData.serviceDate && formData.startTime ? `${formData.serviceDate}T${formData.startTime}` : undefined,
          radiusCheckedKm: coverageCheck.activeRadiusKm,
          pswCountFound: 0,
          clientName: clientName || undefined,
          clientPhone: clientPhone || undefined,
          clientEmail: resolvedEmail || undefined,
          fullClientPayload: {
            clientName: resolvedName,
            clientEmail: resolvedEmail,
            clientPhone: resolvedPhone,
            streetNumber: formData.streetNumber,
            streetName: formData.streetName,
            streetAddress: getStreetAddress(),
            unitNumber: formData.unitNumber,
            city: formData.city,
            province: formData.province,
            postalCode: formData.postalCode,
            address: getFullAddress(),
            patientName: serviceFor === "myself" ? resolvedName : `${formData.patientFirstName} ${formData.patientLastName}`.trim(),
            patientRelationship: formData.patientRelationship,
            serviceDate: formData.serviceDate,
            startTime: formData.startTime,
            selectedServices,
            serviceType: selectedServices.map((id) => serviceTasks.find((t) => t.id === id)?.name || id),
            specialNotes: formData.specialNotes,
            buzzerCode: formData.buzzerCode,
            entryPoint: formData.entryPoint,
            isAsap,
            preferredGender: formData.preferredGender,
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

  const getCalculatedEndTime = () => {
    if (!formData.startTime) return "";
    const [hours, mins] = formData.startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + selectedDuration * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  const nextStep = async () => {
    if (currentStep === 2) {
      const isValid = await validateAddress();
      if (!isValid) return;
    }
    if (currentStep === 3) {
      // Block if contact info in special notes or care conditions other
      if (specialNotesError) return;
      if (careConditionsOtherError) return;
      if (includesDoctorEscort) {
        if (!formData.pickupAddress.trim()) {
          setPickupPostalCodeError("Pick-up address is required for hospital/doctor services");
          return;
        }
        if (!formData.pickupPostalCode.trim()) {
          setPickupPostalCodeError("Pick-up postal code is required");
          return;
        }
        if (!isValidCanadianPostalCode(formData.pickupPostalCode)) {
          setPickupPostalCodeError("Please enter a valid Canadian postal code");
          return;
        }
      }
    }
    if (currentStep < 5) setCurrentStep((prev) => prev + 1);
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep((prev) => prev - 1);
  };

  const handleServiceForSelect = (type: ServiceForType) => {
    setServiceFor(type);
    if (type === "myself") {
      const nameParts = (clientName || "").split(" ");
      updateFormData("patientFirstName", nameParts[0] || "");
      updateFormData("patientLastName", nameParts.slice(1).join(" ") || "");
    }
    setCurrentStep(2);
  };
    setCurrentStep(2);
  };

  const toggleService = (serviceValue: string) => {
    setSelectedServices((prev) => {
      const next = prev.includes(serviceValue)
        ? prev.filter((s) => s !== serviceValue)
        : [...prev, serviceValue];
      // Auto-bump duration if tasks exceed current selection
      const newMinutes = next.reduce((sum, id) => {
        const task = serviceTasks.find((t) => t.id === id);
        return sum + (task?.includedMinutes ?? 30);
      }, 0);
      const newMin = Math.max(1, Math.ceil(newMinutes / 30) * 0.5);
      if (selectedDuration < newMin) {
        setSelectedDuration(newMin);
      }
      return next;
    });
  };

  const proceedToPayment = () => {
    if (!agreedToPolicy) {
      toast.error("Please agree to the cancellation policy");
      return;
    }
    if (!resolvedEmail?.trim()) {
      toast.error("Missing email address", {
        description: "Unable to retrieve your email. Please log out and back in.",
      });
      return;
    }
    if (!pricing || pricing.total < 20) {
      toast.error("Minimum booking amount is $20");
      return;
    }
    setShowPaymentStep(true);
    setCurrentStep(5);
  };

  const handleSubmit = async (paidIntentId?: string) => {
    setIsSubmitting(true);
    if (!resolvedEmail?.trim()) {
      toast.error("Missing email address", {
        description: "Unable to retrieve your email. Please log out and back in.",
      });
      setIsSubmitting(false);
      return;
    }
    try {
      const serviceNames = selectedServices.map((id) => {
        const service = serviceTasks.find((s) => s.id === id);
        return service?.name || id;
      });

      let bookingDate = formData.serviceDate;
      let bookingStartTime = formData.startTime;
      let bookingEndTime = getCalculatedEndTime();

      if (isAsap || !bookingDate || !bookingStartTime) {
        const now = new Date();
        bookingDate = now.toISOString().split("T")[0];
        now.setMinutes(now.getMinutes() + 15);
        bookingStartTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        const endDate = new Date(now.getTime() + selectedDuration * 60 * 60000);
        bookingEndTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
      }

      const bookingData: Omit<BookingData, "id" | "createdAt"> = {
        paymentStatus: paidIntentId ? "paid" : "invoice-pending",
        stripePaymentIntentId: paidIntentId || undefined,
        serviceType: serviceNames,
        date: bookingDate,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        status: "pending",
        hours: selectedDuration,
        hourlyRate: pricing ? pricing.subtotal / selectedDuration : 35,
        subtotal: pricing?.subtotal || 0,
        surgeAmount: pricing?.surgeAmount || 0,
        total: pricing?.total || 0,
        isAsap,
        wasRefunded: false,
        orderingClient: {
          name: resolvedName,
          firstName: resolvedName.split(" ")[0] || "",
          lastName: resolvedName.split(" ").slice(1).join(" ") || "",
          address: getFullAddress(),
          postalCode: formData.postalCode,
          phone: resolvedPhone,
          email: resolvedEmail,
          isNewAccount: false,
          streetNumber: formData.streetNumber,
          streetName: formData.streetName,
        },
        patient: {
          name: serviceFor === "myself" ? resolvedName : `${formData.patientFirstName} ${formData.patientLastName}`.trim(),
          firstName: serviceFor === "myself" ? resolvedName.split(" ")[0] || "" : formData.patientFirstName,
          lastName: serviceFor === "myself" ? resolvedName.split(" ").slice(1).join(" ") || "" : formData.patientLastName,
          address: getFullAddress(),
          postalCode: formData.postalCode,
          relationship: serviceFor === "myself" ? "Self" : formData.patientRelationship,
          preferredLanguages: preferredLanguages.length > 0 ? preferredLanguages : undefined,
          preferredGender: formData.preferredGender as GenderPreference,
        },
        pickupAddress: includesDoctorEscort ? formData.pickupAddress : undefined,
        pickupPostalCode: includesDoctorEscort ? formData.pickupPostalCode : undefined,
        isTransportBooking: includesDoctorEscort,
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

  // ── Booking Complete Screen ──
  if (bookingComplete && completedBooking) {
    return (
      <Card className="shadow-card text-center">
        <CardContent className="pt-8 pb-8 space-y-6">
          <div className="w-20 h-20 mx-auto rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <Check className="w-10 h-10 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Booking Confirmed!</h1>
            <p className="text-muted-foreground">Thank you, {resolvedName.split(" ")[0]}!</p>
          </div>
          <div className="p-4 bg-primary/10 border border-primary/30 rounded-lg">
            <p className="text-sm text-muted-foreground mb-1">Your Booking Code</p>
            <p className="text-2xl font-mono font-bold text-primary">{completedBooking.id}</p>
            <p className="text-xs text-muted-foreground mt-2">Save this ID for your records</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-left space-y-2">
            <h3 className="font-medium text-foreground mb-3">Booking Summary</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium text-foreground">{completedBooking.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium text-foreground">{completedBooking.startTime} – {completedBooking.endTime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium text-foreground">{completedBooking.hours}h</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t border-border">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-primary">${completedBooking.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment</span>
              <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">Paid</Badge>
            </div>
          </div>
          <div className="p-4 bg-muted rounded-lg text-left">
            <p className="text-foreground font-medium mb-2">What's next?</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>✓ Confirmation email sent to {resolvedEmail}</li>
              <li>• A PSW will be assigned to your booking</li>
              <li>• You'll receive a reminder before your appointment</li>
            </ul>
          </div>
          <div className="p-5 bg-gradient-to-br from-primary/10 to-accent/10 border border-primary/20 rounded-xl text-center space-y-3">
            <p className="text-foreground font-semibold text-lg">⭐ Enjoying our service?</p>
            <p className="text-muted-foreground text-sm">We'd love to hear about your experience!</p>
            <Button variant="brand" className="w-full" onClick={() => window.open("https://g.page/r/CfuKfStrS_hoEAI/review", "_blank")}>
              Rate your experience on Google
            </Button>
          </div>
          <InstallAppPrompt clientName={resolvedName.split(" ")[0]} />
          <Button variant="outline" onClick={onBack} className="w-full">Go to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  // ── Render Duration Selector ──
  const renderDurationSelector = () => {
    const companionshipSuggestions = [4, 6, 8, 12];
    const durationTooShort = selectedDuration < minDuration;

    return (
      <div className="space-y-3">
        <Label className="text-base font-medium">How long do you need care?</Label>

        {hasCompanionship && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-sm text-muted-foreground">
              💡 Companionship visits are often booked for longer blocks such as 4, 6, or 8 hours.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {companionshipSuggestions.map((h) => (
                <Button
                  key={h}
                  size="sm"
                  variant={selectedDuration === h ? "default" : "outline"}
                  onClick={() => setSelectedDuration(h)}
                  className="text-xs"
                >
                  {h}h
                </Button>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {DURATION_OPTIONS.map((opt) => {
            const isBelowMin = opt.value < minDuration;
            return (
              <Button
                key={opt.value}
                size="sm"
                variant={selectedDuration === opt.value ? "default" : "outline"}
                className={`text-sm ${isBelowMin ? "opacity-40 cursor-not-allowed" : ""}`}
                disabled={isBelowMin}
                onClick={() => setSelectedDuration(opt.value)}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>

        {durationTooShort && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700 dark:text-amber-400">
              Your selected services need about {formatDuration(estimatedCareMinutes)} of care. Consider booking a longer visit.
            </p>
          </div>
        )}
      </div>
    );
  };

  // ── Render Price Breakdown ──
  const renderPriceBreakdown = () => {
    if (!pricing) return null;
    return (
      <div className="p-4 bg-muted rounded-lg space-y-2">
        <h4 className="font-medium text-foreground text-sm">Price Estimate</h4>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {selectedDuration}h × {serviceCategory === "doctor-appointment" ? "Doctor Escort" : serviceCategory === "hospital-discharge" ? "Hospital Discharge" : "Home Care"}
          </span>
          <span className="text-foreground">${(pricing.subtotal - pricing.surgeAmount - pricing.regionalSurcharge).toFixed(2)}</span>
        </div>
        {pricing.surgeAmount > 0 && (
          <div className="flex justify-between text-sm text-amber-600">
            <span>{isAsap ? "Rush Fee" : "Surge Fee"}</span>
            <span>+${pricing.surgeAmount.toFixed(2)}</span>
          </div>
        )}
        {pricing.regionalSurcharge > 0 && (
          <div className="flex justify-between text-sm text-blue-600">
            <span>Toronto/GTA Service Fee</span>
            <span>+${pricing.regionalSurcharge.toFixed(2)}</span>
          </div>
        )}
        {pricing.minimumFeeApplied && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Minimum Booking Fee Applied</span>
            <span></span>
          </div>
        )}
        <div className="border-t border-border pt-2 space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground">${pricing.subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">HST (13%)</span>
            <span className="text-foreground">${pricing.hstAmount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-base font-bold pt-1">
            <span className="text-foreground">Total Estimate</span>
            <span className="text-primary">${pricing.total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Request Caregiver</h1>
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
                  <span
                    className={`text-xs mt-2 font-medium hidden sm:block ${
                      isCurrent ? "text-primary" : "text-muted-foreground"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Step 1: Who Is This For? ── */}
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

      {/* ── Step 2: Patient Details & Address ── */}
      {currentStep === 2 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              {serviceFor === "myself" ? "Your Details" : "Patient Information"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {serviceFor === "someone-else" && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="patientFirstName">Patient First Name *</Label>
                    <Input id="patientFirstName" placeholder="Margaret" value={formData.patientFirstName} onChange={(e) => updateFormData("patientFirstName", e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="patientLastName">Patient Last Name</Label>
                    <Input id="patientLastName" placeholder="Thompson" value={formData.patientLastName} onChange={(e) => updateFormData("patientLastName", e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="patientRelationship">Your Relationship to Patient</Label>
                  <Select value={formData.patientRelationship} onValueChange={(v) => updateFormData("patientRelationship", v)}>
                    <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
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

            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Service Address</h3>
              </div>
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input id="streetAddress" placeholder="123 Main Street" value={formData.streetAddress} onChange={(e) => updateFormData("streetAddress", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="unitNumber">Unit / Suite / Apt #</Label>
                  <Input id="unitNumber" placeholder="Unit 4B" value={formData.unitNumber} onChange={(e) => updateFormData("unitNumber", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input id="city" placeholder="Belleville" value={formData.city} onChange={(e) => updateFormData("city", e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="province">Province</Label>
                  <Select value={formData.province} onValueChange={(v) => updateFormData("province", v)}>
                    <SelectTrigger><SelectValue placeholder="Select province" /></SelectTrigger>
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
                  <Input id="postalCode" placeholder="K8N 1A1" value={formData.postalCode} onChange={(e) => handlePostalCodeChange(e.target.value)} maxLength={7} className={postalCodeError ? "border-destructive" : ""} />
                  {postalCodeError && <p className="text-xs text-destructive">{postalCodeError}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="buzzerCode">Buzzer Code (Optional)</Label>
                  <Input id="buzzerCode" placeholder="e.g., #1234" value={formData.buzzerCode} onChange={(e) => updateFormData("buzzerCode", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="entryPoint">Entry Point</Label>
                  <Select value={formData.entryPoint} onValueChange={(v) => updateFormData("entryPoint", v)}>
                    <SelectTrigger><SelectValue placeholder="Select entry" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="front-door">Front Door</SelectItem>
                      <SelectItem value="side-door">Side Door</SelectItem>
                      <SelectItem value="back-door">Back Door</SelectItem>
                      <SelectItem value="concierge">Concierge / Lobby</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                <Button variant="outline" className="flex-1" onClick={() => fileInputRef.current?.click()}>
                  <Camera className="w-4 h-4 mr-2" />
                  {entryPhoto ? entryPhoto.name : "Upload Entry Photo"}
                </Button>
                {entryPhoto && (
                  <Button variant="ghost" size="sm" onClick={() => setEntryPhoto(null)} className="text-destructive">Remove</Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Upload a photo of the entry point to help the PSW find the location easily.</p>
              <div className="flex items-start gap-2 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <Phone className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <strong className="text-foreground">Privacy Note:</strong> PSWs are instructed to only use the office line for access issues.
                </p>
              </div>
              {isCheckingAddress && <p className="text-sm text-muted-foreground">Verifying address...</p>}
              {addressError && (
                <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{addressError}</p>
                </div>
              )}
            </div>

            {/* Caregiver Preferences */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                <h3 className="font-medium text-foreground">Caregiver Preferences (Optional)</h3>
              </div>
              <div className="space-y-2">
                <Label>Gender Preference</Label>
                <Select value={formData.preferredGender} onValueChange={(v) => updateFormData("preferredGender", v)}>
                  <SelectTrigger><SelectValue placeholder="No preference" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-preference">No Preference</SelectItem>
                    <SelectItem value="female">Female PSW</SelectItem>
                    <SelectItem value="male">Male PSW</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Language Preference</Label>
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
                  <strong className="text-foreground">Note:</strong> All confirmations, invoices, and care reports will be sent to your email ({clientEmail}).
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Step 3: Services & Duration ── */}
      {currentStep === 3 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Services & Duration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* ── Task Selection ── */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Select care services needed</Label>
              {tasksLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground">Loading services...</span>
                </div>
              ) : (
                <>
                  {/* Home Care Tasks */}
                  {homeCareTasksList.length > 0 && (
                    <div className="space-y-2">
                      {homeCareTasksList.map((task) => {
                        const TaskIcon = getIconForTask(task.name);
                        const isSelected = selectedServices.includes(task.id);
                        return (
                          <button
                            key={task.id}
                            onClick={() => toggleService(task.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                              isSelected
                                ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                                : "border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                            }`}>
                              {isSelected ? <Check className="w-4 h-4" /> : <TaskIcon className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-foreground text-sm">{task.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">({task.includedMinutes} min)</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Doctor / Hospital Tasks */}
                  {doctorHospitalTasks.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-border">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider pt-1">Medical / Transport</p>
                      {doctorHospitalTasks.map((task) => {
                        const TaskIcon = getIconForTask(task.name);
                        const isSelected = selectedServices.includes(task.id);
                        return (
                          <button
                            key={task.id}
                            onClick={() => toggleService(task.id)}
                            className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                              isSelected
                                ? "border-blue-500 bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-300"
                                : "border-border hover:border-blue-300 hover:bg-muted/50"
                            }`}
                          >
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-blue-600 text-white" : "bg-muted text-muted-foreground"
                            }`}>
                              {isSelected ? <Check className="w-4 h-4" /> : <TaskIcon className="w-4 h-4" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="font-medium text-foreground text-sm">{task.name}</span>
                              <span className="text-xs text-muted-foreground ml-2">({task.includedMinutes} min)</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ── Estimated Care Time ── */}
            {selectedServices.length > 0 && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Estimated Care Time
                  </span>
                  <span className="font-bold text-primary">
                    {estimatedCareMinutes >= 60
                      ? `${(estimatedCareMinutes / 60).toFixed(estimatedCareMinutes % 60 === 0 ? 0 : 1)} hours`
                      : `${estimatedCareMinutes} min`}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Based on your selected services. You can book longer if needed.
                </p>
              </div>
            )}

            {/* ── Duration Selector ── */}
            {selectedServices.length > 0 && renderDurationSelector()}

            {/* ── Hospital/Doctor Details ── */}
            {includesDoctorEscort && (
              <div className="space-y-4 p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-blue-600" />
                  <h4 className="font-medium text-foreground">Hospital/Doctor Pick-up Details</h4>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupAddress">Pick-up Address (Hospital/Clinic) *</Label>
                  <Input id="pickupAddress" placeholder="e.g., Belleville General Hospital" value={formData.pickupAddress} onChange={(e) => updateFormData("pickupAddress", e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pickupPostalCode">Pick-up Postal Code *</Label>
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
                    className={pickupPostalCodeError ? "border-destructive" : ""}
                  />
                  {pickupPostalCodeError && <p className="text-xs text-destructive">{pickupPostalCodeError}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doctorOfficeName">Doctor's Office Name (Optional)</Label>
                  <Textarea id="doctorOfficeName" placeholder="e.g., Dr. Smith Clinic, Suite 302" value={formData.doctorOfficeName} onChange={(e) => updateFormData("doctorOfficeName", e.target.value)} rows={2} />
                </div>
              </div>
            )}

            {/* ── ASAP Option ── */}
            <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
              <Checkbox id="asapBooking" checked={isAsap} onCheckedChange={(checked) => setIsAsap(checked as boolean)} />
              <div className="space-y-1">
                <Label htmlFor="asapBooking" className="font-medium cursor-pointer flex items-center gap-2">
                  <Zap className="w-4 h-4 text-orange-500" />
                  Request ASAP Service
                </Label>
                <p className="text-xs text-orange-700 dark:text-orange-400">Immediate requests are non-refundable.</p>
              </div>
            </div>

            {/* ── Date & Time ── */}
            <div className="space-y-2">
              <Label htmlFor="serviceDate">
                <Calendar className="w-4 h-4 text-muted-foreground inline mr-2" />
                Service Date
              </Label>
              <Input id="serviceDate" type="date" value={formData.serviceDate} onChange={(e) => updateFormData("serviceDate", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startTime">
                  <Clock className="w-4 h-4 text-muted-foreground inline mr-2" />
                  Start Time
                </Label>
                <Input id="startTime" type="time" value={formData.startTime} onChange={(e) => updateFormData("startTime", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End Time</Label>
                <div className="h-10 px-3 py-2 bg-muted rounded-md border border-input flex items-center">
                  <span className={getCalculatedEndTime() ? "text-foreground" : "text-muted-foreground"}>
                    {getCalculatedEndTime() || "Auto-calculated"}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Price Breakdown ── */}
            {renderPriceBreakdown()}

            {/* ── Care Needs ── */}
            <CareConditionsChecklist
              selectedConditions={careConditions}
              onConditionsChange={setCareConditions}
              otherText={careConditionsOther}
              onOtherTextChange={setCareConditionsOther}
              otherTextError={careConditionsOtherError}
              onOtherTextErrorChange={setCareConditionsOtherError}
            />

            {/* ── Special Notes ── */}
            <div className="space-y-2">
              <Label htmlFor="specialNotes">Special Instructions (Optional)</Label>
              <Textarea
                id="specialNotes"
                placeholder="Entry instructions, parking notes, or other details for the caregiver..."
                value={formData.specialNotes}
                onChange={(e) => {
                  updateFormData("specialNotes", e.target.value);
                  setSpecialNotesError(detectContactInfo(e.target.value));
                }}
                className={specialNotesError ? "border-destructive" : ""}
              />
              {specialNotesError && (
                <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                  <span className="text-xs text-destructive">{specialNotesError}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Step 4: Review ── */}
      {currentStep === 4 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <Check className="w-5 h-5 text-primary" />
              Confirm Your Booking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Patient</span>
                <span className="font-medium text-foreground">{serviceFor === "myself" ? clientName : formData.patientName}</span>
              </div>
              <div className="flex justify-between items-start">
                <span className="text-muted-foreground">Services</span>
                <div className="text-right">
                  {selectedServices.map((id) => {
                    const task = serviceTasks.find((t) => t.id === id);
                    return (
                      <span key={id} className="block font-medium text-foreground text-sm">
                        {task?.name}
                      </span>
                    );
                  })}
                </div>
              </div>
              {includesDoctorEscort && formData.pickupAddress && (
                <div className="flex justify-between items-start">
                  <span className="text-muted-foreground">Pick-up</span>
                  <div className="text-right max-w-[60%]">
                    <span className="font-medium text-foreground text-sm block">{formData.pickupAddress}</span>
                    <span className="text-xs text-muted-foreground">{formData.pickupPostalCode}</span>
                  </div>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium text-foreground">{selectedDuration}h</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium text-foreground">{formData.serviceDate || "ASAP"}</span>
              </div>
              {formData.startTime && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time</span>
                  <span className="font-medium text-foreground">{formData.startTime} – {getCalculatedEndTime()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Address</span>
                <span className="font-medium text-foreground text-right text-sm max-w-[60%]">{getFullAddress()}</span>
              </div>
            </div>

            {/* Price Breakdown in Review */}
            {renderPriceBreakdown()}

            {/* Billing Info */}
            <div className="p-3 bg-primary/5 rounded-lg text-sm">
              <p className="font-medium text-foreground mb-1">Billing & Reports sent to:</p>
              <p className="text-muted-foreground">{resolvedName}</p>
              <p className="text-muted-foreground">{resolvedEmail}</p>
            </div>

            {/* Billing Policy */}
            <div className="p-3 bg-muted rounded-lg text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Billing Policy:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>All bookings include a 1-hour minimum charge</li>
                <li>Up to 14 minutes over: No extra charge</li>
                <li>15+ minutes over: Billed in 15-minute blocks</li>
              </ul>
            </div>

            {/* Policy Agreement */}
            <div className="flex items-start space-x-3">
              <Checkbox id="agreePolicy" checked={agreedToPolicy} onCheckedChange={(checked) => setAgreedToPolicy(checked as boolean)} />
              <Label htmlFor="agreePolicy" className="text-sm text-muted-foreground cursor-pointer">
                I agree to the cancellation policy. Cancellations within 4 hours and ASAP bookings are non-refundable.
              </Label>
            </div>
            <TermsOfServiceDialog />
          </CardContent>
        </Card>
      )}

      {/* ── Step 5: Payment ── */}
      {currentStep === 5 && showPaymentStep && (
        <StripePaymentForm
          amount={Math.max(20, pricing?.total || 20)}
          customerEmail={resolvedEmail}
          customerName={resolvedName}
          bookingDetails={{
            serviceDate: formData.serviceDate,
            services: selectedServices
              .map((id) => serviceTasks.find((s) => s.id === id)?.name || id)
              .join(", "),
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
