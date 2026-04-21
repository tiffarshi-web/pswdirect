import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Check, User, MapPin, Clock, CreditCard, Stethoscope, Hospital, Home, Plus, Calendar, Shield, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

import { useSupabaseAuth } from "@/hooks/useSupabaseAuth";
import { useCareRecipients, type CareRecipient, type CareRecipientInput } from "@/hooks/useCareRecipients";
import { useSavedPaymentMethod } from "@/hooks/useSavedPaymentMethod";
import { useServiceTasks } from "@/hooks/useServiceTasks";
import { useStepScrollReset } from "@/hooks/useStepScrollReset";
import { fetchPricingRatesFromDB } from "@/lib/pricingConfigStore";
import { calculateDurationBasedPrice } from "@/lib/businessConfig";
import { isValidCanadianPostalCode, isWithinAnyPSWCoverageAsync } from "@/lib/postalCodeUtils";
import { initializePSWProfiles } from "@/lib/pswProfileStore";
import { addBooking, createDraftBooking, finalizeDraftBookingPaymentLink, type BookingData } from "@/lib/bookingStore";
import { StripePaymentForm } from "@/components/client/StripePaymentForm";
import { InstallAppPrompt } from "@/components/client/InstallAppPrompt";
import { SERVICE_TYPE_OPTIONS, DURATION_OPTIONS } from "@/components/booking/types";
import type { ServiceCategory } from "@/lib/taskConfig";
import type { GenderPreference } from "@/lib/shiftStore";

type FlowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS = [
  { id: 1, label: "Service", icon: Stethoscope },
  { id: 2, label: "Recipient", icon: User },
  { id: 3, label: "Location", icon: MapPin },
  { id: 4, label: "When", icon: Clock },
  { id: 5, label: "Details", icon: Home },
  { id: 6, label: "Payment", icon: CreditCard },
  { id: 7, label: "Confirm", icon: Check },
];

interface ReturningClientBookingFlowProps {
  onBack: () => void;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  prefillData?: {
    serviceCategory?: ServiceCategory;
    recipientId?: string;
    address?: string;
    postalCode?: string;
    city?: string;
    serviceType?: string[];
    specialNotes?: string;
    careConditions?: string[];
  };
}

