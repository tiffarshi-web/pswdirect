import { Clock, AlertCircle, Check } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { getTasks } from "@/lib/taskConfig";

interface TimeMeterProps {
  selectedTaskIds: string[];
  selectedDuration?: number; // Total booking hours (1-8)
}

export const TimeMeter = ({ selectedTaskIds, selectedDuration = 1 }: TimeMeterProps) => {
  if (selectedTaskIds.length === 0) return null;
  
  // Calculate total minutes available based on selected duration
  const totalAvailableMinutes = selectedDuration * 60;
  
  // Calculate total minutes for selected tasks
  const tasks = getTasks();
  let totalTaskMinutes = 0;
  
  selectedTaskIds.forEach(taskId => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      totalTaskMinutes += task.includedMinutes;
    }
  });
  
  const usedPercentage = Math.min(100, (totalTaskMinutes / totalAvailableMinutes) * 100);
  const exceeds = totalTaskMinutes > totalAvailableMinutes;
  const remainingMinutes = Math.max(0, totalAvailableMinutes - totalTaskMinutes);
  
  return (
    <div className="p-4 bg-muted rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-medium text-foreground text-sm">
            {selectedDuration}-Hour Booking Meter
          </span>
        </div>
        <span className={`text-sm font-medium ${exceeds ? "text-amber-600" : "text-green-600"}`}>
          {totalTaskMinutes} / {totalAvailableMinutes} min
        </span>
      </div>
      
      <Progress 
        value={usedPercentage} 
        className={`h-3 ${exceeds ? "[&>div]:bg-amber-500" : "[&>div]:bg-green-500"}`}
      />
      
      {!exceeds ? (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
          <Check className="w-4 h-4" />
          <span>
            You have <strong>{remainingMinutes} minutes</strong> remaining in your {selectedDuration}-hour booking
          </span>
        </div>
      ) : (
        <div className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <p>
              Tasks exceed your {selectedDuration}-hour booking by <strong>{totalTaskMinutes - totalAvailableMinutes} minutes</strong>
            </p>
            <p className="text-xs mt-1">
              Consider selecting a longer duration or fewer tasks
            </p>
          </div>
        </div>
      )}
    </div>
  );
};