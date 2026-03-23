import { Check } from "lucide-react";
import { BOOKING_STEPS } from "./types";
import { Progress } from "@/components/ui/progress";

interface BookingProgressBarProps {
  currentStep: number;
}

export const BookingProgressBar = ({ currentStep }: BookingProgressBarProps) => {
  const progressPercent = ((currentStep - 1) / (BOOKING_STEPS.length - 1)) * 100;

  return (
    <div className="mb-4 space-y-2">
      <Progress value={progressPercent} className="h-1.5" />
      <div className="flex items-center justify-between">
        {BOOKING_STEPS.map((step) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <div key={step.id} className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs transition-all ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted border border-border text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="w-3 h-3" /> : <StepIcon className="w-3 h-3" />}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isCurrent ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {step.title}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
