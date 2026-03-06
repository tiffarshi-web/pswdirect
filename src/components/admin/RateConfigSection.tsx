// Unified Rate Configuration — edits both client pricing and PSW pay in one place.
// Source of truth: app_settings table (keys: "category_rates", "staff_pay_rates")

import { useState, useEffect } from "react";
import { DollarSign, Save, Loader2, Building2, Stethoscope, Hospital, Receipt } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { fetchPricingRatesFromDB, savePricingRates, type PricingRatesConfig } from "@/lib/pricingConfigStore";
import { fetchStaffPayRatesFromDB, saveStaffPayRates, type StaffPayRates } from "@/lib/payrollStore";

export const RateConfigSection = () => {
  const [pricing, setPricing] = useState<PricingRatesConfig | null>(null);
  const [pay, setPay] = useState<StaffPayRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    Promise.all([fetchPricingRatesFromDB(), fetchStaffPayRatesFromDB()]).then(([p, s]) => {
      setPricing(p);
      setPay(s);
      setLoading(false);
    });
  }, []);

  const updatePricing = (path: string, value: number) => {
    setPricing(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      if (path === "minimumBookingFee") {
        next.minimumBookingFee = value;
      } else {
        const [cat, field] = path.split(".");
        const key = cat as keyof Omit<PricingRatesConfig, "minimumBookingFee">;
        next[key] = { ...next[key], [field]: value };
      }
      return next;
    });
    setHasChanges(true);
  };

  const updatePay = (field: keyof StaffPayRates, value: number) => {
    setPay(prev => prev ? { ...prev, [field]: value } : prev);
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!pricing || !pay) return;
    setSaving(true);
    const [pricingOk, payOk] = await Promise.all([
      savePricingRates(pricing),
      saveStaffPayRates(pay),
    ]);
    setSaving(false);
    if (pricingOk && payOk) {
      setHasChanges(false);
      toast.success("All rates saved to database!");
    } else {
      toast.error("Failed to save some rates. Please try again.");
    }
  };

  if (loading || !pricing || !pay) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const RateRow = ({
    icon: Icon,
    iconColor,
    iconBg,
    label,
    description,
    firstHourValue,
    per30Value,
    pswPayValue,
    onFirstHourChange,
    onPer30Change,
    onPswPayChange,
  }: {
    icon: typeof Building2;
    iconColor: string;
    iconBg: string;
    label: string;
    description: string;
    firstHourValue: number;
    per30Value: number;
    pswPayValue: number;
    onFirstHourChange: (v: number) => void;
    onPer30Change: (v: number) => void;
    onPswPayChange: (v: number) => void;
  }) => (
    <div className="p-4 bg-muted rounded-lg space-y-3">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div>
          <p className="font-medium text-foreground">{label}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3 pl-12">
        <div>
          <Label className="text-xs text-muted-foreground">Client First Hour</Label>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-muted-foreground text-sm">$</span>
            <Input
              type="number" min={0} step={0.5}
              value={firstHourValue}
              onChange={e => onFirstHourChange(parseFloat(e.target.value) || 0)}
              className="w-24 text-right font-medium"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Client Per 30 Min</Label>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-muted-foreground text-sm">$</span>
            <Input
              type="number" min={0} step={0.5}
              value={per30Value}
              onChange={e => onPer30Change(parseFloat(e.target.value) || 0)}
              className="w-24 text-right font-medium"
            />
          </div>
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">PSW Pay /hr</Label>
          <div className="flex items-center gap-1 mt-1">
            <span className="text-muted-foreground text-sm">$</span>
            <Input
              type="number" min={0} step={0.5}
              value={pswPayValue}
              onChange={e => onPswPayChange(parseFloat(e.target.value) || 0)}
              className="w-24 text-right font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              Rate Configuration
            </CardTitle>
            <CardDescription>
              Client pricing and PSW pay rates — all new bookings and payroll use these values immediately.
            </CardDescription>
          </div>
          <Button
            variant="brand"
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || saving}
          >
            {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            {saving ? "Saving..." : "Save All Rates"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <RateRow
          icon={Building2}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          label="Standard Home Care"
          description="Personal care, companionship, meal prep, etc."
          firstHourValue={pricing.standard.firstHour}
          per30Value={pricing.standard.per30Min}
          pswPayValue={pay.standardHomeCare}
          onFirstHourChange={v => updatePricing("standard.firstHour", v)}
          onPer30Change={v => updatePricing("standard.per30Min", v)}
          onPswPayChange={v => updatePay("standardHomeCare", v)}
        />

        <RateRow
          icon={Stethoscope}
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-100 dark:bg-amber-900/30"
          label="Doctor Escort"
          description="Doctor appointment escorts and medical visit accompaniment"
          firstHourValue={pricing["doctor-appointment"].firstHour}
          per30Value={pricing["doctor-appointment"].per30Min}
          pswPayValue={pay.doctorVisit}
          onFirstHourChange={v => updatePricing("doctor-appointment.firstHour", v)}
          onPer30Change={v => updatePricing("doctor-appointment.per30Min", v)}
          onPswPayChange={v => updatePay("doctorVisit", v)}
        />

        <RateRow
          icon={Hospital}
          iconColor="text-red-600 dark:text-red-400"
          iconBg="bg-red-100 dark:bg-red-900/30"
          label="Hospital / Discharge"
          description="Hospital discharge, pick-up, and hospital-based care"
          firstHourValue={pricing["hospital-discharge"].firstHour}
          per30Value={pricing["hospital-discharge"].per30Min}
          pswPayValue={pay.hospitalVisit}
          onFirstHourChange={v => updatePricing("hospital-discharge.firstHour", v)}
          onPer30Change={v => updatePricing("hospital-discharge.per30Min", v)}
          onPswPayChange={v => updatePay("hospitalVisit", v)}
        />

        <Separator />

        {/* Minimum Booking Fee */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Receipt className="w-5 h-5 text-primary" />
            </div>
            <div>
              <Label className="text-base font-medium">Minimum Booking Fee</Label>
              <p className="text-sm text-muted-foreground">
                Floor price — bookings below this are charged this amount
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">$</span>
            <Input
              type="number" min={0} step={1}
              value={pricing.minimumBookingFee}
              onChange={e => updatePricing("minimumBookingFee", parseFloat(e.target.value) || 0)}
              className="w-24 text-right font-medium"
            />
          </div>
        </div>

        {/* Summary Grid */}
        <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>How it works:</strong> Client pricing uses the first-hour rate + 30-minute increments for additional time.
            PSW pay is a flat hourly rate applied to actual hours worked. Overtime is paid at 1.5× the PSW rate.
          </p>
        </div>

        {/* Rate Summary Cards */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center p-3 bg-card border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Standard</p>
            <p className="text-lg font-bold text-foreground">${pricing.standard.firstHour} / ${pricing.standard.per30Min}</p>
            <p className="text-xs text-muted-foreground">PSW: ${pay.standardHomeCare}/hr</p>
          </div>
          <div className="text-center p-3 bg-card border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Doctor</p>
            <p className="text-lg font-bold text-amber-600">${pricing["doctor-appointment"].firstHour} / ${pricing["doctor-appointment"].per30Min}</p>
            <p className="text-xs text-muted-foreground">PSW: ${pay.doctorVisit}/hr</p>
          </div>
          <div className="text-center p-3 bg-card border border-border rounded-lg">
            <p className="text-xs text-muted-foreground mb-1">Hospital</p>
            <p className="text-lg font-bold text-red-600">${pricing["hospital-discharge"].firstHour} / ${pricing["hospital-discharge"].per30Min}</p>
            <p className="text-xs text-muted-foreground">PSW: ${pay.hospitalVisit}/hr</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
