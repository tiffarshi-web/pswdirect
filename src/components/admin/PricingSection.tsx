import { DollarSign, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { type PricingConfig } from "@/lib/businessConfig";

const serviceLabels: Record<string, string> = {
  "personal-care": "Personal Care Assistance",
  "companionship": "Companionship Visit",
  "meal-prep": "Meal Preparation",
  "medication": "Medication Reminders",
  "light-housekeeping": "Light Housekeeping",
  "transportation": "Transportation Assistance",
  "respite": "Respite Care",
};

interface PricingSectionProps {
  pricing: PricingConfig;
  onRateChange: (service: keyof PricingConfig["baseHourlyRates"], value: string) => void;
  onSurgeChange: (value: number[]) => void;
  onMinHoursChange: (value: string) => void;
}

export const PricingSection = ({
  pricing,
  onRateChange,
  onSurgeChange,
  onMinHoursChange,
}: PricingSectionProps) => {
  return (
    <div className="space-y-6">
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

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minHours">Minimum Booking Hours</Label>
              <Input
                id="minHours"
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={pricing.minimumHours}
                onChange={(e) => onMinHoursChange(e.target.value)}
              />
            </div>
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
