import { Calendar, Clock, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "@/components/ui/time-picker";

interface StepDateTimeProps {
  serviceDate: string;
  startTime: string;
  isAsap: boolean;
  selectedDuration: number;
  onFieldChange: (field: string, value: string) => void;
  onAsapChange: (v: boolean) => void;
}

const getCalculatedEndTime = (startTime: string, durationHours: number) => {
  if (!startTime) return "";
  const [hours, mins] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + durationHours * 60;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMins = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
};

export const StepDateTime = ({
  serviceDate,
  startTime,
  isAsap,
  selectedDuration,
  onFieldChange,
  onAsapChange,
}: StepDateTimeProps) => {
  const endTime = getCalculatedEndTime(startTime, selectedDuration);

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          When do you need care?
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* ASAP Option */}
        <div className="flex items-start space-x-3 p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
          <Checkbox
            id="asapBooking"
            checked={isAsap}
            onCheckedChange={(checked) => onAsapChange(checked as boolean)}
          />
          <div className="space-y-1">
            <Label htmlFor="asapBooking" className="font-medium cursor-pointer flex items-center gap-2">
              <Zap className="w-4 h-4 text-orange-500" />
              Request ASAP Service
            </Label>
            <p className="text-xs text-orange-700 dark:text-orange-400">
              Immediate requests are non-refundable.
            </p>
          </div>
        </div>

        {/* Date */}
        <div className="space-y-2">
          <Label htmlFor="serviceDate">
            <Calendar className="w-4 h-4 text-muted-foreground inline mr-2" />
            Service Date
          </Label>
          <Input
            id="serviceDate"
            type="date"
            value={serviceDate}
            onChange={(e) => onFieldChange("serviceDate", e.target.value)}
          />
        </div>

        {/* Time */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>
              <Clock className="w-4 h-4 text-muted-foreground inline mr-2" />
              Start Time
            </Label>
            <TimePicker
              id="startTime"
              value={startTime}
              onChange={(val) => onFieldChange("startTime", val)}
            />
          </div>
          <div className="space-y-2">
            <Label>End Time</Label>
            <div className="h-10 px-3 py-2 bg-muted rounded-md border border-input flex items-center">
              <span className={endTime ? "text-foreground" : "text-muted-foreground"}>
                {endTime || "Auto-calculated"}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
