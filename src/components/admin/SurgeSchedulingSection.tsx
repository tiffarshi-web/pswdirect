import { useState } from "react";
import { Plus, Trash2, Edit2, Save, X, Clock, Calendar, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export interface SurgeScheduleRule {
  id: string;
  name: string;
  enabled: boolean;
  multiplier: number; // e.g., 1.25 = 25% increase
  startDate?: string; // ISO date
  endDate?: string; // ISO date
  startTime?: string; // HH:MM
  endTime?: string; // HH:MM
  daysOfWeek?: number[]; // 0=Sun, 1=Mon, etc.
  stackable: boolean; // Can combine with other surges
}

const DEFAULT_RULES: SurgeScheduleRule[] = [
  {
    id: "holidays-2026",
    name: "Holiday Season 2026",
    enabled: false,
    multiplier: 1.5,
    startDate: "2026-12-20",
    endDate: "2026-01-03",
    stackable: true,
  },
  {
    id: "weekends",
    name: "Weekend Premium",
    enabled: false,
    multiplier: 1.15,
    daysOfWeek: [0, 6], // Sun, Sat
    stackable: true,
  },
  {
    id: "evenings",
    name: "Evening Hours",
    enabled: false,
    multiplier: 1.1,
    startTime: "18:00",
    endTime: "22:00",
    stackable: true,
  },
];

const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const SurgeSchedulingSection = () => {
  const [rules, setRules] = useState<SurgeScheduleRule[]>(() => {
    const stored = localStorage.getItem("surge_schedule_rules");
    return stored ? JSON.parse(stored) : DEFAULT_RULES;
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SurgeScheduleRule | null>(null);

  const saveRules = (newRules: SurgeScheduleRule[]) => {
    setRules(newRules);
    localStorage.setItem("surge_schedule_rules", JSON.stringify(newRules));
  };

  const handleToggle = (id: string, enabled: boolean) => {
    const updated = rules.map(r => r.id === id ? { ...r, enabled } : r);
    saveRules(updated);
    toast.success(enabled ? "Surge rule enabled" : "Surge rule disabled");
  };

  const handleEdit = (rule: SurgeScheduleRule) => {
    setEditingId(rule.id);
    setEditForm({ ...rule });
  };

  const handleSave = () => {
    if (!editForm) return;
    const updated = rules.map(r => r.id === editForm.id ? editForm : r);
    saveRules(updated);
    setEditingId(null);
    setEditForm(null);
    toast.success("Surge rule updated");
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleAddRule = () => {
    const newRule: SurgeScheduleRule = {
      id: `rule-${Date.now()}`,
      name: "New Surge Rule",
      enabled: false,
      multiplier: 1.2,
      stackable: false,
    };
    saveRules([...rules, newRule]);
    setEditingId(newRule.id);
    setEditForm(newRule);
  };

  const handleDeleteRule = (id: string) => {
    const updated = rules.filter(r => r.id !== id);
    saveRules(updated);
    toast.success("Surge rule deleted");
  };

  const toggleDayOfWeek = (day: number) => {
    if (!editForm) return;
    const current = editForm.daysOfWeek || [];
    const updated = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort();
    setEditForm({ ...editForm, daysOfWeek: updated });
  };

  const getActiveRulesCount = () => rules.filter(r => r.enabled).length;
  const calculateStackedMultiplier = () => {
    return rules
      .filter(r => r.enabled && r.stackable)
      .reduce((acc, r) => acc * r.multiplier, 1);
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Surge Scheduling (Time-Based)
            </CardTitle>
            <CardDescription>
              Configure automatic surge pricing based on date/time rules
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleAddRule}>
            <Plus className="w-4 h-4 mr-2" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="flex gap-4 p-4 bg-muted rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{getActiveRulesCount()}</p>
            <p className="text-xs text-muted-foreground">Active Rules</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">
              {((calculateStackedMultiplier() - 1) * 100).toFixed(0)}%
            </p>
            <p className="text-xs text-muted-foreground">Max Stacked Surge</p>
          </div>
        </div>

        {/* Rules List */}
        <div className="space-y-3">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`p-4 border rounded-lg transition-all ${
                rule.enabled 
                  ? "border-amber-300 bg-amber-50/50 dark:bg-amber-950/20" 
                  : "border-border"
              }`}
            >
              {editingId === rule.id && editForm ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">Rule Name</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Multiplier</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={3}
                          step={0.05}
                          value={editForm.multiplier}
                          onChange={(e) => setEditForm({ ...editForm, multiplier: parseFloat(e.target.value) || 1 })}
                          className="h-9 w-24"
                        />
                        <span className="text-sm text-muted-foreground">
                          = {((editForm.multiplier - 1) * 100).toFixed(0)}% increase
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Start Date (Optional)
                      </Label>
                      <Input
                        type="date"
                        value={editForm.startDate || ""}
                        onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value || undefined })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        End Date (Optional)
                      </Label>
                      <Input
                        type="date"
                        value={editForm.endDate || ""}
                        onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value || undefined })}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Time Range */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Start Time (Optional)
                      </Label>
                      <Input
                        type="time"
                        value={editForm.startTime || ""}
                        onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value || undefined })}
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        End Time (Optional)
                      </Label>
                      <Input
                        type="time"
                        value={editForm.endTime || ""}
                        onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value || undefined })}
                        className="h-9"
                      />
                    </div>
                  </div>

                  {/* Days of Week */}
                  <div className="space-y-2">
                    <Label className="text-xs">Days of Week (Optional)</Label>
                    <div className="flex gap-1">
                      {DAYS_OF_WEEK.map((day, index) => (
                        <Button
                          key={day}
                          variant={(editForm.daysOfWeek || []).includes(index) ? "default" : "outline"}
                          size="sm"
                          className="w-10 h-8 text-xs"
                          onClick={() => toggleDayOfWeek(index)}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Stackable Toggle */}
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Stackable</p>
                      <p className="text-xs text-muted-foreground">
                        Can combine with other active surge rules
                      </p>
                    </div>
                    <Switch
                      checked={editForm.stackable}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, stackable: checked })}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 justify-end">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button variant="brand" size="sm" onClick={handleSave}>
                      <Save className="w-4 h-4 mr-1" />
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => handleToggle(rule.id, checked)}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground">{rule.name}</p>
                        <Badge 
                          variant={rule.enabled ? "default" : "secondary"}
                          className={rule.enabled ? "bg-amber-500" : ""}
                        >
                          +{((rule.multiplier - 1) * 100).toFixed(0)}%
                        </Badge>
                        {rule.stackable && (
                          <Badge variant="outline" className="text-xs">Stackable</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                        {rule.startDate && rule.endDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {rule.startDate} to {rule.endDate}
                          </span>
                        )}
                        {rule.startTime && rule.endTime && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {rule.startTime} - {rule.endTime}
                          </span>
                        )}
                        {rule.daysOfWeek && rule.daysOfWeek.length > 0 && (
                          <span>
                            {rule.daysOfWeek.map(d => DAYS_OF_WEEK[d]).join(", ")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(rule)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteRule(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {rules.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No surge rules configured</p>
            <p className="text-xs">Add rules to automatically adjust pricing</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
