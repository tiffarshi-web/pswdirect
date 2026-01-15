// Special Services Pricing Section - Fixed Flat Fees for Doctor/Hospital Visits
// These use flat fees instead of the 30-minute slot logic

import { useState, useEffect } from "react";
import { Hospital, Stethoscope, DollarSign, Info, Save, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface SpecialServicePricing {
  doctorAppointmentFlatFee: number;
  hospitalDischargeFlatFee: number;
  doctorAppointmentEnabled: boolean;
  hospitalDischargeEnabled: boolean;
  doctorMinimumHours: number;
  hospitalMinimumHours: number;
}

const DEFAULT_SPECIAL_PRICING: SpecialServicePricing = {
  doctorAppointmentFlatFee: 85,
  hospitalDischargeFlatFee: 150,
  doctorAppointmentEnabled: true,
  hospitalDischargeEnabled: true,
  doctorMinimumHours: 2,
  hospitalMinimumHours: 3,
};

// Get special pricing from localStorage
export const getSpecialServicePricing = (): SpecialServicePricing => {
  const stored = localStorage.getItem("specialServicePricing");
  if (stored) {
    try {
      return { ...DEFAULT_SPECIAL_PRICING, ...JSON.parse(stored) };
    } catch {
      return DEFAULT_SPECIAL_PRICING;
    }
  }
  return DEFAULT_SPECIAL_PRICING;
};

// Save special pricing to localStorage
export const saveSpecialServicePricing = (pricing: SpecialServicePricing): void => {
  localStorage.setItem("specialServicePricing", JSON.stringify(pricing));
};

interface SpecialServicesPricingSectionProps {
  onSave?: () => void;
}

export const SpecialServicesPricingSection = ({ onSave }: SpecialServicesPricingSectionProps) => {
  const [pricing, setPricing] = useState<SpecialServicePricing>(DEFAULT_SPECIAL_PRICING);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setPricing(getSpecialServicePricing());
  }, []);

  const handleChange = (field: keyof SpecialServicePricing, value: number | boolean) => {
    setPricing(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveSpecialServicePricing(pricing);
    setHasChanges(false);
    toast.success("Special services pricing saved!");
    onSave?.();
  };

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <Card className="shadow-card border-blue-200 bg-blue-50/30 dark:bg-blue-950/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Fixed Pricing Model</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Doctor Appointments and Hospital Discharges use <strong>flat fees</strong> set below.
                These services ignore the standard 30-minute slot logic and charge a fixed amount regardless of duration.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Doctor Appointment Pricing */}
      <Card className="shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Stethoscope className="w-5 h-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">Doctor Appointment Escort</CardTitle>
                <CardDescription>Fixed fee for routine doctor visits</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="doctorEnabled" className="text-sm text-muted-foreground">Active</Label>
              <Switch
                id="doctorEnabled"
                checked={pricing.doctorAppointmentEnabled}
                onCheckedChange={(checked) => handleChange("doctorAppointmentEnabled", checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="doctorFlatFee" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                Flat Fee
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-muted-foreground">$</span>
                <Input
                  id="doctorFlatFee"
                  type="number"
                  min={0}
                  step={5}
                  value={pricing.doctorAppointmentFlatFee}
                  onChange={(e) => handleChange("doctorAppointmentFlatFee", parseFloat(e.target.value) || 0)}
                  className="w-28 text-lg font-semibold"
                  disabled={!pricing.doctorAppointmentEnabled}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Client pays this fixed amount
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctorMinHours">Minimum Hours Covered</Label>
              <Input
                id="doctorMinHours"
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={pricing.doctorMinimumHours}
                onChange={(e) => handleChange("doctorMinimumHours", parseFloat(e.target.value) || 2)}
                className="w-28"
                disabled={!pricing.doctorAppointmentEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Included in flat fee
              </p>
            </div>
          </div>
          
          {pricing.doctorAppointmentEnabled && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Example:</strong> Client books a doctor appointment escort. 
                They pay <span className="text-primary font-semibold">${pricing.doctorAppointmentFlatFee}</span> flat, 
                covering up to {pricing.doctorMinimumHours} hours of service.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Hospital Discharge Pricing */}
      <Card className="shadow-card border-amber-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Hospital className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <CardTitle className="text-lg">Hospital Discharge</CardTitle>
                <CardDescription>Premium fixed fee for hospital pick-ups</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="hospitalEnabled" className="text-sm text-muted-foreground">Active</Label>
              <Switch
                id="hospitalEnabled"
                checked={pricing.hospitalDischargeEnabled}
                onCheckedChange={(checked) => handleChange("hospitalDischargeEnabled", checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="hospitalFlatFee" className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-amber-600" />
                Flat Fee
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-muted-foreground">$</span>
                <Input
                  id="hospitalFlatFee"
                  type="number"
                  min={0}
                  step={5}
                  value={pricing.hospitalDischargeFlatFee}
                  onChange={(e) => handleChange("hospitalDischargeFlatFee", parseFloat(e.target.value) || 0)}
                  className="w-28 text-lg font-semibold"
                  disabled={!pricing.hospitalDischargeEnabled}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Premium rate for discharge services
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="hospitalMinHours">Minimum Hours Covered</Label>
              <Input
                id="hospitalMinHours"
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={pricing.hospitalMinimumHours}
                onChange={(e) => handleChange("hospitalMinimumHours", parseFloat(e.target.value) || 3)}
                className="w-28"
                disabled={!pricing.hospitalDischargeEnabled}
              />
              <p className="text-xs text-muted-foreground">
                Included in flat fee
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Requires Discharge Papers:</strong> PSW must upload hospital discharge documents before completing this service.
            </p>
          </div>
          
          {pricing.hospitalDischargeEnabled && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <p className="text-sm">
                <strong>Example:</strong> Client books a hospital discharge. 
                They pay <span className="text-amber-600 font-semibold">${pricing.hospitalDischargeFlatFee}</span> flat, 
                covering up to {pricing.hospitalMinimumHours} hours of service.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <Badge variant="secondary" className="mb-1">Doctor Visit</Badge>
                <p className="text-xl font-bold text-primary">
                  {pricing.doctorAppointmentEnabled ? `$${pricing.doctorAppointmentFlatFee}` : "Disabled"}
                </p>
              </div>
              <div className="text-center">
                <Badge className="bg-amber-500 mb-1">Hospital Discharge</Badge>
                <p className="text-xl font-bold text-amber-600">
                  {pricing.hospitalDischargeEnabled ? `$${pricing.hospitalDischargeFlatFee}` : "Disabled"}
                </p>
              </div>
            </div>
            {hasChanges && (
              <Button variant="brand" onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Save Special Pricing
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
