// Manual Order Creation (MOC) - Admin Only
// Creates bookings via the same create-booking edge function path

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Copy, CheckCircle, Loader2, CreditCard, FileText } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { addShift } from "@/lib/shiftStore";
import { useServiceTasks } from "@/hooks/useServiceTasks";

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

export const ManualOrderCreation = ({ open, onOpenChange, onOrderCreated }: MOCProps) => {
  // Form state
  const [clientName, setClientName] = useState("");
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

  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<SuccessData | null>(null);

  const { tasks } = useServiceTasks();
  const activeTasks = tasks; // useServiceTasks already filters by is_active

  const resetForm = () => {
    setClientName("");
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
    setSuccessData(null);
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

  const calculateEndTime = (start: string, hours: number): string => {
    const [h, m] = start.split(":").map(Number);
    const totalMinutes = h * 60 + m + hours * 60;
    const endH = Math.floor(totalMinutes / 60) % 24;
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    // Validation
    if (!clientName.trim()) return toast.error("Client name is required");
    if (!clientPhone.trim()) return toast.error("Client phone is required");
    if (!serviceAddress.trim()) return toast.error("Service address is required");
    if (!postalCode.trim()) return toast.error("Postal code is required");
    if (!serviceDate) return toast.error("Service date is required");
    if (!startTime) return toast.error("Start time is required");
    if (selectedServices.length === 0) return toast.error("Select at least one service");

    setSubmitting(true);

    try {
      const hours = parseFloat(duration);
      const endTime = calculateEndTime(startTime, hours);
      const hourlyRate = 35; // Default admin rate
      const subtotal = hourlyRate * hours;
      const total = subtotal;

      // Get service names for display
      const serviceNames = selectedServices.map(id => {
        const task = activeTasks.find(t => t.id === id);
        return task?.name || id;
      });

      // Get authenticated user
      const { data: { user } } = await supabase.auth.getUser();

      // 1) Create booking via edge function
      const { data: result, error: fnError } = await supabase.functions.invoke("create-booking", {
        body: {
          user_id: user?.id || null,
          client_name: clientName.trim(),
          client_email: clientEmail.trim() || `admin-order-${Date.now()}@manual.local`,
          client_phone: clientPhone.trim(),
          client_address: serviceAddress.trim(),
          client_postal_code: postalCode.trim().toUpperCase(),
          patient_name: clientName.trim(),
          patient_address: serviceAddress.trim(),
          patient_postal_code: postalCode.trim().toUpperCase(),
          scheduled_date: serviceDate,
          start_time: startTime,
          end_time: endTime,
          hours,
          hourly_rate: hourlyRate,
          subtotal,
          surge_amount: 0,
          total,
          service_type: serviceNames,
          payment_status: paymentMode === "invoice" ? "invoice-pending" : "pending",
          is_asap: false,
          is_transport_booking: false,
          special_notes: specialNotes.trim() || null,
        },
      });

      if (fnError || result?.error) {
        throw new Error(fnError?.message || result?.error || "Failed to create booking");
      }

      const bookingCode = result.booking_code;
      const bookingUuid = result.booking_id;

      // 2) Create shift record so PSWs can see the job
      addShift({
        bookingId: bookingCode,
        pswId: "",
        pswName: "",
        clientName: clientName.trim(),
        clientFirstName: clientName.trim().split(" ")[0],
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

      // 3) If PSW assigned, look up and assign
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

      // 4) If Pay Now, create Stripe PaymentIntent
      let paymentIntentId: string | undefined;
      if (paymentMode === "pay-now" && clientEmail.trim()) {
        try {
          const { data: piResult, error: piError } = await supabase.functions.invoke("create-payment-intent", {
            body: {
              amount: Math.round(total * 100),
              customerEmail: clientEmail.trim(),
              bookingDetails: {
                bookingUuid,
                bookingCode,
                clientName: clientName.trim(),
                date: serviceDate,
                time: startTime,
              },
              isLiveMode: true,
            },
          });

          if (!piError && piResult?.paymentIntentId) {
            paymentIntentId = piResult.paymentIntentId;
            // Update booking with Stripe PI
            await supabase
              .from("bookings")
              .update({
                stripe_payment_intent_id: paymentIntentId,
                payment_status: "paid",
              })
              .eq("id", bookingUuid);
          }
        } catch (err) {
          console.warn("Stripe PI creation failed:", err);
          toast.warning("Booking created but Stripe payment intent failed");
        }
      }

      setSuccessData({
        bookingCode,
        bookingUuid,
        clientName: clientName.trim(),
        serviceDate,
        startTime,
        paymentIntentId,
      });

      onOrderCreated?.();
      toast.success(`Order ${bookingCode} created`);
    } catch (err: any) {
      console.error("MOC error:", err);
      toast.error(err.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`Copied ${label}`);
  };

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
          {/* Client Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground text-sm border-b pb-1">Client Information</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="moc-name">Full Name *</Label>
                <Input id="moc-name" value={clientName} onChange={e => setClientName(e.target.value)} placeholder="John Smith" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-phone">Phone *</Label>
                <Input id="moc-phone" value={clientPhone} onChange={e => setClientPhone(e.target.value)} placeholder="416-555-1234" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-email">Email</Label>
                <Input id="moc-email" type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="client@email.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-postal">Postal Code *</Label>
                <Input id="moc-postal" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="M5V 3L9" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="moc-address">Service Address *</Label>
              <Input id="moc-address" value={serviceAddress} onChange={e => setServiceAddress(e.target.value)} placeholder="123 Main St, Toronto, ON" />
            </div>
          </div>

          {/* Booking Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground text-sm border-b pb-1">Booking Details</h4>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="moc-date">Service Date *</Label>
                <Input id="moc-date" type="date" value={serviceDate} onChange={e => setServiceDate(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="moc-time">Start Time *</Label>
                <Input id="moc-time" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
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

            {/* Service Types */}
            <div className="space-y-2">
              <Label>Service Type(s) *</Label>
              <div className="flex flex-wrap gap-2">
                {activeTasks.map(task => (
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

            <div className="space-y-1.5">
              <Label htmlFor="moc-notes">Special Notes</Label>
              <Textarea id="moc-notes" value={specialNotes} onChange={e => setSpecialNotes(e.target.value)} placeholder="Optional notes..." rows={2} />
            </div>
          </div>

          {/* Payment & Assignment */}
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
                        Pay Now (Stripe)
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
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleClose} className="flex-1" disabled={submitting}>Cancel</Button>
            <Button onClick={handleSubmit} className="flex-1" disabled={submitting}>
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Creating...</>
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
