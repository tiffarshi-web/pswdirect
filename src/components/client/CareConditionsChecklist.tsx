import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, HeartPulse } from "lucide-react";
import { CARE_CONDITIONS, detectContactInfo } from "@/lib/careConditions";

interface CareConditionsChecklistProps {
  selectedConditions: string[];
  onConditionsChange: (conditions: string[]) => void;
  otherText: string;
  onOtherTextChange: (text: string) => void;
  otherTextError: string | null;
  onOtherTextErrorChange: (error: string | null) => void;
}

export const CareConditionsChecklist = ({
  selectedConditions,
  onConditionsChange,
  otherText,
  onOtherTextChange,
  otherTextError,
  onOtherTextErrorChange,
}: CareConditionsChecklistProps) => {
  const showOtherField = selectedConditions.includes("Other");

  const toggleCondition = (condition: string) => {
    if (selectedConditions.includes(condition)) {
      onConditionsChange(selectedConditions.filter((c) => c !== condition));
      if (condition === "Other") {
        onOtherTextChange("");
        onOtherTextErrorChange(null);
      }
    } else {
      onConditionsChange([...selectedConditions, condition]);
    }
  };

  const handleOtherTextChange = (value: string) => {
    onOtherTextChange(value);
    const error = detectContactInfo(value);
    onOtherTextErrorChange(error);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <HeartPulse className="w-4 h-4 text-primary" />
        <Label className="text-base font-medium">Care Needs (Optional)</Label>
      </div>
      <p className="text-xs text-muted-foreground">
        Select any conditions that apply. This helps your caregiver prepare properly.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {CARE_CONDITIONS.map((condition) => (
          <label
            key={condition}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
              selectedConditions.includes(condition)
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40"
            }`}
          >
            <Checkbox
              checked={selectedConditions.includes(condition)}
              onCheckedChange={() => toggleCondition(condition)}
              className="shrink-0"
            />
            <span className="text-sm text-foreground">{condition}</span>
          </label>
        ))}
      </div>

      {showOtherField && (
        <div className="space-y-2">
          <Label htmlFor="careConditionsOther">Please describe:</Label>
          <Textarea
            id="careConditionsOther"
            placeholder="Describe additional care needs..."
            value={otherText}
            onChange={(e) => handleOtherTextChange(e.target.value)}
            rows={2}
            className={otherTextError ? "border-destructive" : ""}
          />
          {otherTextError && (
            <div className="flex items-center gap-2 p-2 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              <span className="text-xs text-destructive">{otherTextError}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
