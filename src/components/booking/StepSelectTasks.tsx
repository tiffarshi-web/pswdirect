import { useMemo } from "react";
import { Check, Clock, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "lucide-react";
import type { TaskConfig, ServiceCategory } from "@/lib/taskConfig";
import { DURATION_OPTIONS, getIconForTask } from "./types";
import { formatDuration } from "@/lib/businessConfig";

interface StepSelectTasksProps {
  serviceTasks: TaskConfig[];
  tasksLoading: boolean;
  selectedCategory: ServiceCategory;
  selectedServices: string[];
  selectedDuration: number;
  onToggleService: (id: string) => void;
  onDurationChange: (d: number) => void;
}

export const StepSelectTasks = ({
  serviceTasks,
  tasksLoading,
  selectedCategory,
  selectedServices,
  selectedDuration,
  onToggleService,
  onDurationChange,
}: StepSelectTasksProps) => {
  // Filter tasks by selected category
  const filteredTasks = useMemo(
    () => serviceTasks.filter((t) => t.serviceCategory === selectedCategory),
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

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Calendar className="w-5 h-5 text-primary" />
          Select Services
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {tasksLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Loading services...</span>
          </div>
        ) : filteredTasks.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No services available for this category.</p>
        ) : (
          <div className="space-y-2">
            {filteredTasks.map((task) => {
              const TaskIcon = getIconForTask(task.name);
              const isSelected = selectedServices.includes(task.id);
              return (
                <button
                  key={task.id}
                  onClick={() => onToggleService(task.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isSelected ? <Check className="w-4 h-4" /> : <TaskIcon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-foreground text-sm">{task.name}</span>
                    <span className="text-xs text-muted-foreground ml-2">({task.includedMinutes} min)</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Estimated Care Time */}
        {selectedServices.length > 0 && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                Estimated Care Time
              </span>
              <span className="font-bold text-primary">
                {estimatedCareMinutes >= 60
                  ? `${(estimatedCareMinutes / 60).toFixed(estimatedCareMinutes % 60 === 0 ? 0 : 1)} hours`
                  : `${estimatedCareMinutes} min`}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on your selected services. You can book longer if needed.
            </p>
          </div>
        )}

        {/* Duration Selector */}
        {selectedServices.length > 0 && (
          <div className="space-y-3">
            <Label className="text-base font-medium">How long do you need care?</Label>
            {hasCompanionship && (
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  💡 Companionship visits are often booked for longer blocks.
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {companionshipSuggestions.map((h) => (
                    <Button
                      key={h}
                      size="sm"
                      variant={selectedDuration === h ? "default" : "outline"}
                      onClick={() => onDurationChange(h)}
                      className="text-xs"
                    >
                      {h}h
                    </Button>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
              {DURATION_OPTIONS.map((opt) => {
                const isBelowMin = opt.value < minDuration;
                return (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={selectedDuration === opt.value ? "default" : "outline"}
                    className={`text-sm ${isBelowMin ? "opacity-40 cursor-not-allowed" : ""}`}
                    disabled={isBelowMin}
                    onClick={() => onDurationChange(opt.value)}
                  >
                    {opt.label}
                  </Button>
                );
              })}
            </div>
            {selectedDuration < minDuration && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Your selected services need about {formatDuration(estimatedCareMinutes)} of care.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
