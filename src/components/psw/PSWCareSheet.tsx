import { useState, useMemo } from "react";
import { FileText, AlertCircle, Send, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type CareSheetData, OFFICE_PHONE_NUMBER } from "@/lib/shiftStore";
import { checkPSWPrivacy } from "@/lib/privacyFilter";

interface PSWCareSheetProps {
  services: string[];
  pswFirstName: string;
  onSubmit: (careSheet: CareSheetData) => void;
  isSubmitting?: boolean;
}

export const PSWCareSheet = ({ 
  services, 
  pswFirstName, 
  onSubmit,
  isSubmitting = false 
}: PSWCareSheetProps) => {
  const [moodOnArrival, setMoodOnArrival] = useState("");
  const [moodOnDeparture, setMoodOnDeparture] = useState("");
  const [tasksCompleted, setTasksCompleted] = useState<string[]>([]);
  const [observations, setObservations] = useState("");

  // Use privacy filter for PSW-specific blocking
  const privacyCheck = useMemo(() => checkPSWPrivacy(observations), [observations]);

  const isValid = moodOnArrival && moodOnDeparture && tasksCompleted.length > 0 && !privacyCheck.shouldBlock;

  const handleTaskToggle = (task: string, checked: boolean) => {
    if (checked) {
      setTasksCompleted(prev => [...prev, task]);
    } else {
      setTasksCompleted(prev => prev.filter(t => t !== task));
    }
  };

  const handleSubmit = () => {
    if (!isValid) return;

    const careSheet: CareSheetData = {
      moodOnArrival,
      moodOnDeparture,
      tasksCompleted,
      observations,
      pswFirstName,
      officeNumber: OFFICE_PHONE_NUMBER,
    };

    onSubmit(careSheet);
  };

  const moodOptions = [
    { value: "happy", label: "Happy" },
    { value: "content", label: "Content" },
    { value: "neutral", label: "Neutral" },
    { value: "anxious", label: "Anxious" },
    { value: "sad", label: "Sad" },
    { value: "agitated", label: "Agitated" },
  ];

  return (
    <Card className="shadow-card animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          Client Care Sheet
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Complete this form before signing out. It will be emailed to the ordering client.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mood Assessment */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">Client Assessment</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mood on Arrival <span className="text-destructive">*</span></Label>
              <Select value={moodOnArrival} onValueChange={setMoodOnArrival}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {moodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mood on Departure <span className="text-destructive">*</span></Label>
              <Select value={moodOnDeparture} onValueChange={setMoodOnDeparture}>
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {moodOptions.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Tasks Completed (based on order) */}
        <div className="space-y-4">
          <h3 className="font-medium text-foreground">
            Tasks Completed <span className="text-destructive">*</span>
          </h3>
          <p className="text-sm text-muted-foreground">
            Check all services you provided during this visit
          </p>
          <div className="grid grid-cols-1 gap-3">
            {services.map((service) => (
              <div key={service} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                <Checkbox
                  id={`task-${service}`}
                  checked={tasksCompleted.includes(service)}
                  onCheckedChange={(checked) => handleTaskToggle(service, checked === true)}
                />
                <Label 
                  htmlFor={`task-${service}`} 
                  className="flex-1 cursor-pointer font-medium"
                >
                  {service}
                </Label>
                {tasksCompleted.includes(service) && (
                  <CheckCircle2 className="w-4 h-4 text-primary" />
                )}
              </div>
            ))}
          </div>
          {tasksCompleted.length === 0 && (
            <p className="text-sm text-destructive">Please select at least one task completed</p>
          )}
        </div>

        {/* Observations/Notes */}
        <div className="space-y-2">
          <Label>Observations / Notes</Label>
          <Textarea
            placeholder="Document any observations, client condition, activities, or concerns..."
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="min-h-[120px]"
          />
          
          {privacyCheck.shouldBlock && (
            <div className="flex items-start gap-2 p-3 bg-destructive/10 rounded-lg">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">
                {privacyCheck.message} Use the office number ({OFFICE_PHONE_NUMBER}) for all follow-ups.
              </p>
            </div>
          )}
        </div>

        {/* Privacy Notice */}
        <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Privacy Notice</p>
          <p>
            This care sheet will only show your first name ({pswFirstName}) and the office 
            contact number ({OFFICE_PHONE_NUMBER}). Personal contact details are never shared.
          </p>
        </div>

        {/* Submit Button */}
        <Button
          variant="brand"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          disabled={!isValid || isSubmitting}
        >
          {isSubmitting ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Sign Out & Send Care Sheet
            </>
          )}
        </Button>

        {!isValid && (
          <p className="text-sm text-center text-muted-foreground">
            Please complete all required fields to sign out
          </p>
        )}
      </CardContent>
    </Card>
  );
};
