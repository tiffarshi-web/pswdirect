import { Check } from "lucide-react";
import { BOOKING_STEPS } from "./types";
import { Progress } from "@/components/ui/progress";

interface BookingProgressBarProps {
  currentStep: number;
}

export const BookingProgressBar = ({ currentStep }: BookingProgressBarProps) => {
  const progressPercent = ((currentStep - 1) / (BOOKING_STEPS.length - 1)) * 100;

  return (
    <div className="mb-6 space-y-3">
      <Progress value={progressPercent} className="h-2" />
      <div className="flex items-center justify-between">
        {BOOKING_STEPS.map((step) => {
          const StepIcon = step.icon;
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <div key={step.id} className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs transition-all ${
                  isCompleted
                    ? "bg-primary text-primary-foreground"
                    : isCurrent
                    ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                    : "bg-muted border border-border text-muted-foreground"
                }`}
              >
                {isCompleted ? <Check className="w-3.5 h-3.5" /> : <StepIcon className="w-3.5 h-3.5" />}
              </div>
              <span
                className={`text-[10px] mt-1 font-medium hidden sm:block ${
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
