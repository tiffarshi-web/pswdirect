import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { BookingProgressBar } from "@/components/booking/BookingProgressBar";
import { StepServiceAndSchedule } from "@/components/booking/StepServiceAndSchedule";
import { StepLocation } from "@/components/booking/StepLocation";
import { StepRecipientDetails } from "@/components/booking/StepRecipientDetails";
import { StepReviewPay } from "@/components/booking/StepReviewPay";
import { StripePaymentForm } from "@/components/client/StripePaymentForm";
import { InstallAppPrompt } from "@/components/client/InstallAppPrompt";

import type { BookingFormData, BookingStep, ServiceForType } from "@/components/booking/types";
import { INITIAL_FORM_DATA } from "@/components/booking/types";
import type { ServiceCategory } from "@/lib/taskConfig";
import { getServiceCategoryForTasks } from "@/lib/taskConfig";
import { useServiceTasks } from "@/hooks/useServiceTasks";
import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { fetchPricingRatesFromDB } from "@/lib/pricingConfigStore";
import { calculateDurationBasedPrice } from "@/lib/businessConfig";
import {
  isValidCanadianPostalCode,
  isWithinAnyPSWCoverageAsync,
} from "@/lib/postalCodeUtils";
import { logUnservedOrder } from "@/lib/unservedOrderLogger";
import { initializePSWProfiles } from "@/lib/pswProfileStore";
import { detectContactInfo } from "@/lib/careConditions";
import { addBooking, type BookingData } from "@/lib/bookingStore";
import type { GenderPreference } from "@/lib/shiftStore";

