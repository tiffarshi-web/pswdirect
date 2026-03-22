import { useMemo } from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TermsOfServiceDialog } from "@/components/client/TermsOfServiceDialog";
import type { BookingFormData } from "./types";
import type { TaskConfig, ServiceCategory } from "@/lib/taskConfig";
import { calculateDurationBasedPrice } from "@/lib/businessConfig";
import { getServiceCategoryForTasks } from "@/lib/taskConfig";

interface StepReviewPayProps {
  formData: BookingFormData;
  serviceTasks: TaskConfig[];
  clientName: string;
  clientEmail: string;
  onAgreedChange: (v: boolean) => void;
}

export const StepReviewPay = ({
  formData,
  serviceTasks,
  clientName,
  clientEmail,
  onAgreedChange,
}: StepReviewPayProps) => {
  const selectedCategory = formData.selectedCategory || "standard";
  const isTransport = selectedCategory === "doctor-appointment" || selectedCategory === "hospital-discharge";

  // Calculate taxable fraction
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
      selectedCategory as ServiceCategory,
      formData.isAsap,
      formData.city,
      formData.postalCode,
      formData.serviceDate,
      formData.startTime,
      taxableFraction
    );
  }, [formData, selectedCategory, taxableFraction]);

  const getCalculatedEndTime = () => {
    if (!formData.startTime) return "";
    const [hours, mins] = formData.startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + formData.selectedDuration * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  const patientName = formData.serviceFor === "myself"
    ? clientName
    : `${formData.patientFirstName} ${formData.patientLastName}`.trim();

  const categoryLabel =
    selectedCategory === "doctor-appointment" ? "Doctor Escort" :
    selectedCategory === "hospital-discharge" ? "Hospital Discharge" : "Home Care";

  return (
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
            <span className="font-medium text-foreground">{patientName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Service</span>
            <Badge variant="outline">{categoryLabel}</Badge>
          </div>
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Tasks</span>
            <div className="text-right">
              {formData.selectedServices.map((id) => {
                const task = serviceTasks.find((t) => t.id === id);
                return (
                  <span key={id} className="block font-medium text-foreground text-sm">
                    {task?.name}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Duration</span>
            <span className="font-medium text-foreground">{formData.selectedDuration}h</span>
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
          <div className="flex justify-between items-start">
            <span className="text-muted-foreground">Address</span>
            <span className="font-medium text-foreground text-right text-sm max-w-[60%]">
              {`${formData.streetNumber} ${formData.streetName}, ${formData.city}, ${formData.province} ${formData.postalCode}`}
            </span>
          </div>
          {isTransport && formData.pickupAddress && (
            <div className="flex justify-between items-start">
              <span className="text-muted-foreground">Pick-up</span>
              <div className="text-right max-w-[60%]">
                <span className="font-medium text-foreground text-sm block">{formData.pickupAddress}</span>
                <span className="text-xs text-muted-foreground">{formData.pickupPostalCode}</span>
              </div>
            </div>
          )}
        </div>

        {/* Price Breakdown */}
        {pricing && (
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <h4 className="font-medium text-foreground text-sm">Price Estimate</h4>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{formData.selectedDuration}h × {categoryLabel}</span>
              <span className="text-foreground">${(pricing.subtotal - pricing.surgeAmount - pricing.regionalSurcharge).toFixed(2)}</span>
            </div>
            {pricing.surgeAmount > 0 && (
              <div className="flex justify-between text-sm text-amber-600">
                <span>{formData.isAsap ? "Rush Fee" : "Surge Fee"}</span>
                <span>+${pricing.surgeAmount.toFixed(2)}</span>
              </div>
            )}
            {pricing.regionalSurcharge > 0 && (
              <div className="flex justify-between text-sm text-blue-600">
                <span>Toronto/GTA Service Fee</span>
                <span>+${pricing.regionalSurcharge.toFixed(2)}</span>
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
                <span className="text-foreground">Total</span>
                <span className="text-primary">${pricing.total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Billing info */}
        <div className="p-3 bg-primary/5 rounded-lg text-sm">
          <p className="font-medium text-foreground mb-1">Billing & Reports sent to:</p>
          <p className="text-muted-foreground">{clientName}</p>
          <p className="text-muted-foreground">{clientEmail}</p>
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
          <Checkbox
            id="agreePolicy"
            checked={formData.agreedToPolicy}
            onCheckedChange={(checked) => onAgreedChange(checked as boolean)}
          />
          <Label htmlFor="agreePolicy" className="text-sm text-muted-foreground cursor-pointer">
            I agree to the cancellation policy. Cancellations within 4 hours and ASAP bookings are non-refundable.
          </Label>
        </div>
        <TermsOfServiceDialog />
      </CardContent>
    </Card>
  );
};
