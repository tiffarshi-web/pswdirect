// Admin ASAP/Rush Pricing Card
// Configurable toggle and percentage for rush booking fees

import { Zap } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface AsapPricingCardProps {
  enabled: boolean;
  multiplier: number;
  onToggle: (enabled: boolean) => void;
  onMultiplierChange: (multiplier: number) => void;
}

export const AsapPricingCard = ({
  enabled,
  multiplier,
  onToggle,
  onMultiplierChange,
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

  return (
    <Card className={`shadow-card ${enabled ? 'border-amber-500 border-2' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className={`w-5 h-5 ${enabled ? 'text-amber-500' : 'text-primary'}`} />
              Rush/ASAP Pricing
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
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {enabled && (
          <>
            <div className="flex items-center gap-4">
              <div className="space-y-2 flex-1 max-w-[200px]">
                <Label htmlFor="asapPercentage">ASAP Fee (%)</Label>
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
                  />
                  <span className="text-muted-foreground">%</span>
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