interface ClientBookingFlowProps {
  onBack: () => void;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
}

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

  useEffect(() => {
    fetchPricingRatesFromDB();
  }, []);

  // ── State ──
  const [currentStep, setCurrentStep] = useState<BookingStep>(1);
  const [formData, setFormData] = useState<BookingFormData>(INITIAL_FORM_DATA);
  const [entryPhoto, setEntryPhoto] = useState<File | null>(null);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [postalCodeError, setPostalCodeError] = useState<string | null>(null);
  const [pickupPostalCodeError, setPickupPostalCodeError] = useState<string | null>(null);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);
  const [showPaymentStep, setShowPaymentStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<BookingData | null>(null);

  // ── Derived state ──
  const [careConditionsOtherError, setCareConditionsOtherError] = useState<string | null>(null);
  const [specialNotesError, setSpecialNotesError] = useState<string | null>(null);

  // Service category for pricing
  const serviceCategory: ServiceCategory = formData.selectedCategory || "standard";

  // Taxable fraction for HST calculation
  const taxableFraction = useMemo(() => {
    if (formData.selectedServices.length === 0 || serviceTasks.length === 0) return 0;
    const selected = formData.selectedServices.map(id => serviceTasks.find(t => t.id === id)).filter(Boolean);
    if (selected.length === 0) return 0;
    const totalMinutes = selected.reduce((sum, t) => sum + (t!.includedMinutes || 30), 0);
    if (totalMinutes === 0) return 0;
    const taxableMinutes = selected.filter(t => t!.applyHST).reduce((sum, t) => sum + (t!.includedMinutes || 30), 0);
    return taxableMinutes / totalMinutes;
  }, [formData.selectedServices, serviceTasks]);

  const pricing = useMemo(() => {
    if (formData.selectedServices.length === 0) return null;
    return calculateDurationBasedPrice(
      formData.selectedDuration,
      serviceCategory,
      formData.isAsap,
      formData.city,
      formData.postalCode,
      formData.serviceDate,
      formData.startTime,
      taxableFraction
    );
  }, [formData.selectedServices, formData.selectedDuration, serviceCategory, formData.isAsap, formData.city, formData.postalCode, formData.serviceDate, formData.startTime, taxableFraction]);

  // ── Helpers ──
  const getStreetAddress = () => `${formData.streetNumber} ${formData.streetName}`.trim();
  const getFullAddress = () => {
    const parts = [getStreetAddress()];
    if (formData.unitNumber) parts.push(`Unit ${formData.unitNumber}`);
    if (formData.city) parts.push(formData.city);
    if (formData.province) parts.push(formData.province);
    if (formData.postalCode) parts.push(formData.postalCode);
    return parts.join(", ");
  };

  const getCalculatedEndTime = () => {
    if (!formData.startTime) return "";
    const [hours, mins] = formData.startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + formData.selectedDuration * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  const isTransportCategory = serviceCategory === "doctor-appointment" || serviceCategory === "hospital-discharge";

  // ── Field update handlers ──
  const updateField = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (["streetNumber", "streetName", "city", "postalCode"].includes(field)) {
      setAddressError(null);
      setPostalCodeError(null);
    }
  };

  const updateCheckbox = (field: string, value: boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ── Step 1 handlers ──
  const handleWhoSelect = (type: ServiceForType) => {
    if (type === "myself") {
      const nameParts = (clientName || "").split(" ");
      setFormData(prev => ({
        ...prev,
        serviceFor: type,
        patientFirstName: nameParts[0] || "",
        patientLastName: nameParts.slice(1).join(" ") || "",
      }));
    } else {
      setFormData(prev => ({ ...prev, serviceFor: type }));
    }
  };

  const handleCategorySelect = (category: ServiceCategory) => {
    setFormData(prev => ({
      ...prev,
      selectedCategory: category,
      selectedServices: [],
      selectedDuration: 1,
    }));
  };

  const handleToggleService = (serviceId: string) => {
    setFormData(prev => {
      const isRemoving = prev.selectedServices.includes(serviceId);
      const next = isRemoving
        ? prev.selectedServices.filter(s => s !== serviceId)
        : [...prev.selectedServices, serviceId];

      const newMinutes = next.reduce((sum, id) => {
        const task = serviceTasks.find(t => t.id === id);
        return sum + (task?.includedMinutes ?? 30);
      }, 0);
      const newMin = Math.max(1, Math.ceil(newMinutes / 30) * 0.5);
      const newDuration = prev.selectedDuration < newMin ? newMin : prev.selectedDuration;

      return { ...prev, selectedServices: next, selectedDuration: newDuration };
    });
  };

  const handleDurationChange = (d: number) => {
    setFormData(prev => ({ ...prev, selectedDuration: d }));
  };

  // ── Validation ──
  const validateStep1 = (): boolean => {
    if (!formData.serviceFor) {
      toast.error("Please select who the care is for");
      return false;
    }
    if (!formData.selectedCategory) {
      toast.error("Please select a service type");
      return false;
    }
    if (formData.selectedServices.length === 0) {
      toast.error("Please select at least one service");
      return false;
    }
    if (!formData.isAsap && (!formData.serviceDate || !formData.startTime)) {
      toast.error("Please select a date and time, or choose ASAP");
      return false;
    }
    return true;
  };

  const validateLocation = async (): Promise<boolean> => {
    if (!getStreetAddress().trim() || !formData.city.trim()) {
      toast.error("Please enter your address");
      return false;
    }
    if (!formData.postalCode.trim()) {
      setPostalCodeError("Postal code is required");
      return false;
    }
    if (!isValidCanadianPostalCode(formData.postalCode)) {
      setPostalCodeError("Please enter a valid Canadian postal code (e.g., K8N 1A1)");
      return false;
    }
    if (isTransportCategory) {
      if (!formData.pickupAddress.trim()) {
        setPickupPostalCodeError("Pick-up address is required");
        return false;
      }
      if (!formData.pickupPostalCode.trim()) {
        setPickupPostalCodeError("Pick-up postal code is required");
        return false;
      }
      if (!isValidCanadianPostalCode(formData.pickupPostalCode)) {
        setPickupPostalCodeError("Please enter a valid Canadian postal code");
        return false;
      }
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
          serviceType: formData.selectedServices.map(id => serviceTasks.find(t => t.id === id)?.name).filter(Boolean).join(", ") || undefined,
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
            address: getFullAddress(),
            postalCode: formData.postalCode,
            selectedServices: formData.selectedServices,
            serviceType: formData.selectedServices.map(id => serviceTasks.find(t => t.id === id)?.name || id),
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

  // ── Navigation ──
  const nextStep = async () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2) {
      const isValid = await validateLocation();
      if (!isValid) return;
    }
    if (currentStep === 3) {
      if (specialNotesError || careConditionsOtherError) return;
    }
    if (currentStep < 4) {
      setCurrentStep((prev) => (prev + 1) as BookingStep);
      scrollToTop();
    }
  };

  const bookingContainerRef = useRef<HTMLDivElement>(null);

  const scrollToTop = useCallback(() => {
    setTimeout(() => {
      if (bookingContainerRef.current) {
        bookingContainerRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        // Offset for sticky header (~60px)
        setTimeout(() => {
          const rect = bookingContainerRef.current?.getBoundingClientRect();
          if (rect && rect.top < 70) {
            window.scrollBy({ top: rect.top - 70, behavior: "smooth" });
          }
        }, 100);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }, 50);
  }, []);

  const prevStep = () => {
    if (showPaymentStep) {
      setShowPaymentStep(false);
      scrollToTop();
      return;
    }
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as BookingStep);
      scrollToTop();
    }
  };

  // ── Payment & Submission ──
  const proceedToPayment = () => {
    if (!formData.agreedToPolicy) {
      toast.error("Please agree to the cancellation policy");
      return;
    }
    if (!resolvedEmail?.trim()) {
      toast.error("Missing email address", { description: "Please log out and back in." });
      return;
    }
    if (!pricing || pricing.total < 20) {
      toast.error("Minimum booking amount is $20");
      return;
    }
    setShowPaymentStep(true);
    scrollToTop();
  };

  const handleSubmit = async (paidIntentId?: string) => {
    setIsSubmitting(true);
    if (!resolvedEmail?.trim()) {
      toast.error("Missing email address");
      setIsSubmitting(false);
      return;
    }
    try {
      const serviceNames = formData.selectedServices.map(id => {
        const service = serviceTasks.find(s => s.id === id);
        return service?.name || id;
      });

      let bookingDate = formData.serviceDate;
      let bookingStartTime = formData.startTime;
      let bookingEndTime = getCalculatedEndTime();

      if (formData.isAsap || !bookingDate || !bookingStartTime) {
        const now = new Date();
        bookingDate = now.toISOString().split("T")[0];
        now.setMinutes(now.getMinutes() + 15);
        bookingStartTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
        const endDate = new Date(now.getTime() + formData.selectedDuration * 60 * 60000);
        bookingEndTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
      }

      // ── PAYLOAD: identical shape to previous flow ──
      const bookingData: Omit<BookingData, "id" | "createdAt"> = {
        paymentStatus: paidIntentId ? "paid" : "invoice-pending",
        stripePaymentIntentId: paidIntentId || undefined,
        serviceType: serviceNames,
        date: bookingDate,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        status: "pending",
        hours: formData.selectedDuration,
        hourlyRate: pricing ? pricing.subtotal / formData.selectedDuration : 35,
        subtotal: pricing?.subtotal || 0,
        surgeAmount: pricing?.surgeAmount || 0,
        total: pricing?.total || 0,
        isAsap: formData.isAsap,
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
          name: formData.serviceFor === "myself" ? resolvedName : `${formData.patientFirstName} ${formData.patientLastName}`.trim(),
          firstName: formData.serviceFor === "myself" ? resolvedName.split(" ")[0] || "" : formData.patientFirstName,
          lastName: formData.serviceFor === "myself" ? resolvedName.split(" ").slice(1).join(" ") || "" : formData.patientLastName,
          address: getFullAddress(),
          postalCode: formData.postalCode,
          relationship: formData.serviceFor === "myself" ? "Self" : formData.patientRelationship,
          preferredLanguages: formData.preferredLanguages.length > 0 ? formData.preferredLanguages : undefined,
          preferredGender: formData.preferredGender as GenderPreference,
        },
        pickupAddress: isTransportCategory ? formData.pickupAddress : undefined,
        pickupPostalCode: isTransportCategory ? formData.pickupPostalCode : undefined,
        isTransportBooking: isTransportCategory,
        pswAssigned: null,
        specialNotes: formData.specialNotes,
        careConditions: formData.careConditions.length > 0 ? formData.careConditions : undefined,
        careConditionsOther: formData.careConditionsOther.trim() || undefined,
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

  // ── Payment Step ──
  if (showPaymentStep) {
    return (
      <div className="min-h-full pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={prevStep} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Complete Payment</h1>
            <p className="text-sm text-muted-foreground">Secure payment via Stripe</p>
          </div>
        </div>
        <StripePaymentForm
          amount={Math.max(20, pricing?.total || 20)}
          customerEmail={resolvedEmail}
          customerName={resolvedName}
          bookingDetails={{
            serviceDate: formData.serviceDate,
            services: formData.selectedServices
              .map(id => serviceTasks.find(s => s.id === id)?.name || id)
              .join(", "),
          }}
          onPaymentSuccess={handlePaymentSuccess}
          onPaymentError={handlePaymentError}
          onCancel={() => {
            setShowPaymentStep(false);
          }}
        />
      </div>
    );
  }

  // ── Can proceed check ──
  const canProceed = (): boolean => {
    if (currentStep === 1) {
      return !!(formData.serviceFor && formData.selectedCategory && formData.selectedServices.length > 0 && (formData.isAsap || (formData.serviceDate && formData.startTime)));
    }
    if (currentStep === 2) {
      const hasAddress = !!(formData.streetNumber && formData.streetName && formData.city && formData.postalCode);
      if (!hasAddress) return false;
      if (isTransportCategory && (!formData.pickupAddress || !formData.pickupPostalCode)) return false;
      return true;
    }
    if (currentStep === 3) {
      if (formData.serviceFor === "someone-else" && !formData.patientFirstName.trim()) return false;
      return true;
    }
    return true;
  };

  // ── Main Flow ──
  return (
    <div ref={bookingContainerRef} className="min-h-full pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={currentStep === 1 ? onBack : prevStep} className="shrink-0">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">Book Care</h1>
          <p className="text-xs text-muted-foreground">⚡ Book in under 2 minutes</p>
        </div>
        {pricing && currentStep < 4 && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Estimate</p>
            <p className="font-bold text-primary">${pricing.total.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <BookingProgressBar currentStep={currentStep} />

      {/* Step 1: Service + Schedule */}
      {currentStep === 1 && (
        <StepServiceAndSchedule
          serviceFor={formData.serviceFor}
          onServiceForSelect={handleWhoSelect}
          selectedCategory={formData.selectedCategory}
          onCategorySelect={handleCategorySelect}
          serviceTasks={serviceTasks}
          tasksLoading={tasksLoading}
          selectedServices={formData.selectedServices}
          selectedDuration={formData.selectedDuration}
          onToggleService={handleToggleService}
          onDurationChange={handleDurationChange}
          serviceDate={formData.serviceDate}
          startTime={formData.startTime}
          isAsap={formData.isAsap}
          onFieldChange={updateField}
          onAsapChange={(v) => {
            const now = new Date();
            const nowTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
            const today = now.toISOString().split("T")[0];
            setFormData(prev => ({
              ...prev,
              isAsap: v,
              ...(v ? { startTime: nowTime, serviceDate: today } : {}),
            }));
          }}
        />
      )}

      {/* Step 2: Location */}
      {currentStep === 2 && (
        <StepLocation
          formData={formData}
          selectedCategory={serviceCategory}
          onFieldChange={updateField}
          onCheckboxChange={updateCheckbox}
          entryPhoto={entryPhoto}
          onPhotoChange={setEntryPhoto}
          addressError={addressError}
          postalCodeError={postalCodeError}
          pickupPostalCodeError={pickupPostalCodeError}
          isCheckingAddress={isCheckingAddress}
        />
      )}

      {/* Step 3: Details + Preferences */}
      {currentStep === 3 && (
        <StepRecipientDetails
          serviceFor={formData.serviceFor}
          patientFirstName={formData.patientFirstName}
          patientLastName={formData.patientLastName}
          patientRelationship={formData.patientRelationship}
          preferredGender={formData.preferredGender}
          preferredLanguages={formData.preferredLanguages}
          careConditions={formData.careConditions}
          careConditionsOther={formData.careConditionsOther}
          careConditionsOtherError={careConditionsOtherError}
          specialNotes={formData.specialNotes}
          specialNotesError={specialNotesError}
          clientEmail={resolvedEmail}
          onFieldChange={updateField}
          onLanguagesChange={(langs) => setFormData(prev => ({ ...prev, preferredLanguages: langs }))}
          onCareConditionsChange={(c) => setFormData(prev => ({ ...prev, careConditions: c }))}
          onCareConditionsOtherChange={(text) => setFormData(prev => ({ ...prev, careConditionsOther: text }))}
          onCareConditionsOtherErrorChange={setCareConditionsOtherError}
          onSpecialNotesErrorChange={setSpecialNotesError}
        />
      )}

      {/* Step 4: Review */}
      {currentStep === 4 && (
        <StepReviewPay
          formData={formData}
          serviceTasks={serviceTasks}
          clientName={resolvedName}
          clientEmail={resolvedEmail}
          onAgreedChange={(v) => setFormData(prev => ({ ...prev, agreedToPolicy: v }))}
        />
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-3 mt-4">
        {currentStep > 1 && (
          <Button variant="outline" className="flex-1" onClick={prevStep}>
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </Button>
        )}
        {currentStep < 4 ? (
          <Button
            variant="brand"
            className="flex-1"
            onClick={nextStep}
            disabled={isCheckingAddress || !canProceed()}
          >
            {isCheckingAddress ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        ) : (
          <Button
            variant="brand"
            className="flex-1"
            onClick={proceedToPayment}
            disabled={isSubmitting || !formData.agreedToPolicy}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                Proceed to Payment
                <ArrowRight className="w-4 h-4 ml-1.5" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
