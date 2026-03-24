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
import { Plus, Copy, CheckCircle, Loader2, CreditCard, FileText, ArrowLeft, Home, Stethoscope, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addShift } from "@/lib/shiftStore";
import { useServiceTasks } from "@/hooks/useServiceTasks";
import { StripePaymentForm } from "@/components/client/StripePaymentForm";
import { formatPostalCode } from "@/lib/postalCodeUtils";
import { formatCanadianPhone } from "@/lib/phoneUtils";
import { getRatesForCategory, type CategoryRateConfig } from "@/lib/pricingConfigStore";
import type { ServiceCategory } from "@/lib/taskConfig";

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
  // Invoice Later fields
  const [payerType, setPayerType] = useState<"client" | "insurance">("client");
  const [insuranceName, setInsuranceName] = useState("");
  const [paymentTerms, setPaymentTerms] = useState<"2" | "14" | "custom">("14");
  const [customTermsDays, setCustomTermsDays] = useState("");
  const [ccEmail, setCcEmail] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);

  const { tasks } = useServiceTasks();
  // Only show standard home-care tasks for Home Care
  const homeCareTasksOnly = useMemo(
    () => tasks.filter(t => t.serviceCategory === "standard"),
    [tasks]
  );

  const isTransport = serviceCategory === "doctor-appointment" || serviceCategory === "hospital-discharge";

  // Pricing derived from admin-configured rates
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
    setPayerType("client");
    setInsuranceName("");
    setPaymentTerms("14");
    setCustomTermsDays("");
    setCcEmail("");
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
    // Clear task selections when switching categories
    setSelectedServices([]);
    // Reset transport fields when switching away
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
    // Home Care — use selected tasks
    return selectedServices.map(id => {
      const task = homeCareTasksOnly.find(t => t.id === id);
      return task?.name || id;
    });
  };

  const handleSubmit = async () => {
    // Validation
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

    if (paymentMode === "pay-now" && !clientEmail.trim()) {
      return toast.error("Email is required for Stripe payment");
    }

    const fullName = `${clientFirstName.trim()} ${clientLastName.trim()}`;
    setSubmitting(true);

    try {
      const hours = parseFloat(duration);
      const endTime = calculateEndTime(startTime, hours);
      const hourlyRate = rates.firstHour; // first-hour rate as the hourly_rate for the booking record
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
        payment_status: paymentMode === "invoice" ? "invoice-pending" : "pending",
        is_asap: false,
        is_transport_booking: isTransport,
        special_notes: specialNotes.trim() || null,
      };

      // Add invoice-specific fields
      if (paymentMode === "invoice") {
        const termsDays = getPaymentTermsDays();
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + termsDays);
        body.payer_type = payerType;
        body.payer_name = payerType === "insurance" ? insuranceName.trim() || null : fullName;
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

      // If Pay Now → show Stripe payment form
      if (paymentMode === "pay-now") {
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
        toast.success(`Order ${bookingCode} created`);
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

    // Dispatch PSW notifications now that payment is confirmed
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
        console.log("📣 PSW notifications dispatched after payment for", booking.booking_code);
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

          {/* ── Transport Fields (Doctor Escort / Hospital only) ── */}
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

            {/* Home Care: task selection */}
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

            {/* Transport: show selected service type label */}
            {isTransport && categoryLabel && (
              <div className="flex items-center gap-2">
                <Label className="text-sm">Service:</Label>
                <Badge variant="default">{categoryLabel}</Badge>
              </div>
            )}

            {/* Pricing summary */}
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

          {/* ── Payment & Assignment ── */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground text-sm border-b pb-1">Payment & Assignment</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Payment Mode</Label>
                <Select value={paymentMode} onValueChange={(v) => setPaymentMode(v as "invoice" | "pay-now")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="invoice">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3 h-3" />
                        Invoice / Pay Later
                      </div>
                    </SelectItem>
                    <SelectItem value="pay-now">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-3 h-3" />
                        Pay Now (Enter Card)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-psw">Assign PSW (optional)</Label>
                <Input id="moc-psw" value={pswNumber} onChange={e => setPswNumber(e.target.value)} placeholder="e.g. 1001 or PSW-1001" />
              </div>
            </div>
            {paymentMode === "pay-now" && !clientEmail.trim() && (
              <p className="text-xs text-amber-600">⚠️ Email is required for Stripe payment</p>
            )}
            {paymentMode === "pay-now" && clientEmail.trim() && (
              <p className="text-xs text-muted-foreground">After creating the order, you'll be prompted to enter the client's card details via Stripe.</p>
            )}
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting || !serviceCategory}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</>
              ) : paymentMode === "pay-now" ? (
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
