// Manual Order Creation (MOC) - Admin Only
// Creates bookings via the same create-booking edge function path

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TimePicker } from "@/components/ui/time-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Copy, CheckCircle, Loader2, CreditCard, FileText, ArrowLeft, Home, Stethoscope, Building2, AlertTriangle, Shield, Repeat, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addShift } from "@/lib/shiftStore";
import { useServiceTasks } from "@/hooks/useServiceTasks";
import { StripePaymentForm } from "@/components/client/StripePaymentForm";
import { formatPostalCode } from "@/lib/postalCodeUtils";
import { formatCanadianPhone } from "@/lib/phoneUtils";
import { getRatesForCategory, type CategoryRateConfig } from "@/lib/pricingConfigStore";
import type { ServiceCategory } from "@/lib/taskConfig";
import {
  type ThirdPartyPayerType,
  PAYER_TYPE_OPTIONS,
  isThirdPartyPayer,
  isInsurancePayer,
  isVACPayer,
  VAC_STATIC,
  VAC_SERVICE_TYPES,
  getVACBenefitCode,
  getInsurancePrettyName,
} from "@/lib/thirdPartyPayerConfig";
import { Checkbox } from "@/components/ui/checkbox";
import {
  type RecurringConfig,
  type RecurringFrequency,
  type RecurringEndType,
  DEFAULT_RECURRING_CONFIG,
  generateOccurrenceDates,
  getFrequencyLabel,
} from "@/lib/recurringJobUtils";
interface MOCProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOrderCreated?: () => void;
}

interface SuccessData {
  bookingCode: string;
  bookingUuid: string;
  clientName: string;
  serviceDate: string;
  startTime: string;
  paymentIntentId?: string;
}

interface PendingPayment {
  bookingCode: string;
  bookingUuid: string;
  clientName: string;
  clientEmail: string;
  serviceDate: string;
  startTime: string;
  total: number;
  services: string[];
}

