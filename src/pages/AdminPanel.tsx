import { useState, useEffect } from "react";
import { ArrowLeft, DollarSign, MapPin, Save, TrendingUp, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  DEFAULT_PRICING,
  getPricing,
  savePricing,
  SERVICE_RADIUS_KM,
  OFFICE_LOCATION,
  type PricingConfig,
} from "@/lib/businessConfig";

const serviceLabels: Record<string, string> = {
  "personal-care": "Personal Care Assistance",
  "companionship": "Companionship Visit",
  "meal-prep": "Meal Preparation",
  "medication": "Medication Reminders",
  "light-housekeeping": "Light Housekeeping",
  "transportation": "Transportation Assistance",
  "respite": "Respite Care",
};

export const AdminPanel = () => {
  const navigate = useNavigate();
  const [pricing, setPricing] = useState<PricingConfig>(DEFAULT_PRICING);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPricing(getPricing());
  }, []);

  const handleRateChange = (service: keyof PricingConfig["baseHourlyRates"], value: string) => {
    const numValue = parseFloat(value) || 0;
    setPricing((prev) => ({
      ...prev,
      baseHourlyRates: {
        ...prev.baseHourlyRates,
        [service]: numValue,
      },
    }));
    setHasChanges(true);
  };

  const handleSurgeChange = (value: number[]) => {
    setPricing((prev) => ({
      ...prev,
      surgeMultiplier: value[0],
    }));
    setHasChanges(true);
  };

  const handleMinHoursChange = (value: string) => {
    const numValue = parseFloat(value) || 2;
    setPricing((prev) => ({
      ...prev,
      minimumHours: numValue,
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    savePricing(pricing);
    setHasChanges(false);
    toast.success("Pricing configuration saved successfully!");
  };

  const handleReset = () => {
    setPricing(DEFAULT_PRICING);
    setHasChanges(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Admin Panel</h1>
                <p className="text-sm text-muted-foreground">Pricing & Service Configuration</p>
              </div>
            </div>
            <Button 
              variant="brand" 
              onClick={handleSave}
              disabled={!hasChanges}
            >
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6 pb-24">
        {/* Surge Multiplier */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Dynamic Pricing
            </CardTitle>
            <CardDescription>
              Apply a surge multiplier during high-demand periods
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
                onValueChange={handleSurgeChange}
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
                a minimum 1.25x multiplier, or the current surge rate if higher.
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
                  onChange={(e) => handleMinHoursChange(e.target.value)}
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
                        handleRateChange(
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

        {/* Service Radius */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Service Area
            </CardTitle>
            <CardDescription>
              Bookings outside the service radius will be blocked
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div>
                <p className="font-medium text-foreground">Service Radius</p>
                <p className="text-sm text-muted-foreground">Maximum distance from central office</p>
              </div>
              <span className="text-2xl font-bold text-primary">{SERVICE_RADIUS_KM} km</span>
            </div>

            <div className="p-4 border border-border rounded-lg space-y-2">
              <p className="text-sm font-medium text-foreground">Central Office Location</p>
              <p className="text-sm text-muted-foreground">{OFFICE_LOCATION.address}</p>
              <p className="text-xs text-muted-foreground">
                Coordinates: {OFFICE_LOCATION.lat}, {OFFICE_LOCATION.lng}
              </p>
            </div>

            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Clients entering an address beyond {SERVICE_RADIUS_KM}km will see: 
                <em className="block mt-1 font-medium">"Address outside of 75km service radius."</em>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Note */}
        <Card className="shadow-card bg-muted/50">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              <strong className="text-foreground">Admin Note:</strong> All totals displayed to clients include 
              the disclaimer "Prices are subject to final adjustment by admin based on service requirements."
            </p>
          </CardContent>
        </Card>

        {/* Reset Button */}
        <Button variant="outline" onClick={handleReset} className="w-full">
          Reset to Default Pricing
        </Button>
      </div>
    </div>
  );
};

export default AdminPanel;
