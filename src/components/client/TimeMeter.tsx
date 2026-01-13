import { Clock, AlertCircle, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { calculateTimeRemaining } from "@/lib/taskConfig";

interface TimeMeterProps {
  selectedTaskIds: string[];
}

export const TimeMeter = ({ selectedTaskIds }: TimeMeterProps) => {
  if (selectedTaskIds.length === 0) return null;
  
  const timeCalc = calculateTimeRemaining(selectedTaskIds);
  const usedPercentage = Math.min(100, (timeCalc.totalMinutes / timeCalc.baseHourMinutes) * 100);
  
  return (
    <div className="p-4 bg-muted rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground text-sm">Base Hour Meter</span>
        </div>
        <span className={`text-sm font-medium ${timeCalc.exceeds ? "text-amber-600" : "text-green-600"}`}>
          {timeCalc.totalMinutes} / {timeCalc.baseHourMinutes} min
        </span>
      </div>
      
      <Progress 
        value={usedPercentage} 
        className={`h-3 ${timeCalc.exceeds ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`}
      />
      
      {!timeCalc.exceeds ? (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <Check className="w-4 h-4" />
          <span>
            You have <strong>{timeCalc.remainingMinutes} minutes</strong> remaining in your base hour
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p>
              Tasks exceed base hour by <strong>{timeCalc.totalMinutes - timeCalc.baseHourMinutes} minutes</strong>
            </p>
            <p className="text-xs mt-1">
              Additional time: {timeCalc.additionalBlocks} x 30-min block(s) = +${timeCalc.additionalCost.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