export const ManualOrderCreation = ({ open, onOpenChange, onOrderCreated }: MOCProps) => {
  // Form state
  const [serviceCategory, setServiceCategory] = useState<ServiceCategory | "">("");
  const [clientFirstName, setClientFirstName] = useState("");
  const [clientLastName, setClientLastName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [serviceAddress, setServiceAddress] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [serviceDate, setServiceDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [duration, setDuration] = useState("1");
  const [specialNotes, setSpecialNotes] = useState("");
  const [paymentMode, setPaymentMode] = useState<"invoice" | "pay-now">("invoice");
  const [pswNumber, setPswNumber] = useState("");
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  // Transport fields
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPostalCode, setPickupPostalCode] = useState("");
  const [dropoffAddress, setDropoffAddress] = useState("");
  // Invoice Later fields (legacy)
  const [paymentTerms, setPaymentTerms] = useState<"2" | "14" | "custom">("14");
  const [customTermsDays, setCustomTermsDays] = useState("");
  const [ccEmail, setCcEmail] = useState("");

  // Third-party payer state
  const [thirdPartyPayerType, setThirdPartyPayerType] = useState<ThirdPartyPayerType>("private-pay");
  // VAC fields (editable defaults — admin-only billing identifiers)
  const [vacProviderNumber, setVacProviderNumber] = useState<string>(VAC_STATIC.providerNumber);
  const [vacProgramOfChoice, setVacProgramOfChoice] = useState<string>(VAC_STATIC.programOfChoice);
  const [vacServiceType, setVacServiceType] = useState("");
  const [vacBenefitCodeOverride, setVacBenefitCodeOverride] = useState("");
  const [veteranKNumber, setVeteranKNumber] = useState("");
  const [vacAuthorizationNumber, setVacAuthorizationNumber] = useState("");
  // Insurance fields
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState("");
  const [insuranceMemberId, setInsuranceMemberId] = useState("");
  const [insuranceContactName, setInsuranceContactName] = useState("");
  const [insuranceContactEmail, setInsuranceContactEmail] = useState("");
  const [insuranceContactPhone, setInsuranceContactPhone] = useState("");
  const [insuranceClaimNotes, setInsuranceClaimNotes] = useState("");

  // Recurring job config
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>({ ...DEFAULT_RECURRING_CONFIG });

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  const { tasks } = useServiceTasks();
  const homeCareTasksOnly = useMemo(
    () => tasks.filter(t => t.serviceCategory === "standard"),
    [tasks]
  );

  const isTransport = serviceCategory === "doctor-appointment" || serviceCategory === "hospital-discharge";

  const rates: CategoryRateConfig = useMemo(
    () => (serviceCategory ? getRatesForCategory(serviceCategory) : { firstHour: 30, per30Min: 15 }),
    [serviceCategory]
  );

  const calculatedTotal = useMemo(() => {
    const hours = parseFloat(duration) || 1;
    const base = rates.firstHour;
    const extra30Blocks = Math.max(0, Math.ceil((hours - 1) * 2));
    return base + extra30Blocks * rates.per30Min;
  }, [duration, rates]);

  const getPaymentTermsDays = (): number => {
    if (paymentTerms === "custom") return parseInt(customTermsDays) || 14;
    return parseInt(paymentTerms);
  };

  // Derived: effective benefit code (override or default)
  const effectiveBenefitCode = vacBenefitCodeOverride.trim() || getVACBenefitCode(vacServiceType);

  // VAC warnings
  const vacWarnings = useMemo(() => {
    if (!isVACPayer(thirdPartyPayerType)) return [];
    const w: string[] = [];
    if (!veteranKNumber.trim()) w.push("Veteran K# is missing");
    if (!vacServiceType) w.push("VAC service type not selected");
    if (!vacAuthorizationNumber.trim()) w.push("VAC authorization number is missing");
    return w;
  }, [thirdPartyPayerType, veteranKNumber, vacServiceType, vacAuthorizationNumber]);

  const isVacProvisional = isVACPayer(thirdPartyPayerType) && vacWarnings.length > 0;

  // When third-party payer is selected, force invoice mode
  const effectivePaymentMode = isThirdPartyPayer(thirdPartyPayerType) ? "invoice" : paymentMode;

  const resetForm = () => {
    setServiceCategory("");
    setClientFirstName("");
    setClientLastName("");
    setClientEmail("");
    setClientPhone("");
    setServiceAddress("");
    setPostalCode("");
    setServiceDate("");
    setStartTime("");
    setDuration("1");
    setSpecialNotes("");
    setPaymentMode("invoice");
    setPswNumber("");
    setSelectedServices([]);
    setPickupAddress("");
    setPickupPostalCode("");
    setDropoffAddress("");
    setPaymentTerms("14");
    setCustomTermsDays("");
    setCcEmail("");
    setThirdPartyPayerType("private-pay");
    setVacProviderNumber(VAC_STATIC.providerNumber);
    setVacProgramOfChoice(VAC_STATIC.programOfChoice);
    setVacServiceType("");
    setVacBenefitCodeOverride("");
    setVeteranKNumber("");
    setVacAuthorizationNumber("");
    setInsurancePolicyNumber("");
    setInsuranceMemberId("");
    setInsuranceContactName("");
    setInsuranceContactEmail("");
    setInsuranceContactPhone("");
    setInsuranceClaimNotes("");
    setRecurringConfig({ ...DEFAULT_RECURRING_CONFIG });
    setSuccessData(null);
    setPendingPayment(null);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const toggleService = (taskId: string) => {
    setSelectedServices(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const handleCategoryChange = (cat: ServiceCategory) => {
    setServiceCategory(cat);
    setSelectedServices([]);
    if (cat === "standard") {
      setPickupAddress("");
      setPickupPostalCode("");
      setDropoffAddress("");
    }
  };

  const calculateEndTime = (start: string, hours: number): string => {
    const [h, m] = start.split(":").map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const getServiceNames = (): string[] => {
    if (serviceCategory === "doctor-appointment") return ["Doctor Appointment Escort"];
    if (serviceCategory === "hospital-discharge") return ["Hospital Pick-up/Drop-off (Discharge)"];
    return selectedServices.map(id => {
      const task = homeCareTasksOnly.find(t => t.id === id);
      return task?.name || id;
    });
  };

  const handleSubmit = async () => {
    if (!serviceCategory) return toast.error("Select a service type");
    if (!clientFirstName.trim()) return toast.error("Client first name is required");
    if (!clientLastName.trim()) return toast.error("Client last name is required");
    if (!clientPhone.trim()) return toast.error("Client phone is required");
    if (!serviceAddress.trim()) return toast.error("Service address is required");
    if (!postalCode.trim()) return toast.error("Postal code is required");
    if (!serviceDate) return toast.error("Service date is required");
    if (!startTime) return toast.error("Start time is required");

    if (serviceCategory === "standard" && selectedServices.length === 0) {
      return toast.error("Select at least one service");
    }

    if (effectivePaymentMode === "pay-now" && !clientEmail.trim()) {
      return toast.error("Email is required for Stripe payment");
    }

    const fullName = `${clientFirstName.trim()} ${clientLastName.trim()}`;
    setSubmitting(true);

    try {
      const hours = parseFloat(duration);
      const endTime = calculateEndTime(startTime, hours);
      const hourlyRate = rates.firstHour;
      const total = calculatedTotal;

      const serviceNames = getServiceNames();

      const { data: { user } } = await supabase.auth.getUser();

      const body: Record<string, unknown> = {
        user_id: user?.id || null,
        client_name: fullName,
        client_email: clientEmail.trim() || `admin-order-${Date.now()}@manual.local`,
        client_phone: clientPhone.trim(),
        client_address: serviceAddress.trim(),
        client_postal_code: postalCode.trim().toUpperCase(),
        patient_name: fullName,
        patient_address: serviceAddress.trim(),
        patient_postal_code: postalCode.trim().toUpperCase(),
        scheduled_date: serviceDate,
        start_time: startTime,
        end_time: endTime,
        hours,
        hourly_rate: hourlyRate,
        subtotal: total,
        surge_amount: 0,
        total,
        service_type: serviceNames,
        payment_status: effectivePaymentMode === "invoice" ? "invoice-pending" : "pending",
        is_asap: false,
        is_transport_booking: isTransport,
        special_notes: specialNotes.trim() || null,
      };

      // Add invoice-specific fields
      if (effectivePaymentMode === "invoice") {
        const termsDays = getPaymentTermsDays();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + termsDays);

        if (isVACPayer(thirdPartyPayerType)) {
          body.payer_type = "government";
          body.payer_name = VAC_STATIC.payerName;
        } else if (isInsurancePayer(thirdPartyPayerType)) {
          body.payer_type = "insurance";
          body.payer_name = getInsurancePrettyName(thirdPartyPayerType);
        } else {
          body.payer_type = "client";
          body.payer_name = fullName;
        }

        body.payment_terms_days = termsDays;
        body.due_date = dueDate.toISOString();
        body.cc_email = ccEmail.trim() || null;
      }

      // Add transport-specific fields
      if (isTransport) {
        body.pickup_address = pickupAddress.trim() || serviceAddress.trim();
        body.pickup_postal_code = pickupPostalCode.trim().toUpperCase() || postalCode.trim().toUpperCase();
        body.dropoff_address = dropoffAddress.trim() || null;
      }

      const { data: result, error: fnError } = await supabase.functions.invoke("create-booking", {
        body,
      });

      if (fnError || result?.error) {
        throw new Error(fnError?.message || result?.error || "Failed to create booking");
      }

      const bookingCode = result.booking_code;
      const bookingUuid = result.booking_id;

      // Write third-party payer metadata directly to the booking record
      if (isThirdPartyPayer(thirdPartyPayerType)) {
        const metaUpdate: Record<string, unknown> = {
          third_party_payer_mode: thirdPartyPayerType,
        };

        if (isVACPayer(thirdPartyPayerType)) {
          metaUpdate.vac_program_of_choice = vacProgramOfChoice.trim() || VAC_STATIC.programOfChoice;
          metaUpdate.vac_provider_number = vacProviderNumber.trim() || VAC_STATIC.providerNumber;
          metaUpdate.vac_benefit_code = effectiveBenefitCode || null;
          metaUpdate.vac_service_type = vacServiceType || null;
          metaUpdate.veteran_k_number = veteranKNumber.trim() || null;
          metaUpdate.vac_authorization_number = vacAuthorizationNumber.trim() || null;
          metaUpdate.vac_status = isVacProvisional ? "provisional" : "verified";
        }

        if (isInsurancePayer(thirdPartyPayerType)) {
          metaUpdate.insurance_member_id = insuranceMemberId.trim() || null;
          metaUpdate.insurance_claim_number = insurancePolicyNumber.trim() || null;
          metaUpdate.insurance_contact_name = insuranceContactName.trim() || null;
          metaUpdate.insurance_contact_email = insuranceContactEmail.trim() || null;
          metaUpdate.insurance_contact_phone = insuranceContactPhone.trim() || null;
          metaUpdate.insurance_claim_notes = insuranceClaimNotes.trim() || null;
        }

        await supabase
          .from("bookings")
          .update(metaUpdate as any)
          .eq("id", bookingUuid);
      }

      addShift({
        bookingId: bookingCode,
        pswId: "",
        pswName: "",
        clientName: fullName,
        clientFirstName: clientFirstName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        patientAddress: serviceAddress.trim(),
        postalCode: postalCode.trim().toUpperCase(),
        scheduledStart: startTime,
        scheduledEnd: endTime,
        scheduledDate: serviceDate,
        services: serviceNames,
        agreementAccepted: false,
        overtimeMinutes: 0,
        flaggedForOvertime: false,
        postedAt: new Date().toISOString(),
        status: "available",
      });

      if (pswNumber.trim()) {
        const pswNum = parseInt(pswNumber.replace(/\D/g, ""));
        if (!isNaN(pswNum)) {
          const { data: pswProfile } = await supabase
            .from("psw_profiles")
            .select("id, first_name, last_name, psw_number")
            .eq("psw_number", pswNum)
            .single();

          if (pswProfile) {
            await supabase
              .from("bookings")
              .update({
                psw_assigned: pswProfile.id,
                psw_first_name: pswProfile.first_name,
                status: "active",
              })
              .eq("id", bookingUuid);
            toast.success(`PSW ${pswProfile.first_name} assigned`);
          } else {
            toast.warning(`PSW number ${pswNum} not found - booking created without assignment`);
          }
        }
      }

      // ── Recurring job creation ──
      if (recurringConfig.enabled && effectivePaymentMode === "invoice") {
        try {
          const occurrenceDates = generateOccurrenceDates(serviceDate, recurringConfig);
          
          // Mark parent booking as recurring
          await supabase.from("bookings").update({ is_recurring: true }).eq("id", bookingUuid);
          
          // Build payer snapshot for children
          const payerSnapshot: Record<string, unknown> = {
            payer_type: body.payer_type,
            payer_name: body.payer_name,
            third_party_payer_mode: thirdPartyPayerType !== "private-pay" ? thirdPartyPayerType : null,
          };
          if (isVACPayer(thirdPartyPayerType)) {
            payerSnapshot.vac_provider_number = vacProviderNumber.trim() || VAC_STATIC.providerNumber;
            payerSnapshot.vac_program_of_choice = vacProgramOfChoice.trim() || VAC_STATIC.programOfChoice;
            payerSnapshot.vac_benefit_code = effectiveBenefitCode || null;
            payerSnapshot.vac_service_type = vacServiceType || null;
            payerSnapshot.veteran_k_number = veteranKNumber.trim() || null;
            payerSnapshot.vac_authorization_number = vacAuthorizationNumber.trim() || null;
          }
          if (isInsurancePayer(thirdPartyPayerType)) {
            payerSnapshot.insurance_member_id = insuranceMemberId.trim() || null;
            payerSnapshot.insurance_claim_number = insurancePolicyNumber.trim() || null;
          }

          // Create parent schedule record
          const { data: scheduleRow } = await supabase.from("recurring_schedules").insert({
            parent_booking_id: bookingUuid,
            frequency: recurringConfig.frequency,
            end_type: recurringConfig.endType,
            max_occurrences: recurringConfig.endType === "after_occurrences" ? recurringConfig.maxOccurrences : null,
            end_date: recurringConfig.endType === "on_date" ? recurringConfig.endDate : null,
            occurrences_created: 1 + occurrenceDates.length,
            same_day_time: recurringConfig.sameDayTime,
            payer_snapshot: payerSnapshot,
          }).select("id").single();

          const scheduleId = scheduleRow?.id;
          if (scheduleId) {
            // Link parent booking
            await supabase.from("bookings").update({ parent_schedule_id: scheduleId }).eq("id", bookingUuid);
          }

          // Create child bookings
          let childCount = 0;
          for (const childDate of occurrenceDates) {
            const childEndTime = calculateEndTime(startTime, hours);
            const childBody = { ...body, scheduled_date: childDate, end_time: childEndTime, is_recurring: true };
            
            const { data: childResult, error: childErr } = await supabase.functions.invoke("create-booking", { body: childBody });
            if (!childErr && childResult?.booking_id) {
              childCount++;
              const childUuid = childResult.booking_id;
              const childUpdates: Record<string, unknown> = { is_recurring: true };
              if (scheduleId) childUpdates.parent_schedule_id = scheduleId;
              
              // Copy payer metadata to child
              if (isThirdPartyPayer(thirdPartyPayerType)) {
                Object.assign(childUpdates, {
                  third_party_payer_mode: thirdPartyPayerType,
                  ...Object.fromEntries(
                    Object.entries(payerSnapshot).filter(([k]) => k !== "payer_type" && k !== "payer_name")
                  ),
                });
              }
              await supabase.from("bookings").update(childUpdates as any).eq("id", childUuid);
            }
          }
          if (childCount > 0) {
            toast.success(`${childCount} recurring occurrence${childCount > 1 ? "s" : ""} created (${getFrequencyLabel(recurringConfig.frequency)})`);
          }
        } catch (recErr) {
          console.error("Recurring job creation error:", recErr);
          toast.warning("Parent order created but some recurring occurrences may have failed");
        }
      }

      // If Pay Now → show Stripe payment form
      if (effectivePaymentMode === "pay-now") {
        setPendingPayment({
          bookingCode,
          bookingUuid,
          clientName: fullName,
          clientEmail: clientEmail.trim(),
          serviceDate,
          startTime,
          total,
          services: serviceNames,
        });
        onOrderCreated?.();
        toast.success(`Order ${bookingCode} created — enter card details to charge`);
      } else {
        setSuccessData({
          bookingCode,
          bookingUuid,
          clientName: fullName,
          serviceDate,
          startTime,
        });
        onOrderCreated?.();
        const payerLabel = isThirdPartyPayer(thirdPartyPayerType)
          ? ` (${getInsurancePrettyName(thirdPartyPayerType)})`
          : "";
        toast.success(`Order ${bookingCode} created${payerLabel}`);
      }
    } catch (err: any) {
      console.error("MOC error:", err);
      toast.error(err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!pendingPayment) return;
    await supabase
      .from("bookings")
      .update({
        stripe_payment_intent_id: paymentIntentId,
        payment_status: "paid",
      })
      .eq("id", pendingPayment.bookingUuid);

    try {
      const { data: booking } = await supabase
        .from("bookings")
        .select("booking_code, client_address, patient_postal_code, client_postal_code, patient_address, scheduled_date, start_time, service_type, is_asap, preferred_gender, preferred_languages, is_transport_booking")
        .eq("id", pendingPayment.bookingUuid)
        .single();

      if (booking) {
        await supabase.functions.invoke("notify-psws", {
          body: {
            booking_code: booking.booking_code,
            city: booking.client_address?.split(",").slice(-2, -1)[0]?.trim() || "",
            service_type: booking.service_type,
            scheduled_date: booking.scheduled_date,
            start_time: booking.start_time,
            is_asap: booking.is_asap || false,
            patient_postal_code: booking.patient_postal_code || booking.client_postal_code || null,
            patient_address: booking.patient_address || booking.client_address || null,
            preferred_gender: booking.preferred_gender || null,
            preferred_languages: booking.preferred_languages || null,
            is_transport_booking: booking.is_transport_booking || false,
          },
        });
      }
    } catch (e) {
      console.warn("Failed to dispatch PSW notifications after payment:", e);
    }

    setSuccessData({
      bookingCode: pendingPayment.bookingCode,
      bookingUuid: pendingPayment.bookingUuid,
      clientName: pendingPayment.clientName,
      serviceDate: pendingPayment.serviceDate,
      startTime: pendingPayment.startTime,
      paymentIntentId,
    });
    setPendingPayment(null);
  };

  const handlePaymentError = (error: string) => {
    toast.error(`Payment failed: ${error}`);
  };

  const handleSkipPayment = () => {
    if (!pendingPayment) return;
    supabase
      .from("bookings")
      .update({ payment_status: "invoice-pending" })
      .eq("id", pendingPayment.bookingUuid)
      .then(() => {
        setSuccessData({
          bookingCode: pendingPayment.bookingCode,
          bookingUuid: pendingPayment.bookingUuid,
          clientName: pendingPayment.clientName,
          serviceDate: pendingPayment.serviceDate,
          startTime: pendingPayment.startTime,
        });
        setPendingPayment(null);
        toast.info("Payment skipped — booking saved as invoice-pending");
      });
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

  // Payment collection screen
  if (pendingPayment) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Charge Client — {pendingPayment.bookingCode}
            </DialogTitle>
            <DialogDescription>
              Enter the client's card details to process payment of ${pendingPayment.total.toFixed(2)} for {pendingPayment.clientName}.
            </DialogDescription>
          </DialogHeader>

          <StripePaymentForm
            amount={pendingPayment.total}
            customerEmail={pendingPayment.clientEmail}
            customerName={pendingPayment.clientName}
            bookingDetails={{
              bookingId: pendingPayment.bookingCode,
              bookingUuid: pendingPayment.bookingUuid,
              serviceDate: pendingPayment.serviceDate,
              services: pendingPayment.services.join(", "),
            }}
            onPaymentSuccess={handlePaymentSuccess}
            onPaymentError={handlePaymentError}
            onCancel={handleSkipPayment}
          />

          <Button variant="ghost" size="sm" className="mt-2" onClick={handleSkipPayment}>
            <ArrowLeft className="w-3 h-3 mr-1" />
            Skip payment — save as invoice
          </Button>
        </DialogContent>
      </Dialog>
    );
  }

  // Success screen
  if (successData) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-5 h-5" />
              Order Created Successfully
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Booking Code</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-foreground">{successData.bookingCode}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(successData.bookingCode, "Booking Code")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">UUID (Internal)</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-muted-foreground truncate max-w-[180px]">{successData.bookingUuid}</span>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(successData.bookingUuid, "UUID")}>
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Client</span>
                <span className="text-sm font-medium text-foreground">{successData.clientName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Date / Time</span>
                <span className="text-sm font-medium text-foreground">{successData.serviceDate} @ {successData.startTime}</span>
              </div>
              {successData.paymentIntentId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Stripe PI</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[160px]">{successData.paymentIntentId}</span>
                    <Button variant="ghost" size="sm" onClick={() => copyToClipboard(successData.paymentIntentId!, "Payment Intent ID")}>
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleClose}>Close</Button>
              <Button className="flex-1" onClick={() => { resetForm(); setSuccessData(null); }}>Create Another</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const categoryLabel = serviceCategory === "standard" ? "Home Care"
    : serviceCategory === "doctor-appointment" ? "Doctor Escort"
    : serviceCategory === "hospital-discharge" ? "Hospital / Discharge"
    : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create Order (Manual)
          </DialogTitle>
          <DialogDescription>
            Admin manual order creation. Uses the same booking pipeline as client orders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* ── Service Type Selector ── */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Service Type *</Label>
            <div className="grid grid-cols-3 gap-3">
              {([
                { value: "standard" as ServiceCategory, label: "Home Care", icon: Home, desc: "Personal care, companionship, meal prep" },
                { value: "doctor-appointment" as ServiceCategory, label: "Doctor Escort", icon: Stethoscope, desc: "Accompany to medical appointments" },
                { value: "hospital-discharge" as ServiceCategory, label: "Hospital / Discharge", icon: Building2, desc: "Hospital pick-up or drop-off" },
              ]).map(opt => {
                const Icon = opt.icon;
                const selected = serviceCategory === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleCategoryChange(opt.value)}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-lg border-2 transition-all text-center ${
                      selected
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border hover:border-primary/40 hover:bg-muted/30"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                    <span className="text-xs text-muted-foreground leading-tight">{opt.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Client Info ── */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground text-sm border-b pb-1">Client Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="moc-first-name">First Name *</Label>
                <Input id="moc-first-name" value={clientFirstName} onChange={e => setClientFirstName(e.target.value)} placeholder="John" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-last-name">Last Name *</Label>
                <Input id="moc-last-name" value={clientLastName} onChange={e => setClientLastName(e.target.value)} placeholder="Smith" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-phone">Phone *</Label>
                <Input id="moc-phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} onBlur={() => setClientPhone(formatCanadianPhone(clientPhone))} placeholder="(416) 555-1234" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-email">Email</Label>
                <Input id="moc-email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-postal">Postal Code *</Label>
                <Input id="moc-postal" value={postalCode} onChange={e => setPostalCode(e.target.value)} onBlur={() => setPostalCode(formatPostalCode(postalCode))} placeholder="M5V 3L9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="moc-address">Service Address *</Label>
              <Input id="moc-address" value={serviceAddress} onChange={e => setServiceAddress(e.target.value)} placeholder="123 Main St, Toronto, ON" />
            </div>
          </div>

          {/* ── Transport Fields ── */}
          {isTransport && (
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground text-sm border-b pb-1">Transport Details</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="moc-pickup">Pickup Address</Label>
                  <Input id="moc-pickup" value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Same as service address if blank" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="moc-pickup-postal">Pickup Postal Code</Label>
                  <Input id="moc-pickup-postal" value={pickupPostalCode} onChange={e => setPickupPostalCode(e.target.value)} onBlur={() => setPickupPostalCode(formatPostalCode(pickupPostalCode))} placeholder="M5V 3L9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-dropoff">Destination Address</Label>
                <Input id="moc-dropoff" value={dropoffAddress} onChange={e => setDropoffAddress(e.target.value)} placeholder="Hospital or clinic address" />
              </div>
            </div>
          )}

          {/* ── Booking Details ── */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground text-sm border-b pb-1">Booking Details</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="moc-date">Service Date *</Label>
                <Input id="moc-date" type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-time">Start Time *</Label>
                <TimePicker id="moc-time" value={startTime} onChange={setStartTime} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-duration">Duration (hrs)</Label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 1.5, 2, 2.5, 3, 4, 5, 6, 8].map(h => (
                      <SelectItem key={h} value={String(h)}>{h} hr{h > 1 ? "s" : ""}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {serviceCategory === "standard" && (
              <div className="space-y-2">
                <Label>Services *</Label>
                <div className="flex flex-wrap gap-2">
                  {homeCareTasksOnly.map(task => (
                    <Badge
                      key={task.id}
                      variant={selectedServices.includes(task.id) ? "default" : "outline"}
                      className="cursor-pointer select-none"
                      onClick={() => toggleService(task.id)}
                    >
                      {task.name}
                    </Badge>
                  ))}
                </div>
                {selectedServices.length === 0 && (
                  <p className="text-xs text-muted-foreground">Click to select services</p>
                )}
              </div>
            )}

            {isTransport && categoryLabel && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Service:</Label>
                <Badge variant="default">{categoryLabel}</Badge>
              </div>
            )}

            {serviceCategory && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rate ({categoryLabel})</span>
                  <span className="font-medium text-foreground">${rates.firstHour.toFixed(2)} / first hr + ${rates.per30Min.toFixed(2)} / 30 min</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span>Estimated Total ({duration} hr{parseFloat(duration) > 1 ? "s" : ""})</span>
                  <span className="text-primary">${calculatedTotal.toFixed(2)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Final total calculated server-side by the booking engine.</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="moc-notes">Special Notes</Label>
              <Textarea id="moc-notes" value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>
          </div>

          {/* ── Payer Type ── */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground text-sm border-b pb-1 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Payer Type
            </h4>
            <div className="space-y-1.5">
              <Label>Who is paying? *</Label>
              <Select value={thirdPartyPayerType} onValueChange={(v) => setThirdPartyPayerType(v as ThirdPartyPayerType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYER_TYPE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ── VAC Fields ── */}
            {isVACPayer(thirdPartyPayerType) && (
              <div className="space-y-3 p-3 border border-amber-200 rounded-lg bg-amber-50/50">
                <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Veterans Affairs Canada (VIP)
                </p>

                {/* Auto-filled static fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">Payer Name</Label>
                    <Input value={VAC_STATIC.payerName} readOnly className="bg-muted text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="moc-vac-provider" className="text-xs text-muted-foreground">Provider Number</Label>
                    <Input id="moc-vac-provider" value={vacProviderNumber} onChange={e => setVacProviderNumber(e.target.value)} placeholder="100146" className="text-sm" />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="moc-vac-program" className="text-xs text-muted-foreground">Program of Choice</Label>
                    <Input id="moc-vac-program" value={vacProgramOfChoice} onChange={e => setVacProgramOfChoice(e.target.value)} placeholder="15" className="text-sm" />
                  </div>
                </div>

                {/* Veteran fields */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-k-number">Veteran K# *</Label>
                    <Input id="moc-k-number" value={veteranKNumber} onChange={e => setVeteranKNumber(e.target.value)} placeholder="K1234567" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-vac-auth">Authorization Number</Label>
                    <Input id="moc-vac-auth" value={vacAuthorizationNumber} onChange={e => setVacAuthorizationNumber(e.target.value)} placeholder="Optional" />
                  </div>
                </div>

                {/* VAC Service Type */}
                <div className="space-y-1.5">
                  <Label>VAC Service Type *</Label>
                  <Select value={vacServiceType} onValueChange={setVacServiceType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select VAC service type" />
                    </SelectTrigger>
                    <SelectContent>
                      {VAC_SERVICE_TYPES.map(svc => (
                        <SelectItem key={svc.value} value={svc.value}>
                          {svc.label} (Code: {svc.benefitCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Benefit code override */}
                {vacServiceType && (
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-benefit-code" className="text-xs">
                      Benefit Code (default: {getVACBenefitCode(vacServiceType)})
                    </Label>
                    <Input
                      id="moc-benefit-code"
                      value={vacBenefitCodeOverride}
                      onChange={e => setVacBenefitCodeOverride(e.target.value)}
                      placeholder={getVACBenefitCode(vacServiceType)}
                      className="text-sm"
                    />
                    <p className="text-xs text-muted-foreground">Leave blank to use default. Override only if needed.</p>
                  </div>
                )}

                {/* VAC Warnings */}
                {vacWarnings.length > 0 && (
                  <div className="p-2 bg-amber-100 border border-amber-300 rounded-md space-y-1">
                    <p className="text-xs font-semibold text-amber-900 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Order will be marked as provisional
                    </p>
                    {vacWarnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-800">• {w}</p>
                    ))}
                    <p className="text-xs text-amber-700 italic">Order creation is not blocked.</p>
                  </div>
                )}
              </div>
            )}

            {/* ── Insurance Fields ── */}
            {isInsurancePayer(thirdPartyPayerType) && (
              <div className="space-y-3 p-3 border border-blue-200 rounded-lg bg-blue-50/50">
                <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
                  {getInsurancePrettyName(thirdPartyPayerType)} — Claim Details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-ins-policy">Policy / Claim Number</Label>
                    <Input id="moc-ins-policy" value={insurancePolicyNumber} onChange={e => setInsurancePolicyNumber(e.target.value)} placeholder="CLM-123456" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-ins-member">Member ID</Label>
                    <Input id="moc-ins-member" value={insuranceMemberId} onChange={e => setInsuranceMemberId(e.target.value)} placeholder="MEM-789" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-ins-contact">Payer Contact Name</Label>
                    <Input id="moc-ins-contact" value={insuranceContactName} onChange={e => setInsuranceContactName(e.target.value)} placeholder="Claims adjuster" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-ins-email">Payer Email</Label>
                    <Input id="moc-ins-email" type="email" value={insuranceContactEmail} onChange={e => setInsuranceContactEmail(e.target.value)} placeholder="claims@insurer.com" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-ins-phone">Payer Phone</Label>
                    <Input id="moc-ins-phone" value={insuranceContactPhone} onChange={e => setInsuranceContactPhone(e.target.value)} placeholder="(800) 555-0000" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="moc-ins-notes">Claim Notes</Label>
                  <Textarea id="moc-ins-notes" value={insuranceClaimNotes} onChange={e => setInsuranceClaimNotes(e.target.value)} placeholder="Additional notes for the claim..." rows={2} />
                </div>
              </div>
            )}
          </div>

          {/* ── Payment & Assignment ── */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground text-sm border-b pb-1">Payment & Assignment</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                {isThirdPartyPayer(thirdPartyPayerType) ? (
                  <div className="flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-muted text-sm text-muted-foreground">
                    <FileText className="w-3 h-3" />
                    Invoice Only (Third-Party)
                  </div>
                ) : (
                  <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as "invoice" | "pay-now")}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invoice">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3 h-3" />
                          Invoice Later
                        </div>
                      </SelectItem>
                      <SelectItem value="pay-now">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-3 h-3" />
                          Pay Now (Stripe)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-psw">Assign PSW (optional)</Label>
                <Input id="moc-psw" value={pswNumber} onChange={e => setPswNumber(e.target.value)} placeholder="e.g. 1001 or PSW-1001" />
              </div>
            </div>

            {/* Invoice Later — additional fields (for private pay or third-party) */}
            {effectivePaymentMode === "invoice" && (
              <div className="space-y-3 p-3 border border-border rounded-lg bg-muted/30">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Invoice Terms</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Payment Terms *</Label>
                    <Select value={paymentTerms} onValueChange={(v) => setPaymentTerms(v as "2" | "14" | "custom")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2">Net 2 (2 days)</SelectItem>
                        <SelectItem value="14">Net 14 (14 days)</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-cc-email">CC Email (optional)</Label>
                    <Input id="moc-cc-email" type="email" value={ccEmail} onChange={e => setCcEmail(e.target.value)} placeholder="billing@payer.com" />
                  </div>
                </div>
                {paymentTerms === "custom" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="moc-custom-terms">Custom Days</Label>
                    <Input id="moc-custom-terms" type="number" min="1" max="365" value={customTermsDays} onChange={e => setCustomTermsDays(e.target.value)} placeholder="Enter number of days" />
                  </div>
                )}
              </div>
            )}

            {effectivePaymentMode === "pay-now" && !clientEmail.trim() && (
              <p className="text-xs text-amber-600">⚠️ Email is required for Stripe payment</p>
            )}
            {effectivePaymentMode === "pay-now" && clientEmail.trim() && (
              <p className="text-xs text-muted-foreground">After creating the order, you'll be prompted to enter the client's card details via Stripe.</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting || !serviceCategory}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</>
              ) : effectivePaymentMode === "pay-now" ? (
                <><CreditCard className="w-4 h-4 mr-2" />Create & Charge</>
              ) : (
                <><Plus className="w-4 h-4 mr-2" />Create Order</>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
