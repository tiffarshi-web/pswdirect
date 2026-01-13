import { DollarSign, TrendingUp, Clock, Timer } from "lucide-react";
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
  onOvertimeRateChange: (value: string) => void;
  onOvertimeGraceChange: (value: string) => void;
  onOvertimeBlockChange: (value: string) => void;
}

export const PricingSection = ({
  pricing,
  onRateChange,
  onSurgeChange,
  onMinHoursChange,
  onDoctorEscortMinChange,
  onTaskDurationChange,
  onOvertimeRateChange,
  onOvertimeGraceChange,
  onOvertimeBlockChange,
}: PricingSectionProps) => {
  // Calculate example overtime rate based on average hourly rate
  const avgHourlyRate = Object.values(pricing.baseHourlyRates).reduce((a, b) => a + b, 0) / Object.values(pricing.baseHourlyRates).length;
  const overtimeRatePerHour = avgHourlyRate * (pricing.overtimeRatePercentage / 100);

  return (
    <div className="space-y-6">
      {/* Base Hour Explanation */}
      <Card className="shadow-card border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Base Hour + Overtime Model</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Every booking starts with a <strong className="text-foreground">{pricing.minimumHours}-hour base charge</strong>. 
                If the PSW signs out more than {pricing.overtimeGraceMinutes} minutes late, overtime is billed in {pricing.overtimeBlockMinutes}-minute blocks 
                at {pricing.overtimeRatePercentage}% of the hourly rate (~${overtimeRatePerHour.toFixed(2)}/hr).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overtime Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Overtime Billing Rules
          </CardTitle>
          <CardDescription>
            Configure the 15-minute grace period and overtime billing increments
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overtimeRate">Overtime Rate (%)</Label>
              <Input
                id="overtimeRate"
                type="number"
                min={10}
                max={100}
                step={5}
                value={pricing.overtimeRatePercentage}
                onChange={(e) => onOvertimeRateChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                % of hourly rate
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="graceMinutes">Grace Period (min)</Label>
              <Input
                id="graceMinutes"
                type="number"
                min={0}
                max={30}
                step={1}
                value={pricing.overtimeGraceMinutes}
                onChange={(e) => onOvertimeGraceChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                No charge if under
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockMinutes">Billing Block (min)</Label>
              <Input
                id="blockMinutes"
                type="number"
                min={15}
                max={60}
                step={15}
                value={pricing.overtimeBlockMinutes}
                onChange={(e) => onOvertimeBlockChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Billed in increments
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium text-foreground">How Overtime Works:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>0-{pricing.overtimeGraceMinutes} minutes late: <strong className="text-green-600">No extra charge</strong></li>
              <li>{pricing.overtimeGraceMinutes + 1}-{pricing.overtimeBlockMinutes} minutes late: <strong className="text-amber-600">1 block charged</strong></li>
              <li>{pricing.overtimeBlockMinutes + 1}-{pricing.overtimeBlockMinutes * 2} minutes late: <strong className="text-amber-600">2 blocks charged</strong></li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Example: 1hr 15min visit = 1hr base + 0.5hr overtime = 1.5 hours billed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Task Durations */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Task Durations (Reference)
          </CardTitle>
          <CardDescription>
            Typical time per task. Used to warn clients if selected tasks may exceed the base hour.
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

          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Client Warning:</strong> If selected tasks exceed 60 minutes, clients see: 
              <em>"This amount of care may require additional time."</em>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Base Hour Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Base Hour Requirements
          </CardTitle>
          <CardDescription>
            Minimum booking charge (clients pay at least this amount)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minHours">Standard Base (Hours)</Label>
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
                Default minimum for all bookings
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctorMin">Doctor/Hospital Base (Hours)</Label>
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
                Final price adjusted on sign-out
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Surge Multiplier (Admin Only) */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            Surge Pricing (Admin Only)
          </CardTitle>
          <CardDescription>
            Hidden from clients. Use for high-demand periods if needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Surge Multiplier</Label>
              <span className={`text-2xl font-bold ${pricing.surgeMultiplier > 1 ? 'text-amber-600' : 'text-green-600'}`}>
                {pricing.surgeMultiplier.toFixed(2)}x {pricing.surgeMultiplier === 1 && '(Off)'}
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
              <span>1.00x (Off)</span>
              <span>1.50x</span>
              <span>2.00x</span>
              <span>2.50x</span>
            </div>
          </div>

          {pricing.surgeMultiplier > 1 && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                <strong>⚠️ Surge Active:</strong> Clients are being charged {((pricing.surgeMultiplier - 1) * 100).toFixed(0)}% extra. 
                This is NOT visible to them.
              </p>
            </div>
          )}
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
            Standard rate per hour for each service type
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