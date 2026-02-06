// Admin ASAP/Rush Pricing Card
// Configurable toggle, percentage, and lead time for rush booking fees

import { Zap, Clock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface AsapPricingCardProps {
  enabled: boolean;
  multiplier: number;
  leadTimeMinutes?: number;
  onToggle: (enabled: boolean) => void;
  onMultiplierChange: (multiplier: number) => void;
  onLeadTimeChange?: (minutes: number) => void;
  isSaving?: boolean;
}

export const AsapPricingCard = ({
  enabled,
  multiplier,
  leadTimeMinutes = 30,
  onToggle,
  onMultiplierChange,
  onLeadTimeChange,
  isSaving = false,
}: AsapPricingCardProps) => {
  // Convert multiplier to percentage (e.g., 1.25 -> 25)
  const percentage = Math.round((multiplier - 1) * 100);
  
  // Example price calculation
  const basePrice = 35;
  const asapPrice = enabled ? basePrice * multiplier : basePrice;

  const handlePercentageChange = (value: string) => {
    const pct = parseInt(value, 10);
    if (!isNaN(pct) && pct >= 0 && pct <= 100) {
      onMultiplierChange(1 + pct / 100);
    }
  };

  const handleLeadTimeChange = (value: string) => {
    const mins = parseInt(value, 10);
    if (!isNaN(mins) && mins >= 0 && mins <= 240) {
      onLeadTimeChange?.(mins);
    }
  };

  return (
    <Card className={`shadow-card ${enabled ? 'border-amber-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className={`w-5 h-5 ${enabled ? 'text-amber-500' : 'text-primary'}`} />
              Rush/ASAP Pricing
              {isSaving && (
                <Badge variant="secondary" className="ml-2 text-xs animate-pulse">
                  Saving...
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Apply a surge fee when clients select "I need this ASAP"
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${enabled ? 'text-amber-600' : 'text-muted-foreground'}`}>
              {enabled ? 'ENABLED' : 'DISABLED'}
            </span>
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              disabled={isSaving}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="asapPercentage">Rush Fee (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="asapPercentage"
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={percentage}
                    onChange={(e) => handlePercentageChange(e.target.value)}
                    className="w-24"
                    disabled={isSaving}
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadTime" className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Lead Time (min)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="leadTime"
                    type="number"
                    min={0}
                    max={240}
                    step={15}
                    value={leadTimeMinutes}
                    onChange={(e) => handleLeadTimeChange(e.target.value)}
                    className="w-24"
                    disabled={isSaving}
                  />
                  <span className="text-muted-foreground text-xs">from Now</span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
                Live Preview
              </p>
              <div className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                <span>${basePrice.toFixed(2)} base</span>
                <span>→</span>
                <span className="font-semibold">${asapPrice.toFixed(2)} with ASAP</span>
                <span className="text-amber-600 dark:text-amber-400">(+{percentage}%)</span>
              </div>
              <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-2">
                ASAP applies to bookings within {leadTimeMinutes} minutes of the current time
              </p>
            </div>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
              <p className="text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                <span className="font-medium">✓ Synced to Cloud</span> — Changes persist across all devices
              </p>
            </div>
          </>
        )}

        {!enabled && (
          <div className="p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              When disabled, the ASAP checkbox will still appear for dispatching priority, 
              but no surge fee will be applied at checkout.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AsapPricingCard;
