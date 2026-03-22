import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SERVICE_TYPE_OPTIONS } from "./types";
import type { ServiceCategory } from "@/lib/taskConfig";

interface StepServiceTypeProps {
  selectedCategory: ServiceCategory | null;
  onSelect: (category: ServiceCategory) => void;
}

export const StepServiceType = ({ selectedCategory, onSelect }: StepServiceTypeProps) => {
  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">What type of service do you need?</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {SERVICE_TYPE_OPTIONS.map((option) => {
          const Icon = option.icon;
          const isSelected = selectedCategory === option.value;
          return (
            <button
              key={option.value}
              onClick={() => onSelect(option.value)}
              className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                  : "border-border hover:border-primary/50 hover:bg-muted/30"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="font-semibold text-foreground block">{option.label}</span>
                <span className="text-sm text-muted-foreground">{option.description}</span>
              </div>
            </button>
          );
        })}
      </CardContent>
    </Card>
  );
};
