import { useState, useEffect } from "react";
import { DollarSign, TrendingUp, Clock, Timer, MapPin, Plus, Trash2, Edit2, Save, X, Car, ListChecks } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type PricingConfig, type SurgeZone, formatDuration, DEFAULT_SURGE_ZONES } from "@/lib/businessConfig";
import { TaskManagementSection } from "./TaskManagementSection";
import { getTasks, type TaskConfig } from "@/lib/taskConfig";

const serviceLabels: Record<string, string> = {
  "personal-care": "Personal Care Assistance",
  "companionship": "Companionship Visit",
  "meal-prep": "Meal Preparation",
  "medication": "Medication Reminders",
  "light-housekeeping": "Light Housekeeping",
  "transportation": "Transportation Assistance",
  "respite": "Respite Care",
};

const durationLabels: Record<string, string> = {
  "personal-care": "Personal Care",
  "companionship": "Companionship",
  "meal-prep": "Meal Prep",
  "medication": "Medication",
  "light-housekeeping": "Light Housekeeping",
  "transportation": "Transportation",
  "respite": "Respite Care",
  "doctor-escort": "Doctor Appointment Escort",
};

interface PricingSectionProps {
  pricing: PricingConfig;
  onSurgeChange: (value: number[]) => void;
  onMinHoursChange: (value: string) => void;
  onDoctorEscortMinChange: (value: string) => void;
  onTaskDurationChange: (service: string, value: string) => void;
  onOvertimeRateChange: (value: string) => void;
  onOvertimeGraceChange: (value: string) => void;
  onOvertimeBlockChange: (value: string) => void;
  onRegionalSurgeToggle?: (enabled: boolean) => void;
  onSurgeZoneUpdate?: (zones: SurgeZone[]) => void;
  onSave?: () => void;
  hasChanges?: boolean;
}

