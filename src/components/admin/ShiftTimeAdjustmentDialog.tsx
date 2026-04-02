import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Clock, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ShiftTimeAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  pswName: string;
  clientName: string;
  bookingCode: string;
  originalClockIn: string | null;
  originalClockOut: string | null;
  onAdjusted?: () => void;
}

const toLocalDatetimeString = (isoStr: string | null): string => {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
};

export const ShiftTimeAdjustmentDialog = ({
  isOpen,
  onClose,
  bookingId,
  pswName,
  clientName,
  bookingCode,
  originalClockIn,
  originalClockOut,
  onAdjusted,
}: ShiftTimeAdjustmentDialogProps) => {
  const { user } = useAuth();
  const [adjustedClockIn, setAdjustedClockIn] = useState("");
  const [adjustedClockOut, setAdjustedClockOut] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setAdjustedClockIn(toLocalDatetimeString(originalClockIn));
      setAdjustedClockOut(toLocalDatetimeString(originalClockOut));
      setReason("");
    }
  }, [isOpen, originalClockIn, originalClockOut]);

  const calcDuration = (): string => {
    if (!adjustedClockIn || !adjustedClockOut) return "—";
    const start = new Date(adjustedClockIn).getTime();
    const end = new Date(adjustedClockOut).getTime();
    if (end <= start) return "Invalid";
    const mins = Math.round((end - start) / 60000);
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const isValid = adjustedClockIn && adjustedClockOut && reason.trim().length > 0 && new Date(adjustedClockOut) > new Date(adjustedClockIn);

  const handleSave = async () => {
    if (!isValid || !user) return;
    setSaving(true);
    try {
      const adjIn = new Date(adjustedClockIn).toISOString();
      const adjOut = new Date(adjustedClockOut).toISOString();

      // Insert audit record
      const { error: auditErr } = await supabase
        .from("shift_time_adjustments")
        .insert({
          booking_id: bookingId,
          original_clock_in: originalClockIn,
          original_clock_out: originalClockOut,
          adjusted_clock_in: adjIn,
          adjusted_clock_out: adjOut,
          adjustment_reason: reason.trim(),
          adjusted_by: user.email || user.id,
        });

      if (auditErr) throw auditErr;

      // Update the booking with adjusted times
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({
          checked_in_at: adjIn,
          signed_out_at: adjOut,
        })
        .eq("id", bookingId);

      if (bookingErr) throw bookingErr;

      // Recalculate payroll entry using effective times
      const { error: payrollErr } = await (supabase as any).rpc(
        "upsert_payroll_entry_for_booking",
        { p_booking_id: bookingId }
      );
      if (payrollErr) {
        console.warn("Payroll recalc after adjustment failed:", payrollErr);
      }

      toast.success("Shift times adjusted & payroll recalculated");
      onAdjusted?.();
      onClose();
    } catch (err: any) {
      console.error("Time adjustment error:", err);
      toast.error("Failed to adjust shift times");
    } finally {
      setSaving(false);
    }
  };

  const duration = calcDuration();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Adjust Shift Times
          </DialogTitle>
          <DialogDescription>
            Correct clock-in/out times for payroll accuracy. Original times are preserved in the audit trail.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">PSW:</span>
              <p className="font-medium">{pswName}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Client:</span>
              <p className="font-medium">{clientName}</p>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Order:</span>
              <span className="ml-2 font-mono text-xs">{bookingCode}</span>
            </div>
          </div>

          {originalClockIn && (
            <div className="p-2 bg-muted rounded text-xs space-y-1">
              <p><span className="text-muted-foreground">Original In:</span> {new Date(originalClockIn).toLocaleString()}</p>
              {originalClockOut && (
                <p><span className="text-muted-foreground">Original Out:</span> {new Date(originalClockOut).toLocaleString()}</p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Adjusted Clock-In</Label>
            <Input
              type="datetime-local"
              value={adjustedClockIn}
              onChange={(e) => setAdjustedClockIn(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Adjusted Clock-Out</Label>
            <Input
              type="datetime-local"
              value={adjustedClockOut}
              onChange={(e) => setAdjustedClockOut(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Recalculated Duration:</span>
            <Badge variant={duration === "Invalid" ? "destructive" : "secondary"}>
              {duration}
            </Badge>
          </div>

          {duration === "Invalid" && (
            <div className="flex items-center gap-2 text-xs text-destructive">
              <AlertTriangle className="w-3 h-3" />
              Clock-out must be after clock-in
            </div>
          )}

          <div className="space-y-2">
            <Label>Reason for Adjustment *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., PSW arrived 15 min earlier than recorded..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={!isValid || saving}>
            {saving ? "Saving..." : "Save Adjustment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
