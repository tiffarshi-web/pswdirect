import { useMemo } from "react";
import { User, Users, Check, Clock, Zap, Calendar, Loader2, AlertCircle, Stethoscope, Hospital } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TimePicker } from "@/components/ui/time-picker";
import { SERVICE_TYPE_OPTIONS, DURATION_OPTIONS, getIconForTask } from "./types";
import { formatDuration } from "@/lib/businessConfig";
import type { TaskConfig, ServiceCategory } from "@/lib/taskConfig";
import type { ServiceForType } from "./types";

interface StepServiceAndScheduleProps {
  serviceFor: ServiceForType;
  onServiceForSelect: (type: ServiceForType) => void;
  selectedCategory: ServiceCategory | null;
  onCategorySelect: (category: ServiceCategory) => void;
  serviceTasks: TaskConfig[];
  tasksLoading: boolean;
  selectedServices: string[];
  selectedDuration: number;
  onToggleService: (id: string) => void;
  onDurationChange: (d: number) => void;
  serviceDate: string;
  startTime: string;
  isAsap: boolean;
  onFieldChange: (field: string, value: string) => void;
  onAsapChange: (v: boolean) => void;
}

export const StepServiceAndSchedule = ({
  serviceFor,
  onServiceForSelect,
  selectedCategory,
  onCategorySelect,
  serviceTasks,
  tasksLoading,
  selectedServices,
  selectedDuration,
  onToggleService,
  onDurationChange,
  serviceDate,
  startTime,
  isAsap,
  onFieldChange,
  onAsapChange,
}: StepServiceAndScheduleProps) => {
  // Filter tasks by selected category
  const filteredTasks = useMemo(
    () => (selectedCategory ? serviceTasks.filter((t) => t.serviceCategory === selectedCategory) : []),
    [serviceTasks, selectedCategory]
  );

  const estimatedCareMinutes = useMemo(
    () =>
      selectedServices.reduce((sum, id) => {
        const task = serviceTasks.find((t) => t.id === id);
        return sum + (task?.includedMinutes ?? 30);
      }, 0),
    [selectedServices, serviceTasks]
  );

  const minDuration = Math.max(1, Math.ceil(estimatedCareMinutes / 30) * 0.5);

  const hasCompanionship = useMemo(
    () =>
      selectedServices.some((id) => {
        const t = serviceTasks.find((s) => s.id === id);
        return t?.name.toLowerCase().includes("companion") || t?.name.toLowerCase().includes("supervision");
      }),
    [selectedServices, serviceTasks]
  );

  const companionshipSuggestions = [4, 6, 8, 12];

  const getCalculatedEndTime = () => {
    if (!startTime) return "";
    const [hours, mins] = startTime.split(":").map(Number);
    const totalMinutes = hours * 60 + mins + selectedDuration * 60;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMins = totalMinutes % 60;
    return `${endHours.toString().padStart(2, "0")}:${endMins.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-4">
      {/* Section 1: Who is care for? */}
      <Card className="shadow-card">
        <CardContent className="pt-5 pb-4">
          <p className="text-sm font-medium text-foreground mb-3">Who is this care for?</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onServiceForSelect("myself")}
              className={`flex items-center gap-2.5 p-3 rounded-lg border-2 transition-all text-left ${
                serviceFor === "myself"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <User className={`w-5 h-5 shrink-0 ${serviceFor === "myself" ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <span className="font-medium text-foreground text-sm block">Myself</span>
                <span className="text-xs text-muted-foreground">I need care</span>
              </div>
            </button>
            <button
              onClick={() => onServiceForSelect("someone-else")}
              className={`flex items-center gap-2.5 p-3 rounded-lg border-2 transition-all text-left ${
                serviceFor === "someone-else"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              <Users className={`w-5 h-5 shrink-0 ${serviceFor === "someone-else" ? "text-primary" : "text-muted-foreground"}`} />
              <div>
                <span className="font-medium text-foreground text-sm block">Loved One</span>
                <span className="text-xs text-muted-foreground">For family/friend</span>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Service type — only show after who is selected */}
      {serviceFor && (
        <Card className="shadow-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-sm font-medium text-foreground mb-3">What type of service?</p>
            <div className="space-y-2">
              {SERVICE_TYPE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedCategory === option.value;
                return (
                  <button
                    key={option.value}
                    onClick={() => onCategorySelect(option.value)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-foreground text-sm block">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Tasks — only show after category is selected */}
      {selectedCategory && (
        <Card className="shadow-card">
          <CardContent className="pt-5 pb-4 space-y-4">
            <p className="text-sm font-medium text-foreground">Select services needed</p>
            {tasksLoading ? (
              <div className="flex items-center justify-center p-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">Loading services...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <p className="text-muted-foreground text-center py-4 text-sm">No services available.</p>
            ) : (
              <div className="space-y-1.5">
                {filteredTasks.map((task) => {
                  const TaskIcon = getIconForTask(task.name);
                  const isSelected = selectedServices.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => onToggleService(task.id)}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg border transition-all text-left ${
                        isSelected
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {isSelected ? <Check className="w-3.5 h-3.5" /> : <TaskIcon className="w-3.5 h-3.5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground text-sm">{task.name}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">({task.includedMinutes} min)</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Duration */}
            {selectedServices.length > 0 && (
              <>
                <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Est. care time
                  </span>
                  <span className="font-bold text-primary text-sm">
                    {estimatedCareMinutes >= 60
                      ? `${(estimatedCareMinutes / 60).toFixed(estimatedCareMinutes % 60 === 0 ? 0 : 1)}h`
                      : `${estimatedCareMinutes} min`}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">How long do you need care?</Label>
                  {hasCompanionship && (
                    <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-xs text-muted-foreground mb-2">💡 Companionship visits are often longer.</p>
                      <div className="flex flex-wrap gap-1.5">
                        {companionshipSuggestions.map((h) => (
                          <Button key={h} size="sm" variant={selectedDuration === h ? "default" : "outline"} onClick={() => onDurationChange(h)} className="text-xs h-7 px-2.5">
                            {h}h
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-5 sm:grid-cols-8 gap-1.5">
                    {DURATION_OPTIONS.map((opt) => {
                      const isBelowMin = opt.value < minDuration;
                      return (
                        <Button
                          key={opt.value}
                          size="sm"
                          variant={selectedDuration === opt.value ? "default" : "outline"}
                          className={`text-xs h-8 ${isBelowMin ? "opacity-40 cursor-not-allowed" : ""}`}
                          disabled={isBelowMin}
                          onClick={() => onDurationChange(opt.value)}
                        >
                          {opt.label}
                        </Button>
                      );
                    })}
                  </div>
                  {selectedDuration < minDuration && (
                    <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/30 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-xs text-destructive">
                        Selected services need about {formatDuration(estimatedCareMinutes)}.
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Section 4: Schedule — only show after tasks selected */}
      {selectedServices.length > 0 && (
        <Card className="shadow-card">
          <CardContent className="pt-5 pb-4 space-y-4">
            <p className="text-sm font-medium text-foreground flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              When do you need care?
            </p>

            {/* ASAP */}
            <div className="flex items-start space-x-3 p-2.5 bg-accent/30 border border-accent rounded-lg">
              <Checkbox
                id="asapBooking"
                checked={isAsap}
                onCheckedChange={(checked) => onAsapChange(checked as boolean)}
              />
              <div className="space-y-0.5">
                <Label htmlFor="asapBooking" className="font-medium cursor-pointer flex items-center gap-1.5 text-sm">
                  <Zap className="w-3.5 h-3.5 text-accent-foreground" />
                  ASAP Service
                </Label>
                <p className="text-[11px] text-muted-foreground">Non-refundable.</p>
              </div>
            </div>

            {isAsap && (
              <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg space-y-1">
                <p className="text-sm font-medium text-foreground">We're notifying nearby caregivers now.</p>
                <p className="text-xs text-muted-foreground">You'll be matched as soon as one accepts.</p>
              </div>
            )}

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="serviceDate" className="text-xs">Date</Label>
                <Input
                  id="serviceDate"
                  type="date"
                  value={serviceDate}
                  onChange={(e) => onFieldChange("serviceDate", e.target.value)}
                  className={`h-9 text-sm ${isAsap ? "opacity-60" : ""}`}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Start Time</Label>
                <TimePicker
                  id="startTime"
                  value={startTime}
                  onChange={(val) => onFieldChange("startTime", val)}
                />
              </div>
            </div>
            {isAsap && startTime && (
              <p className="text-[11px] text-muted-foreground italic">
                Pre-filled for immediate care. You can adjust if needed.
              </p>
            )}
            {startTime && (
              <p className="text-xs text-muted-foreground">
                Ends at: <span className="font-medium text-foreground">{getCalculatedEndTime()}</span> ({selectedDuration}h)
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
