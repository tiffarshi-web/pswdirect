// Care Sheet Form Customization Settings
import { useState, useEffect } from "react";
import { Plus, Trash2, GripVertical, RotateCcw, ListChecks } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getCareSheetConfig,
  saveCareSheetConfig,
  addMoodOption,
  removeMoodOption,
  reorderMoodOptions,
  toggleAlwaysShowTask,
  resetCareSheetConfig,
  type MoodOption,
  type CareSheetConfig,
} from "@/lib/careSheetConfig";
import { getTasks } from "@/lib/taskConfig";

export const CareSheetSettingsSection = () => {
  const [config, setConfig] = useState<CareSheetConfig>(getCareSheetConfig());
  const [newMoodLabel, setNewMoodLabel] = useState("");
  const tasks = getTasks();

  useEffect(() => {
    setConfig(getCareSheetConfig());
  }, []);

  const handleAddMood = () => {
    if (!newMoodLabel.trim()) {
      toast.error("Please enter a mood label");
      return;
    }
    const updated = addMoodOption(newMoodLabel.trim());
    setConfig(updated);
    setNewMoodLabel("");
    toast.success("Mood option added");
  };

  const handleRemoveMood = (value: string) => {
    const updated = removeMoodOption(value);
    setConfig(updated);
    toast.success("Mood option removed");
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const sorted = [...config.moodOptions].sort((a, b) => a.order - b.order);
    const temp = sorted[index].order;
    sorted[index].order = sorted[index - 1].order;
    sorted[index - 1].order = temp;
    const updated = reorderMoodOptions(sorted);
    setConfig(updated);
  };

  const handleMoveDown = (index: number) => {
    const sorted = [...config.moodOptions].sort((a, b) => a.order - b.order);
    if (index === sorted.length - 1) return;
    const temp = sorted[index].order;
    sorted[index].order = sorted[index + 1].order;
    sorted[index + 1].order = temp;
    const updated = reorderMoodOptions(sorted);
    setConfig(updated);
  };

  const handleToggleTask = (taskId: string) => {
    const updated = toggleAlwaysShowTask(taskId);
    setConfig(updated);
  };

  const handleReset = () => {
    const updated = resetCareSheetConfig();
    setConfig(updated);
    toast.success("Care sheet settings reset to defaults");
  };

  const sortedMoods = [...config.moodOptions].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      {/* Mood Options */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg">Mood Options</CardTitle>
          <CardDescription>
            Configure the mood options that PSWs can select when completing care sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new mood */}
          <div className="flex gap-2">
            <Input
              placeholder="New mood option (e.g., Confused)"
              value={newMoodLabel}
              onChange={(e) => setNewMoodLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMood()}
            />
            <Button onClick={handleAddMood} variant="outline">
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {/* Mood list */}
          <div className="space-y-2">
            {sortedMoods.map((mood, index) => (
              <div
                key={mood.value}
                className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex flex-col gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0}
                  >
                    <GripVertical className="w-3 h-3 rotate-90" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === sortedMoods.length - 1}
                  >
                    <GripVertical className="w-3 h-3 rotate-90" />
                  </Button>
                </div>
                <span className="flex-1 font-medium">{mood.label}</span>
                <Badge variant="outline" className="text-xs">
                  {mood.value}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => handleRemoveMood(mood.value)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Always Show Tasks */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-primary" />
            Always-Show Tasks
          </CardTitle>
          <CardDescription>
            Select tasks that should always appear on every care sheet, regardless of the booked services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <Checkbox
                  id={`always-${task.id}`}
                  checked={config.alwaysShowTasks.includes(task.id)}
                  onCheckedChange={() => handleToggleTask(task.id)}
                />
                <Label htmlFor={`always-${task.id}`} className="flex-1 cursor-pointer">
                  {task.name}
                </Label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Reset Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset to Defaults
        </Button>
      </div>
    </div>
  );
};