export const PricingSection = ({
  pricing,
  onSurgeChange,
  onMinHoursChange,
  onDoctorEscortMinChange,
  onTaskDurationChange,
  onOvertimeRateChange,
  onOvertimeGraceChange,
  onOvertimeBlockChange,
  onRegionalSurgeToggle,
  onSurgeZoneUpdate,
  onSave,
  hasChanges,
}: PricingSectionProps) => {
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [editZoneForm, setEditZoneForm] = useState<SurgeZone | null>(null);
  const [taskList, setTaskList] = useState<TaskConfig[]>([]);

  // Load tasks from taskConfig
  useEffect(() => {
    setTaskList(getTasks());
  }, []);

  // Use a default hourly rate for overtime calculations (rates now managed in pricing_settings table)
  const defaultHourlyRate = 35;
  const overtimeRatePerHour = defaultHourlyRate * (pricing.overtimeRatePercentage / 100);

  // Surge zone handlers
  const handleZoneToggle = (zoneId: string, enabled: boolean) => {
    const updatedZones = (pricing.surgeZones || DEFAULT_SURGE_ZONES).map(z =>
      z.id === zoneId ? { ...z, enabled } : z
    );
    onSurgeZoneUpdate?.(updatedZones);
  };

  const handleZoneEdit = (zone: SurgeZone) => {
    setEditingZoneId(zone.id);
    setEditZoneForm({ ...zone });
  };

  const handleZoneSave = () => {
    if (!editZoneForm) return;
    const updatedZones = (pricing.surgeZones || DEFAULT_SURGE_ZONES).map(z =>
      z.id === editZoneForm.id ? editZoneForm : z
    );
    onSurgeZoneUpdate?.(updatedZones);
    setEditingZoneId(null);
    setEditZoneForm(null);
  };

  const handleAddZone = () => {
    const newZone: SurgeZone = {
      id: `zone-${Date.now()}`,
      name: "New Surge Zone",
      enabled: false,
      clientSurcharge: 5,
      pswBonus: 3,
      pswFlatBonus: 10,
      postalCodePrefixes: [],
      cities: [],
    };
    const updatedZones = [...(pricing.surgeZones || DEFAULT_SURGE_ZONES), newZone];
    onSurgeZoneUpdate?.(updatedZones);
    setEditingZoneId(newZone.id);
    setEditZoneForm(newZone);
  };

  const handleDeleteZone = (zoneId: string) => {
    const updatedZones = (pricing.surgeZones || DEFAULT_SURGE_ZONES).filter(z => z.id !== zoneId);
    onSurgeZoneUpdate?.(updatedZones);
  };

  const surgeZones = pricing.surgeZones || DEFAULT_SURGE_ZONES;

  return (
    <div className="space-y-6">
      {/* Base Hour Explanation */}
      <Card className="shadow-card border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-medium text-foreground">Base Hour + Overtime Model</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Every booking starts with a <strong className="text-foreground">{pricing.minimumHours}-hour base charge</strong>. 
                If the PSW signs out more than {pricing.overtimeGraceMinutes} minutes late, overtime is billed in {pricing.overtimeBlockMinutes}-minute blocks 
                at {pricing.overtimeRatePercentage}% of the hourly rate (~${overtimeRatePerHour.toFixed(2)}/hr).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overtime Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Timer className="w-5 h-5 text-primary" />
            Overtime Billing Rules (15-min Logic)
          </CardTitle>
          <CardDescription>
            Configure the grace period and overtime billing increments ($/4 blocks)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="overtimeRate">Overtime Rate (%)</Label>
              <Input
                id="overtimeRate"
                type="number"
                min={10}
                max={100}
                step={5}
                value={pricing.overtimeRatePercentage}
                onChange={(e) => onOvertimeRateChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                % of hourly rate
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="graceMinutes">Grace Period (min)</Label>
              <Input
                id="graceMinutes"
                type="number"
                min={0}
                max={30}
                step={1}
                value={pricing.overtimeGraceMinutes}
                onChange={(e) => onOvertimeGraceChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                No charge if under
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="blockMinutes">Billing Block (min)</Label>
              <Input
                id="blockMinutes"
                type="number"
                min={15}
                max={60}
                step={15}
                value={pricing.overtimeBlockMinutes}
                onChange={(e) => onOvertimeBlockChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Billed in increments
              </p>
            </div>
          </div>

          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-sm font-medium text-foreground">How Overtime Works ($/4 Logic):</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>0-{pricing.overtimeGraceMinutes} minutes late: <strong className="text-green-600">No extra charge</strong></li>
              <li>{pricing.overtimeGraceMinutes + 1}-{pricing.overtimeBlockMinutes} minutes late: <strong className="text-amber-600">1 block = ${(defaultHourlyRate / 4).toFixed(2)}</strong></li>
              <li>{pricing.overtimeBlockMinutes + 1}-{pricing.overtimeBlockMinutes * 2} minutes late: <strong className="text-amber-600">2 blocks = ${(defaultHourlyRate / 2).toFixed(2)}</strong></li>
            </ul>
            <p className="text-xs text-muted-foreground mt-2">
              Example: 1hr 15min visit = 1hr base + 1 overtime block = ${defaultHourlyRate.toFixed(2)} + ${(defaultHourlyRate / 4).toFixed(2)} = ${(defaultHourlyRate * 1.25).toFixed(2)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Regional Surge Pricing */}
      <Card className={`shadow-card ${pricing.regionalSurgeEnabled ? 'border-amber-500 border-2' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className={`w-5 h-5 ${pricing.regionalSurgeEnabled ? 'text-amber-500' : 'text-primary'}`} />
                Regional Surge Pricing
              </CardTitle>
              <CardDescription>
                Adjust pricing based on client location (Toronto/GTA)
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${pricing.regionalSurgeEnabled ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {pricing.regionalSurgeEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
              <Switch
                checked={pricing.regionalSurgeEnabled || false}
                onCheckedChange={(checked) => onRegionalSurgeToggle?.(checked)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {pricing.regionalSurgeEnabled && (
            <>
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Surge Zones</Label>
                <Button variant="outline" size="sm" onClick={handleAddZone}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Zone
                </Button>
              </div>

              <div className="space-y-3">
                {surgeZones.map((zone) => (
                  <div 
                    key={zone.id} 
                    className={`p-4 border rounded-lg ${zone.enabled ? 'border-amber-300 bg-amber-50/50 dark:bg-amber-950/20' : 'border-border'}`}
                  >
                    {editingZoneId === zone.id && editZoneForm ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Zone Name</Label>
                            <Input
                              value={editZoneForm.name}
                              onChange={(e) => setEditZoneForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="h-9"
                            />
                          </div>
                          <div className="flex items-end gap-2">
                            <Button variant="brand" size="sm" onClick={handleZoneSave}>
                              <Save className="w-4 h-4 mr-1" />
                              Save
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => { setEditingZoneId(null); setEditZoneForm(null); }}>
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <Label className="text-xs">Client Surcharge ($/hr)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={editZoneForm.clientSurcharge}
                              onChange={(e) => setEditZoneForm(prev => prev ? { ...prev, clientSurcharge: parseFloat(e.target.value) || 0 } : null)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">PSW Bonus ($/hr)</Label>
                            <Input
                              type="number"
                              min={0}
                              step={1}
                              value={editZoneForm.pswBonus}
                              onChange={(e) => setEditZoneForm(prev => prev ? { ...prev, pswBonus: parseFloat(e.target.value) || 0 } : null)}
                              className="h-9"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs flex items-center gap-1">
                              <Car className="w-3 h-3" />
                              Travel/Parking Bonus ($)
                            </Label>
                            <Input
                              type="number"
                              min={0}
                              step={5}
                              value={editZoneForm.pswFlatBonus || 0}
                              onChange={(e) => setEditZoneForm(prev => prev ? { ...prev, pswFlatBonus: parseFloat(e.target.value) || 0 } : null)}
                              className="h-9"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Cities (comma-separated)</Label>
                          <Input
                            value={editZoneForm.cities.join(", ")}
                            onChange={(e) => setEditZoneForm(prev => prev ? { ...prev, cities: e.target.value.split(",").map(c => c.trim()).filter(Boolean) } : null)}
                            className="h-9"
                            placeholder="Toronto, North York, Scarborough"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Postal Code Prefixes (comma-separated)</Label>
                          <Input
                            value={editZoneForm.postalCodePrefixes.join(", ")}
                            onChange={(e) => setEditZoneForm(prev => prev ? { ...prev, postalCodePrefixes: e.target.value.split(",").map(c => c.trim().toUpperCase()).filter(Boolean) } : null)}
                            className="h-9"
                            placeholder="M1, M2, M3, M4, M5"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Switch
                            checked={zone.enabled}
                            onCheckedChange={(checked) => handleZoneToggle(zone.id, checked)}
                          />
                          <div>
                            <p className="font-medium text-foreground">{zone.name}</p>
                            <div className="flex gap-3 text-sm text-muted-foreground">
                              <span>Client: +${zone.clientSurcharge}/hr</span>
                              <span>PSW: +${zone.pswBonus}/hr</span>
                              {(zone.pswFlatBonus || 0) > 0 && (
                                <span className="flex items-center gap-1 text-green-600">
                                  <Car className="w-3 h-3" />
                                  +${zone.pswFlatBonus} flat
                                </span>
                              )}
                            </div>
                            <div className="flex gap-2 mt-1">
                              {zone.cities.slice(0, 3).map(city => (
                                <Badge key={city} variant="secondary" className="text-xs">{city}</Badge>
                              ))}
                              {zone.cities.length > 3 && (
                                <Badge variant="outline" className="text-xs">+{zone.cities.length - 3} more</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleZoneEdit(zone)}>
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          {surgeZones.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteZone(zone.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>How it works:</strong> When a client's address matches a surge zone (by city or postal code):
                </p>
                <ul className="text-sm text-amber-800 dark:text-amber-200 mt-2 space-y-1 list-disc list-inside">
                  <li>Client is charged an extra ${surgeZones.find(z => z.enabled)?.clientSurcharge || 0}/hr (e.g., $35 → $45)</li>
                  <li>PSW receives +${surgeZones.find(z => z.enabled)?.pswBonus || 0}/hr hourly bonus</li>
                  <li>PSW receives ${surgeZones.find(z => z.enabled)?.pswFlatBonus || 0} flat Urban Travel/Parking Bonus per shift</li>
                </ul>
              </div>
            </>
          )}

          {!pricing.regionalSurgeEnabled && (
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                Enable regional surge to add location-based pricing adjustments for high-demand areas like Toronto/GTA.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Surge Pricing (Time-based) */}
      <Card className={`shadow-card ${pricing.surgeMultiplier > 1 ? 'border-amber-500 border-2' : ''}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className={`w-5 h-5 ${pricing.surgeMultiplier > 1 ? 'text-amber-500' : 'text-primary'}`} />
                Time-Based Surge Pricing
              </CardTitle>
              <CardDescription>
                Hidden from clients. Use for high-demand periods (holidays, weekends).
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${pricing.surgeMultiplier > 1 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                {pricing.surgeMultiplier > 1 ? 'ON' : 'OFF'}
              </span>
              <Switch
                checked={pricing.surgeMultiplier > 1}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSurgeChange([1.5]);
                  } else {
                    onSurgeChange([1.0]);
                  }
                }}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {pricing.surgeMultiplier > 1 && (
            <>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Surge Multiplier</Label>
                  <span className="text-2xl font-bold text-amber-600">
                    {pricing.surgeMultiplier.toFixed(2)}x
                  </span>
                </div>
                <Slider
                  value={[pricing.surgeMultiplier]}
                  onValueChange={onSurgeChange}
                  min={1.05}
                  max={2.5}
                  step={0.05}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1.05x</span>
                  <span>1.50x</span>
                  <span>2.00x</span>
                  <span>2.50x</span>
                </div>
              </div>

              <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>⚠️ Surge Active:</strong> Clients are being charged {((pricing.surgeMultiplier - 1) * 100).toFixed(0)}% extra. 
                  This is NOT visible to them.
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  Example: A ${defaultHourlyRate.toFixed(2)}/hr service becomes ${(defaultHourlyRate * pricing.surgeMultiplier).toFixed(2)}/hr
                </p>
              </div>
            </>
          )}

          {pricing.surgeMultiplier === 1 && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">
                <strong>✓ Standard Pricing:</strong> Clients are being charged normal rates.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Base Hour Settings */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Base Hour Requirements
          </CardTitle>
          <CardDescription>
            Minimum booking charge (clients pay at least this amount)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="minHours">Standard Base (Hours)</Label>
              <Input
                id="minHours"
                type="number"
                min={0.5}
                max={8}
                step={0.5}
                value={pricing.minimumHours}
                onChange={(e) => onMinHoursChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Default minimum for all bookings
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="doctorMin">Doctor/Hospital Base (Hours)</Label>
              <Input
                id="doctorMin"
                type="number"
                min={1}
                max={8}
                step={0.5}
                value={pricing.doctorEscortMinimumHours}
                onChange={(e) => onDoctorEscortMinChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Final price adjusted on sign-out
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator className="my-6" />

      {/* Service Task Library */}
      <div className="space-y-2">
        <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          Service Task Library
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage standard tasks with recommended times. When clients book, tasks are used to suggest total booking duration.
        </p>
      </div>
      <TaskManagementSection />

      {/* Save Settings Button */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur-sm border-t pt-4 pb-2 -mx-1 px-1">
        <Button 
          variant="brand" 
          size="lg" 
          className="w-full" 
          onClick={onSave}
          disabled={!hasChanges}
        >
          <Save className="w-5 h-5 mr-2" />
          {hasChanges ? "Save Settings" : "All Changes Saved"}
        </Button>
        {hasChanges && (
          <p className="text-xs text-center text-amber-600 mt-2">
            You have unsaved changes. Click Save to apply them to all new bookings.
          </p>
        )}
      </div>
    </div>
  );
};