export const ReturningClientBookingFlow = ({
  onBack,
  clientName,
  clientEmail,
  clientPhone,
  prefillData,
}: ReturningClientBookingFlowProps) => {
  const navigate = useNavigate();
  const { user, clientProfile } = useSupabaseAuth();
  const { recipients, addRecipient, isLoading: recipientsLoading } = useCareRecipients();
  const { savedMethod, isLoading: pmLoading } = useSavedPaymentMethod();
  const { tasks: serviceTasks, loading: tasksLoading } = useServiceTasks();
  const containerRef = useRef<HTMLDivElement>(null);

  const resolvedEmail = clientEmail || user?.email || "";
  const resolvedName = clientName || user?.user_metadata?.full_name || "";
  const resolvedPhone = clientPhone || "";

  useEffect(() => { fetchPricingRatesFromDB(); }, []);

  // ── State ──
  const [step, setStep] = useState<FlowStep>(1);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(prefillData?.serviceCategory || null);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState(1);

  // Recipient
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(prefillData?.recipientId || null);
  const [addingNewRecipient, setAddingNewRecipient] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ firstName: "", lastName: "", relationship: "" });

  // Location
  const [useDefaultAddress, setUseDefaultAddress] = useState(true);
  const [streetNumber, setStreetNumber] = useState("");
  const [streetName, setStreetName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [city, setCity] = useState(prefillData?.city || "");
  const [province] = useState("ON");
  const [postalCode, setPostalCode] = useState(prefillData?.postalCode || "");
  const [buzzerCode, setBuzzerCode] = useState("");
  const [entryInstructions, setEntryInstructions] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupPostalCode, setPickupPostalCode] = useState("");
  const [addressError, setAddressError] = useState<string | null>(null);

  // Timing
  const [isAsap, setIsAsap] = useState(false);
  const [serviceDate, setServiceDate] = useState("");
  const [startTime, setStartTime] = useState("");

  // Details
  const [specialNotes, setSpecialNotes] = useState(prefillData?.specialNotes || "");
  const [careConditions, setCareConditions] = useState<string[]>(prefillData?.careConditions || []);
  const [doctorOfficeName, setDoctorOfficeName] = useState("");
  const [doctorSuiteNumber, setDoctorSuiteNumber] = useState("");

  // Payment
  const [useSavedCard, setUseSavedCard] = useState(true);
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [agreedToPolicy, setAgreedToPolicy] = useState(false);
  const [draftBooking, setDraftBooking] = useState<{ bookingUuid: string; bookingCode: string } | null>(null);

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingComplete, setBookingComplete] = useState(false);
  const [completedBooking, setCompletedBooking] = useState<BookingData | null>(null);
  const [isCheckingAddress, setIsCheckingAddress] = useState(false);

  useStepScrollReset(containerRef, [step, showStripeForm]);

  // Pre-fill from selected recipient
  const selectedRecipient = recipients.find(r => r.id === selectedRecipientId);

  useEffect(() => {
    if (selectedRecipient && useDefaultAddress && selectedRecipient.default_address) {
      // Use recipient's address
      setCity(selectedRecipient.city || "");
      setPostalCode(selectedRecipient.postal_code || "");
      setBuzzerCode(selectedRecipient.buzzer_code || "");
      setEntryInstructions(selectedRecipient.entry_instructions || "");
    } else if (useDefaultAddress && clientProfile?.default_address) {
      setPostalCode(clientProfile.default_postal_code || "");
    }
  }, [selectedRecipientId, useDefaultAddress]);

  // Pre-fill services from prefillData
  useEffect(() => {
    if (prefillData?.serviceType && serviceTasks.length > 0 && selectedServices.length === 0) {
      const matchedIds = prefillData.serviceType
        .map(name => serviceTasks.find(t => t.name === name)?.id)
        .filter(Boolean) as string[];
      if (matchedIds.length > 0) setSelectedServices(matchedIds);
    }
  }, [prefillData?.serviceType, serviceTasks]);

  const isTransportCategory = selectedCategory === "doctor-appointment" || selectedCategory === "hospital-discharge";

  // Pricing
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
    if (selectedServices.length === 0 || !selectedCategory) return null;
    return calculateDurationBasedPrice(selectedDuration, selectedCategory, isAsap, city, postalCode, serviceDate, startTime, taxableFraction);
  }, [selectedServices, selectedDuration, selectedCategory, isAsap, city, postalCode, serviceDate, startTime, taxableFraction]);

  // Helpers
  const getFullAddress = () => {
    if (useDefaultAddress && selectedRecipient?.default_address) return selectedRecipient.default_address;
    if (useDefaultAddress && clientProfile?.default_address) return clientProfile.default_address;
    const parts = [`${streetNumber} ${streetName}`.trim()];
    if (unitNumber) parts.push(`Unit ${unitNumber}`);
    if (city) parts.push(city);
    if (province) parts.push(province);
    if (postalCode) parts.push(postalCode);
    return parts.join(", ");
  };

  const getCalculatedEndTime = () => {
    if (!startTime) return "";
    const [hours, mins] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + selectedDuration * 60;
    return `${(Math.floor(totalMinutes / 60) % 24).toString().padStart(2, "0")}:${(totalMinutes % 60).toString().padStart(2, "0")}`;
  };

  const getRecipientName = () => {
    if (selectedRecipient) return selectedRecipient.full_name;
    return resolvedName;
  };

  // Navigation
  const goNext = async () => {
    if (step === 3) {
      const valid = await validateAddress();
      if (!valid) return;
    }
    if (step < 7) setStep((s) => (s + 1) as FlowStep);
  };

  const goBack = () => {
    if (showStripeForm) { setShowStripeForm(false); return; }
    if (step > 1) setStep((s) => (s - 1) as FlowStep);
    else onBack();
  };

  const validateAddress = async (): Promise<boolean> => {
    const pc = postalCode.trim() || clientProfile?.default_postal_code || "";
    if (!pc) { setAddressError("Postal code is required"); return false; }
    if (!isValidCanadianPostalCode(pc)) { setAddressError("Invalid postal code format"); return false; }

    setIsCheckingAddress(true);
    setAddressError(null);
    initializePSWProfiles();

    try {
      const result = await isWithinAnyPSWCoverageAsync(pc);
      if (!result.withinCoverage) { setAddressError(result.message); setIsCheckingAddress(false); return false; }
      setIsCheckingAddress(false);
      return true;
    } catch {
      setAddressError("Error checking coverage. Please try again.");
      setIsCheckingAddress(false);
      return false;
    }
  };

  // Build booking payload (used by both draft creation and fallback finalization)
  const buildBookingPayload = (paidIntentId?: string): Omit<BookingData, "id" | "createdAt"> | null => {
    const serviceNames = selectedServices.map(id => serviceTasks.find(s => s.id === id)?.name || id);

    let bookingDate = serviceDate;
    let bookingStartTime = startTime;
    let bookingEndTime = getCalculatedEndTime();

    if (isAsap || !bookingDate || !bookingStartTime) {
      const now = new Date();
      bookingDate = now.toISOString().split("T")[0];
      now.setMinutes(now.getMinutes() + 15);
      bookingStartTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
      const endDate = new Date(now.getTime() + selectedDuration * 60 * 60000);
      bookingEndTime = `${endDate.getHours().toString().padStart(2, "0")}:${endDate.getMinutes().toString().padStart(2, "0")}`;
    }

    const recipientName = getRecipientName();
    const recipientFirstName = selectedRecipient?.first_name || recipientName.split(" ")[0] || "";
    const recipientLastName = selectedRecipient?.last_name || recipientName.split(" ").slice(1).join(" ") || "";

    return {
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
        postalCode: postalCode || clientProfile?.default_postal_code || "",
        phone: resolvedPhone,
        email: resolvedEmail,
        isNewAccount: false,
        streetNumber,
        streetName,
      },
      patient: {
        name: recipientName,
        firstName: recipientFirstName,
        lastName: recipientLastName,
        address: getFullAddress(),
        postalCode: postalCode || clientProfile?.default_postal_code || "",
        relationship: selectedRecipient?.relationship || "Self",
        preferredLanguages: selectedRecipient?.preferred_languages || undefined,
        preferredGender: (selectedRecipient?.preferred_gender as GenderPreference) || "no-preference",
      },
      pickupAddress: isTransportCategory ? pickupAddress : undefined,
      pickupPostalCode: isTransportCategory ? pickupPostalCode : undefined,
      isTransportBooking: isTransportCategory,
      pswAssigned: null,
      specialNotes: specialNotes || selectedRecipient?.special_instructions || "",
      careConditions: careConditions.length > 0 ? careConditions : undefined,
      doctorOfficeName: doctorOfficeName || undefined,
      doctorSuiteNumber: doctorSuiteNumber || undefined,
      buzzerCode: buzzerCode || selectedRecipient?.buzzer_code || undefined,
      entryPoint: entryInstructions || selectedRecipient?.entry_instructions || undefined,
      emailNotifications: { confirmationSent: true, confirmationSentAt: new Date().toISOString(), reminderSent: false },
      adminNotifications: { notified: true, notifiedAt: new Date().toISOString() },
    };
  };

  // ── BOOKING-FIRST: create draft before showing Stripe form ──
  const proceedToPayment = async () => {
    if (!pricing || pricing.total < 20) { toast.error("Minimum booking is $20"); return; }

    if (draftBooking) {
      setShowStripeForm(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = buildBookingPayload();
      if (!payload) { toast.error("Could not prepare booking"); return; }
      const draft = await createDraftBooking(payload);
      setDraftBooking({ bookingUuid: draft.bookingUuid, bookingCode: draft.bookingCode });
      setShowStripeForm(true);
    } catch (err: any) {
      console.error("❌ Could not reserve booking before payment:", err);
      toast.error("Could not reserve your booking. Please try again.", { description: err?.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit booking — webhook is authoritative for promoting awaiting_payment → paid + pending.
  const handleSubmit = async (paidIntentId?: string) => {
    setIsSubmitting(true);
    try {
      // ── Draft path (booking-first): just stamp the PI link. ──
      if (draftBooking && paidIntentId) {
        const savedPmId = sessionStorage.getItem("last_payment_method_id");
        await finalizeDraftBookingPaymentLink(
          draftBooking.bookingUuid,
          paidIntentId,
          savedPmId,
        );
        if (savedPmId) sessionStorage.removeItem("last_payment_method_id");

        const payload = buildBookingPayload(paidIntentId);
        if (payload) {
          const completed: BookingData = {
            ...payload,
            id: draftBooking.bookingCode,
            createdAt: new Date().toISOString(),
            paymentStatus: "paid",
            stripePaymentIntentId: paidIntentId,
          } as BookingData;
          (completed as any).bookingUuid = draftBooking.bookingUuid;
          setCompletedBooking(completed);
        }
        toast.success("Booking confirmed!");
        setBookingComplete(true);
        return;
      }

      // ── Fallback path (no draft created — legacy/safety) ──
      const bookingData = buildBookingPayload(paidIntentId);
      if (!bookingData) return;
      const savedBooking = await addBooking(bookingData);

      const savedPmId = sessionStorage.getItem("last_payment_method_id");
      if (savedPmId && savedBooking.bookingUuid) {
        supabase.from("bookings")
          .update({ stripe_payment_method_id: savedPmId } as any)
          .eq("id", savedBooking.bookingUuid)
          .then(({ error }) => { if (!error) console.log("💳 Payment method saved"); });
        sessionStorage.removeItem("last_payment_method_id");
      }

      toast.success("Booking confirmed!");
      setCompletedBooking(savedBooking);
      setBookingComplete(true);
    } catch (err) {
      console.error("Booking error:", err);
      toast.error("Failed to save booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Completion Screen ──
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
            <p className="text-sm text-muted-foreground mb-1">Booking Code</p>
            <p className="text-2xl font-mono font-bold text-primary">{completedBooking.id}</p>
          </div>
          <div className="p-4 bg-muted rounded-lg text-left space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{completedBooking.date}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{completedBooking.startTime} – {completedBooking.endTime}</span>
            </div>
            <div className="flex justify-between text-sm pt-2 border-t">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold text-primary">${completedBooking.total.toFixed(2)}</span>
            </div>
          </div>
          <InstallAppPrompt clientName={resolvedName.split(" ")[0]} />
          <Button variant="outline" onClick={onBack} className="w-full">Go to Dashboard</Button>
        </CardContent>
      </Card>
    );
  }

  // ── Stripe Payment Step ──
  if (showStripeForm) {
    return (
      <div ref={containerRef} className="pb-24">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={goBack}><ArrowLeft className="w-5 h-5" /></Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">Complete Payment</h1>
            <p className="text-sm text-muted-foreground">Secure payment via Stripe</p>
          </div>
        </div>
        <StripePaymentForm
          amount={Math.max(20, pricing?.total || 20)}
          customerEmail={resolvedEmail}
          customerName={resolvedName}
          bookingDetails={{ serviceDate, services: selectedServices.map(id => serviceTasks.find(s => s.id === id)?.name || id).join(", ") }}
          onPaymentSuccess={async (id) => await handleSubmit(id)}
          onPaymentError={(err) => toast.error("Payment failed", { description: err })}
          onCancel={() => setShowStripeForm(false)}
        />
      </div>
    );
  }

  // ── Step Progress ──
  const renderProgress = () => (
    <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
      {STEP_LABELS.map((s) => {
        const Icon = s.icon;
        const isActive = step === s.id;
        const isDone = step > s.id;
        return (
          <div key={s.id} className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs whitespace-nowrap ${isActive ? "bg-primary text-primary-foreground font-medium" : isDone ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
            <Icon className="w-3 h-3" />
            <span className="hidden sm:inline">{s.label}</span>
          </div>
        );
      })}
    </div>
  );

  // ── STEP 1: Service Type ──
  const renderStep1 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">What type of care?</h2>
      <div className="grid gap-3">
        {SERVICE_TYPE_OPTIONS.map(opt => {
          const Icon = opt.icon;
          const isSelected = selectedCategory === opt.value;
          return (
            <button key={opt.value} onClick={() => { setSelectedCategory(opt.value); setSelectedServices([]); }} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"}`}>
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted"}`}><Icon className="w-5 h-5" /></div>
                <div><p className="font-medium text-foreground">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.description}</p></div>
              </div>
            </button>
          );
        })}
      </div>

      {selectedCategory && (
        <div className="space-y-3 pt-2">
          <h3 className="text-sm font-medium text-foreground">Select services:</h3>
          {tasksLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : (
            <div className="grid gap-2">
              {serviceTasks.filter(t => {
                if (selectedCategory === "standard") return t.serviceCategory === "standard";
                return t.serviceCategory === selectedCategory;
              }).map(task => (
                <button key={task.id} onClick={() => {
                  setSelectedServices(prev => prev.includes(task.id) ? prev.filter(s => s !== task.id) : [...prev, task.id]);
                }} className={`text-left p-3 rounded-lg border transition-all ${selectedServices.includes(task.id) ? "border-primary bg-primary/5" : "border-border"}`}>
                  <p className="text-sm font-medium text-foreground">{task.name}</p>
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm">Duration</Label>
            <Select value={String(selectedDuration)} onValueChange={v => setSelectedDuration(Number(v))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DURATION_OPTIONS.map(d => <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
    </div>
  );

  // ── STEP 2: Recipient ──
  const renderStep2 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Who is this care for?</h2>

      {recipientsLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <>
          <div className="grid gap-3">
            {recipients.map(r => (
              <button key={r.id} onClick={() => { setSelectedRecipientId(r.id); setAddingNewRecipient(false); }} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${selectedRecipientId === r.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${selectedRecipientId === r.id ? "bg-primary text-primary-foreground" : "bg-muted"}`}><User className="w-4 h-4" /></div>
                  <div>
                    <p className="font-medium text-foreground">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.is_self ? "Myself" : r.relationship || "Care Recipient"}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {!addingNewRecipient ? (
            <Button variant="outline" className="w-full" onClick={() => { setAddingNewRecipient(true); setSelectedRecipientId(null); }}>
              <Plus className="w-4 h-4 mr-2" /> Add New Recipient
            </Button>
          ) : (
            <Card className="border-primary/30">
              <CardContent className="pt-4 space-y-3">
                <h3 className="font-medium text-foreground">New Care Recipient</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs">First Name</Label><Input value={newRecipient.firstName} onChange={e => setNewRecipient(p => ({ ...p, firstName: e.target.value }))} /></div>
                  <div><Label className="text-xs">Last Name</Label><Input value={newRecipient.lastName} onChange={e => setNewRecipient(p => ({ ...p, lastName: e.target.value }))} /></div>
                </div>
                <div><Label className="text-xs">Relationship</Label><Input placeholder="e.g. Mother, Father" value={newRecipient.relationship} onChange={e => setNewRecipient(p => ({ ...p, relationship: e.target.value }))} /></div>
                <Button variant="brand" className="w-full" disabled={!newRecipient.firstName.trim()} onClick={async () => {
                  const fullName = `${newRecipient.firstName} ${newRecipient.lastName}`.trim();
                  const created = await addRecipient({
                    full_name: fullName,
                    first_name: newRecipient.firstName,
                    last_name: newRecipient.lastName,
                    relationship: newRecipient.relationship,
                    is_self: false,
                    default_address: null, postal_code: null, city: null, province: "ON",
                    buzzer_code: null, entry_instructions: null, care_notes: null,
                    mobility_notes: null, special_instructions: null,
                    preferred_languages: ["en"], preferred_gender: "no-preference",
                  });
                  if (created) {
                    setSelectedRecipientId(created.id);
                    setAddingNewRecipient(false);
                    setNewRecipient({ firstName: "", lastName: "", relationship: "" });
                    toast.success("Recipient saved!");
                  }
                }}>Save Recipient</Button>
              </CardContent>
            </Card>
          )}

          {recipients.length === 0 && !addingNewRecipient && (
            <p className="text-sm text-muted-foreground text-center">No saved recipients yet. Add one above.</p>
          )}
        </>
      )}
    </div>
  );

  // ── STEP 3: Location ──
  const renderStep3 = () => {
    const defaultAddr = selectedRecipient?.default_address || clientProfile?.default_address;
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">Service Location</h2>

        {defaultAddr && (
          <button onClick={() => setUseDefaultAddress(true)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${useDefaultAddress ? "border-primary bg-primary/5" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <MapPin className="w-5 h-5 text-primary" />
              <div><p className="font-medium text-foreground text-sm">Saved Address</p><p className="text-xs text-muted-foreground">{defaultAddr}</p></div>
            </div>
          </button>
        )}

        <button onClick={() => setUseDefaultAddress(false)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${!useDefaultAddress ? "border-primary bg-primary/5" : "border-border"}`}>
          <p className="font-medium text-foreground text-sm">{defaultAddr ? "Use a different address" : "Enter address"}</p>
        </button>

        {!useDefaultAddress && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div><Label className="text-xs">Street #</Label><Input value={streetNumber} onChange={e => setStreetNumber(e.target.value)} /></div>
              <div className="col-span-2"><Label className="text-xs">Street Name</Label><Input value={streetName} onChange={e => setStreetName(e.target.value)} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs">Unit (opt.)</Label><Input value={unitNumber} onChange={e => setUnitNumber(e.target.value)} /></div>
              <div><Label className="text-xs">City</Label><Input value={city} onChange={e => setCity(e.target.value)} /></div>
            </div>
            <div><Label className="text-xs">Postal Code</Label><Input value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="K8N 1A1" /></div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">Buzzer Code</Label><Input value={buzzerCode} onChange={e => setBuzzerCode(e.target.value)} placeholder="Optional" /></div>
          <div><Label className="text-xs">Entry Notes</Label><Input value={entryInstructions} onChange={e => setEntryInstructions(e.target.value)} placeholder="Side door, etc." /></div>
        </div>

        {isTransportCategory && (
          <div className="space-y-2 pt-2 border-t">
            <Label className="text-sm font-medium">Pick-up Address</Label>
            <Input value={pickupAddress} onChange={e => setPickupAddress(e.target.value)} placeholder="Pick-up address" />
            <Input value={pickupPostalCode} onChange={e => setPickupPostalCode(e.target.value)} placeholder="Pick-up postal code" />
          </div>
        )}

        {addressError && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
            <p className="text-sm text-destructive">{addressError}</p>
          </div>
        )}
      </div>
    );
  };

  // ── STEP 4: When ──
  const renderStep4 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">When do you need care?</h2>

      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => {
          setIsAsap(true);
          const now = new Date();
          setServiceDate(now.toISOString().split("T")[0]);
          setStartTime(`${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`);
        }} className={`p-4 rounded-xl border-2 text-center transition-all ${isAsap ? "border-primary bg-primary/5" : "border-border"}`}>
          <Clock className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="font-medium text-foreground">ASAP</p>
          <p className="text-xs text-muted-foreground">As soon as possible</p>
        </button>
        <button onClick={() => setIsAsap(false)} className={`p-4 rounded-xl border-2 text-center transition-all ${!isAsap ? "border-primary bg-primary/5" : "border-border"}`}>
          <Calendar className="w-6 h-6 mx-auto mb-2 text-primary" />
          <p className="font-medium text-foreground">Schedule</p>
          <p className="text-xs text-muted-foreground">Pick date & time</p>
        </button>
      </div>

      {!isAsap && (
        <div className="space-y-3">
          <div><Label className="text-sm">Date</Label><Input type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} min={new Date().toISOString().split("T")[0]} /></div>
          <div><Label className="text-sm">Start Time</Label><Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} /></div>
        </div>
      )}
    </div>
  );

  // ── STEP 5: Service-specific details ──
  const renderStep5 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Service Details</h2>

      {selectedCategory === "doctor-appointment" && (
        <div className="space-y-3">
          <div><Label className="text-sm">Doctor's Office Name</Label><Input value={doctorOfficeName} onChange={e => setDoctorOfficeName(e.target.value)} /></div>
          <div><Label className="text-sm">Suite Number</Label><Input value={doctorSuiteNumber} onChange={e => setDoctorSuiteNumber(e.target.value)} /></div>
        </div>
      )}

      <div>
        <Label className="text-sm">Special Notes / Instructions</Label>
        <Textarea value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} placeholder="Any special care instructions..." rows={3} className="mt-1" />
      </div>

      {selectedRecipient?.care_notes && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Saved care notes for {selectedRecipient.first_name}:</p>
          <p className="text-sm text-foreground">{selectedRecipient.care_notes}</p>
        </div>
      )}

      {selectedRecipient?.mobility_notes && (
        <div className="p-3 bg-muted rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Mobility notes:</p>
          <p className="text-sm text-foreground">{selectedRecipient.mobility_notes}</p>
        </div>
      )}
    </div>
  );

  // ── STEP 6: Payment ──
  const renderStep6 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Payment Method</h2>

      {pmLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
        <>
          {savedMethod && (
            <button onClick={() => setUseSavedCard(true)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${useSavedCard ? "border-primary bg-primary/5" : "border-border"}`}>
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Saved Card</p>
                  <p className="text-xs text-muted-foreground">Card ending in {savedMethod.last4}</p>
                </div>
                {useSavedCard && <Check className="w-4 h-4 text-primary ml-auto" />}
              </div>
            </button>
          )}

          <button onClick={() => setUseSavedCard(false)} className={`w-full text-left p-4 rounded-xl border-2 transition-all ${!useSavedCard ? "border-primary bg-primary/5" : "border-border"}`}>
            <div className="flex items-center gap-3">
              <Plus className="w-5 h-5 text-muted-foreground" />
              <p className="font-medium text-foreground">{savedMethod ? "Use a different card" : "Add payment method"}</p>
            </div>
          </button>
        </>
      )}

      {pricing && (
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal ({selectedDuration}h)</span>
            <span>${pricing.subtotal.toFixed(2)}</span>
          </div>
          {pricing.surgeAmount > 0 && (
            <div className="flex justify-between text-sm text-orange-600">
              <span>Surge</span>
              <span>+${pricing.surgeAmount.toFixed(2)}</span>
            </div>
          )}
          {pricing.hstAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">HST (13%)</span>
              <span>${pricing.hstAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-foreground pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">${pricing.total.toFixed(2)} CAD</span>
          </div>
        </div>
      )}
    </div>
  );

  // ── STEP 7: Review & Confirm ──
  const renderStep7 = () => (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Review & Confirm</h2>

      <Card>
        <CardContent className="pt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Service</span>
            <span className="font-medium text-right">{selectedServices.map(id => serviceTasks.find(s => s.id === id)?.name).filter(Boolean).join(", ")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Recipient</span>
            <span className="font-medium">{getRecipientName()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Location</span>
            <span className="font-medium text-right max-w-[60%]">{getFullAddress()}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">When</span>
            <span className="font-medium">{isAsap ? "ASAP" : `${serviceDate} at ${startTime}`}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium">{selectedDuration}h</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Payment</span>
            <span className="font-medium">{useSavedCard && savedMethod ? `Card ••${savedMethod.last4}` : "New card"}</span>
          </div>
          <div className="flex justify-between font-bold pt-2 border-t">
            <span>Total</span>
            <span className="text-primary">${pricing?.total.toFixed(2) || "0.00"}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-start gap-2">
        <Checkbox id="policy" checked={agreedToPolicy} onCheckedChange={(v) => setAgreedToPolicy(!!v)} />
        <label htmlFor="policy" className="text-xs text-muted-foreground leading-tight">
          I agree to the cancellation policy and authorize this payment. By completing this booking, I authorize PSW Direct to save my payment method for any overtime charges.
        </label>
      </div>
    </div>
  );

  // Can proceed check
  const canProceed = (): boolean => {
    switch (step) {
      case 1: return !!(selectedCategory && selectedServices.length > 0);
      case 2: return !!(selectedRecipientId || addingNewRecipient);
      case 3: return !!(useDefaultAddress || (streetNumber && streetName && city && postalCode));
      case 4: return !!(isAsap || (serviceDate && startTime));
      case 5: return true;
      case 6: return true;
      case 7: return agreedToPolicy;
      default: return false;
    }
  };

  return (
    <div ref={containerRef} className="pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <Button variant="ghost" size="icon" onClick={goBack}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-lg font-semibold text-foreground">Quick Book</h1>
          <p className="text-xs text-muted-foreground">Step {step} of 7</p>
        </div>
        {pricing && step < 7 && (
          <div className="text-right">
            <p className="text-[10px] text-muted-foreground">Estimate</p>
            <p className="font-bold text-primary">${pricing.total.toFixed(2)}</p>
          </div>
        )}
      </div>

      {renderProgress()}

      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}
      {step === 5 && renderStep5()}
      {step === 6 && renderStep6()}
      {step === 7 && renderStep7()}

      {/* Nav Buttons */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <Button variant="outline" className="flex-1" onClick={goBack}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back
          </Button>
        )}
        {step < 7 ? (
          <Button variant="brand" className="flex-1" onClick={goNext} disabled={!canProceed() || isCheckingAddress}>
            {isCheckingAddress ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Checking...</> : <>Continue <ArrowRight className="w-4 h-4 ml-1.5" /></>}
          </Button>
        ) : (
          <Button variant="brand" className="flex-1" disabled={!agreedToPolicy || isSubmitting} onClick={() => {
            if (!pricing || pricing.total < 20) { toast.error("Minimum booking is $20"); return; }
            if (useSavedCard && savedMethod) {
              // TODO: charge saved card via edge function; for now redirect to Stripe form
              setShowStripeForm(true);
            } else {
              setShowStripeForm(true);
            }
          }}>
            {isSubmitting ? <><Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> Processing...</> : <>Confirm & Pay <CreditCard className="w-4 h-4 ml-1.5" /></>}
          </Button>
        )}
      </div>
    </div>
  );
};
