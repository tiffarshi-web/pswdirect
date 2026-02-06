// Overtime Badge Component
// Displays overtime indicator with tooltip showing charge details

import { Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface OvertimeBadgeProps {
  overtimeMinutes?: number | null;
  overtimePaymentIntentId?: string | null;
  subtotal?: number;
  total?: number;
  className?: string;
  showTooltip?: boolean;
}

// Calculate billable minutes based on overtime rules
const calculateBillableMinutes = (overtimeMinutes: number): number => {
  if (overtimeMinutes <= 14) return 0;
  if (overtimeMinutes <= 30) return 30;
  if (overtimeMinutes <= 60) return 60;
  return Math.ceil(overtimeMinutes / 60) * 60;
};

// Calculate overtime charge amount based on the standard $35/hr rate
const calculateOvertimeCharge = (overtimeMinutes: number, hourlyRate: number = 35): number => {
  const billableMinutes = calculateBillableMinutes(overtimeMinutes);
  return (billableMinutes / 60) * hourlyRate;
};

export const OvertimeBadge = ({
  overtimeMinutes,
  overtimePaymentIntentId,
  subtotal,
  total,
  className,
  showTooltip = true,
}: OvertimeBadgeProps) => {
  // Don't show if no overtime
  if (!overtimeMinutes || overtimeMinutes <= 14) return null;

  const billableMinutes = calculateBillableMinutes(overtimeMinutes);
  const estimatedCharge = subtotal && total ? (total - subtotal) : calculateOvertimeCharge(overtimeMinutes);
  
  const truncatedPaymentId = overtimePaymentIntentId 
    ? `${overtimePaymentIntentId.slice(0, 10)}...` 
    : null;

  const badge = (
    <Badge 
      className={cn(
        "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700 gap-1",
        className
      )}
    >
      <Timer className="w-3 h-3" />
      Overtime
    </Badge>
  );

  if (!showTooltip) return badge;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1 text-sm">
            <p className="font-medium">⏱️ Overtime Charged</p>
            <p>Actual overtime: {overtimeMinutes} min</p>
            <p>Billed for: {billableMinutes} min block</p>
            {estimatedCharge > 0 && (
              <p>Surcharge: ${estimatedCharge.toFixed(2)}</p>
            )}
            {truncatedPaymentId && (
              <p className="text-xs text-muted-foreground font-mono">
                Stripe: {truncatedPaymentId}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default OvertimeBadge;
