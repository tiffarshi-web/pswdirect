import { useState, useEffect } from "react";
import { DollarSign, Save, Building2, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getStaffPayRates, saveStaffPayRates, type StaffPayRates } from "@/lib/payrollStore";

export const StaffPayScaleSection = () => {
  const [rates, setRates] = useState<StaffPayRates>(getStaffPayRates());
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setRates(getStaffPayRates());
  }, []);

  const handleRateChange = (field: keyof StaffPayRates, value: string) => {
    const numValue = parseFloat(value) || 0;
    setRates(prev => ({ ...prev, [field]: numValue }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveStaffPayRates(rates);
    setHasChanges(false);
    toast.success("Staff pay rates saved successfully!");
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Staff Pay Scale
            </CardTitle>
            <CardDescription>
              Set hourly pay rates for PSWs based on shift type
            </CardDescription>
          </div>
          <Button
            variant="brand"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges}
          >
            <Save className="w-4 h-4 mr-2" />
            Save Rates
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Standard Home Care Rate */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Building2 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label className="text-base font-medium">Standard Home Care</Label>
              <p className="text-sm text-muted-foreground">
                Regular in-home visits (personal care, companionship, etc.)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={rates.standardHomeCare}
              onChange={(e) => handleRateChange("standardHomeCare", e.target.value)}
              className="w-24 text-right font-medium"
            />
            <span className="text-muted-foreground">/hour</span>
          </div>
        </div>

        {/* Hospital/Doctor Visit Rate */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <Stethoscope className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <Label className="text-base font-medium">Hospital / Doctor Visits</Label>
              <p className="text-sm text-muted-foreground">
                Escort services to medical appointments
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              type="number"
              min={0}
              step={0.5}
              value={rates.hospitalDoctorVisit}
              onChange={(e) => handleRateChange("hospitalDoctorVisit", e.target.value)}
              className="w-24 text-right font-medium"
            />
            <span className="text-muted-foreground">/hour</span>
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Auto-Calculation:</strong> These rates are automatically applied in the Payroll Calendar 
            based on each shift's service type. Overtime is calculated at 1.5x the applicable rate.
          </p>
        </div>

        {/* Current Rates Summary */}
        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
          <div className="text-center p-3 bg-card border border-border rounded-lg">
            <p className="text-2xl font-bold text-foreground">${rates.standardHomeCare.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Home Care Rate</p>
          </div>
          <div className="text-center p-3 bg-card border border-border rounded-lg">
            <p className="text-2xl font-bold text-amber-600">${rates.hospitalDoctorVisit.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Hospital/Doctor Rate</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
