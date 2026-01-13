import { DollarSign, TrendingUp, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { type PricingConfig, formatDuration } from "@/lib/businessConfig";

const serviceLabels: Record<string, string> = {
  "personal-care": "Personal Care Assistance",
  "companionship": "Companionship Visit",
  "meal-prep": "Meal Preparation",
  "medication": "Medication Reminders",
  "light-housekeeping": "Light Housekeeping",
  "transportation": "Transportation Assistance",
  "respite": "Respite Care",
};

const durationLabels: Record<string, string> = {
  "personal-care": "Personal Care",
  "companionship": "Companionship",
  "meal-prep": "Meal Prep",
  "medication": "Medication",
  "light-housekeeping": "Light Housekeeping",
  "transportation": "Transportation",
  "respite": "Respite Care",
  "doctor-escort": "Doctor Appointment Escort",
};

interface PricingSectionProps {
  pricing: PricingConfig;
  onRateChange: (service: keyof PricingConfig["baseHourlyRates"], value: string) => void;
  onSurgeChange: (value: number[]) => void;
  onMinHoursChange: (value: string) => void;
  onDoctorEscortMinChange: (value: string) => void;
  onTaskDurationChange: (service: string, value: string) => void;
}

export const PricingSection = ({
  pricing,
  onRateChange,
  onSurgeChange,
  onMinHoursChange,
  onDoctorEscortMinChange,
  onTaskDurationChange,
}: PricingSectionProps) => {
  return (
    <div className="space-y-6">
      {/* Task Durations */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Task Durations
          </CardTitle>
          <CardDescription>
            Set typical duration for each care type. Client bookings will auto-calculate based on selected tasks.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            {Object.entries(pricing.taskDurations).map(([service, duration]) => (
              <div key={service} className="flex items-center justify-between gap-4">
                <Label className="flex-1 text-sm">
                  {durationLabels[service] || service}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={5}
                    max={240}
                    step={5}
                    value={duration}
                    onChange={(e) => onTaskDurationChange(service, e.target.value)}
                    className="w-20 text-right"
                  />
                  <span className="text-muted-foreground text-sm w-8">min</span>
                  <span className="text-xs text-muted-foreground w-16">
                    ({formatDuration(duration)})
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">How it works:</strong> When clients select multiple services, 
              durations are stacked (e.g., Personal Care 45min + Meal Prep 30min = 1hr 15min total).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Minimum Hours */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Minimum Booking Requirements
          </CardTitle>
          <CardDescription>
            Set minimum durations for bookings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minHours">Base Minimum (Hours)</Label>
              <Input
                id="minHours"
                type="number"
                min={0.5}
                max={8}
                step={0.5}
                value={pricing.minimumHours}
                onChange={(e) => onMinHoursChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Applied when task total is less than this
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctorMin">Doctor Escort Minimum (Hours)</Label>
              <Input
                id="doctorMin"
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={pricing.doctorEscortMinimumHours}
                onChange={(e) => onDoctorEscortMinChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Auto-applied when Doctor Escort is selected
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surge Multiplier */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Dynamic Pricing
          </CardTitle>
          <CardDescription>
            Apply a surge multiplier during high-demand periods (applies to client checkout in real-time)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Surge Multiplier</Label>
              <span className="text-2xl font-bold text-primary">
                {pricing.surgeMultiplier.toFixed(2)}x
              </span>
            </div>
            <Slider
              value={[pricing.surgeMultiplier]}
              onValueChange={onSurgeChange}
              min={1}
              max={2.5}
              step={0.05}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1.00x (Normal)</span>
              <span>1.50x</span>
              <span>2.00x</span>
              <span>2.50x (Max)</span>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong className="text-foreground">Note:</strong> ASAP bookings automatically receive 
              a minimum 1.25x multiplier. All pricing changes apply immediately to new bookings.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Hourly Rates */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Base Hourly Rates
          </CardTitle>
          <CardDescription>
            Set the base rate for each service type (before surge pricing)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {Object.entries(pricing.baseHourlyRates).map(([service, rate]) => (
              <div key={service} className="flex items-center justify-between gap-4">
                <Label className="flex-1 text-sm">
                  {serviceLabels[service] || service}
                </Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={rate}
                    onChange={(e) =>
                      onRateChange(
                        service as keyof PricingConfig["baseHourlyRates"],
                        e.target.value
                      )
                    }
                    className="w-20 text-right"
                  />
                  <span className="text-muted-foreground text-sm">/hr</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};