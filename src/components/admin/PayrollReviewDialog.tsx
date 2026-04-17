// Admin dialog for reviewing/overriding payable hours on a flagged payroll entry.
// Default pay = booked hours × rate. Clocked hours are reference only.
// Admin override = final source of truth.

import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: {
    id: string;
    psw_name: string;
    scheduled_date: string;
    booked_hours: number | null;
    clocked_hours: number | null;
    variance_hours: number | null;
    payable_hours_override: number | null;
    hourly_rate: number;
    requires_admin_review: boolean;
    payroll_review_note: string | null;
  } | null;
  onSaved: () => void;
}

export const PayrollReviewDialog = ({ open, onOpenChange, entry, onSaved }: Props) => {
  const [overrideHours, setOverrideHours] = useState<string>("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  if (!entry) return null;

  const booked = entry.booked_hours ?? 0;
  const clocked = entry.clocked_hours;
  const variance = entry.variance_hours;
  const suggestedFromClock = clocked != null ? clocked : null;
  const currentFinal = entry.payable_hours_override ?? booked;
  const currentTotal = currentFinal * entry.hourly_rate;

  const handleApproveBooked = async () => {
    setSaving(true);
    const { error } = await (supabase as any).rpc("admin_approve_booked_hours", {
      p_entry_id: entry.id,
      p_note: note || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Booked hours approved as final pay");
    onSaved();
    onOpenChange(false);
    setNote("");
  };

  const handleSetOverride = async () => {
    const value = parseFloat(overrideHours);
    if (isNaN(value) || value < 0) { toast.error("Enter a valid hours value"); return; }
    setSaving(true);
    const { error } = await (supabase as any).rpc("admin_set_payable_hours", {
      p_entry_id: entry.id,
      p_override_hours: value,
      p_note: note || null,
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`Final payable hours set to ${value.toFixed(2)} hrs`);
    onSaved();
    onOpenChange(false);
    setOverrideHours("");
    setNote("");
  };

  const handleClearOverride = async () => {
    setSaving(true);
    const { error } = await (supabase as any).rpc("admin_set_payable_hours", {
      p_entry_id: entry.id,
      p_override_hours: null,
      p_note: note || "Override cleared, reverted to booked hours",
    });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Override cleared. Pay reverted to booked hours.");
    onSaved();
    onOpenChange(false);
    setNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Review Payable Hours
          </DialogTitle>
          <DialogDescription>
            {entry.psw_name} • {entry.scheduled_date}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {entry.requires_admin_review && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div>
                Clocked time differs from booked time. Pay has NOT changed automatically.
                Review and choose to approve booked hours or set a manual override.
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="p-3 rounded-md bg-muted/40 border">
              <div className="text-xs text-muted-foreground">Booked Hours</div>
              <div className="text-lg font-semibold">{booked.toFixed(2)} hrs</div>
              <div className="text-xs text-muted-foreground">Default payroll source</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40 border">
              <div className="text-xs text-muted-foreground">Clocked Hours (Reference)</div>
              <div className="text-lg font-semibold">
                {clocked != null ? `${clocked.toFixed(2)} hrs` : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Not used for pay</div>
            </div>
            <div className="p-3 rounded-md bg-muted/40 border">
              <div className="text-xs text-muted-foreground">Variance</div>
              <div className={`text-lg font-semibold ${variance != null && Math.abs(variance) > 0.05 ? "text-amber-700" : ""}`}>
                {variance != null ? `${variance > 0 ? "+" : ""}${variance.toFixed(2)} hrs` : "—"}
              </div>
            </div>
            <div className="p-3 rounded-md bg-muted/40 border">
              <div className="text-xs text-muted-foreground">Suggested Hours (Reference)</div>
              <div className="text-lg font-semibold">
                {suggestedFromClock != null ? `${suggestedFromClock.toFixed(2)} hrs` : "—"}
              </div>
              <div className="text-xs text-muted-foreground">Based on clock</div>
            </div>
          </div>

          <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-emerald-700">Current Final Payable</div>
                <div className="text-xl font-bold text-emerald-800">
                  {currentFinal.toFixed(2)} hrs × ${entry.hourly_rate.toFixed(2)} = ${currentTotal.toFixed(2)}
                </div>
              </div>
              {entry.payable_hours_override != null && (
                <Badge className="bg-blue-100 text-blue-700">Override Active</Badge>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="override-hours">Admin Override (optional)</Label>
            <Input
              id="override-hours"
              type="number"
              step="0.01"
              min="0"
              placeholder={`e.g. ${suggestedFromClock?.toFixed(2) || booked.toFixed(2)}`}
              value={overrideHours}
              onChange={(e) => setOverrideHours(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Leave blank to approve booked hours. Setting an override becomes final pay.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="review-note">Note (optional)</Label>
            <Textarea
              id="review-note"
              rows={2}
              placeholder="Reason for override or approval"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {entry.payable_hours_override != null && (
            <Button variant="outline" onClick={handleClearOverride} disabled={saving}>
              Clear Override
            </Button>
          )}
          <Button variant="outline" onClick={handleApproveBooked} disabled={saving}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Approve Booked Hours
          </Button>
          <Button onClick={handleSetOverride} disabled={saving || !overrideHours}>
            Save Override
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
