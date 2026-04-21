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
  scheduledDate?: string | null;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
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
  scheduledDate,
  scheduledStartTime,
  scheduledEndTime,
  onAdjusted,
}: ShiftTimeAdjustmentDialogProps) => {
  const { user } = useAuth();
  const [adjustedClockIn, setAdjustedClockIn] = useState("");
  const [adjustedClockOut, setAdjustedClockOut] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [fetchedSchedule, setFetchedSchedule] = useState<{ date: string; start: string; end: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setAdjustedClockIn(toLocalDatetimeString(originalClockIn));
      setAdjustedClockOut(toLocalDatetimeString(originalClockOut));
      setReason("");
      if (scheduledDate && scheduledStartTime && scheduledEndTime) {
        setFetchedSchedule({ date: scheduledDate, start: scheduledStartTime, end: scheduledEndTime });
      } else {
        supabase
          .from("bookings")
          .select("scheduled_date,start_time,end_time")
          .eq("id", bookingId)
          .single()
          .then(({ data }) => {
            if (data) setFetchedSchedule({ date: data.scheduled_date, start: data.start_time, end: data.end_time });
          });
      }
    }
  }, [isOpen, originalClockIn, originalClockOut, bookingId, scheduledDate, scheduledStartTime, scheduledEndTime]);

  const minutesBetween = (a: string, b: string): number => {
    const start = new Date(a).getTime();
    const end = new Date(b).getTime();
    if (!isFinite(start) || !isFinite(end) || end <= start) return 0;
    return Math.floor((end - start) / 60000);
  };

  const formatDuration = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  const workedMinutes = adjustedClockIn && adjustedClockOut ? minutesBetween(adjustedClockIn, adjustedClockOut) : 0;
  const bookedMinutes = fetchedSchedule
    ? minutesBetween(`${fetchedSchedule.date}T${fetchedSchedule.start}`, `${fetchedSchedule.date}T${fetchedSchedule.end}`)
    : 0;
  const overtimeMinutes = Math.max(0, workedMinutes - bookedMinutes);

  const scheduledStartIso = fetchedSchedule ? new Date(`${fetchedSchedule.date}T${fetchedSchedule.start}`).getTime() : 0;
  const scheduledEndIso = fetchedSchedule ? new Date(`${fetchedSchedule.date}T${fetchedSchedule.end}`).getTime() : 0;
  const adjInMs = adjustedClockIn ? new Date(adjustedClockIn).getTime() : 0;
  const adjOutMs = adjustedClockOut ? new Date(adjustedClockOut).getTime() : 0;
  const startVarianceMin = scheduledStartIso && adjInMs ? Math.round((adjInMs - scheduledStartIso) / 60000) : 0;
  const endVarianceMin = scheduledEndIso && adjOutMs ? Math.round((adjOutMs - scheduledEndIso) / 60000) : 0;

  const calcDuration = (): string => {
    if (!adjustedClockIn || !adjustedClockOut) return "—";
    if (new Date(adjustedClockOut) <= new Date(adjustedClockIn)) return "Invalid";
    return formatDuration(workedMinutes);
  };

  const isValid = adjustedClockIn && adjustedClockOut && reason.trim().length > 0 && new Date(adjustedClockOut) > new Date(adjustedClockIn);

  const handleSave = async () => {
    if (!isValid || !user) return;
    setSaving(true);
    try {
      const adjIn = new Date(adjustedClockIn).toISOString();
      const adjOut = new Date(adjustedClockOut).toISOString();

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

      // OT = worked - booked (NOT clock-out vs scheduled end).
      const { error: bookingErr } = await supabase
        .from("bookings")
        .update({
          checked_in_at: adjIn,
          signed_out_at: adjOut,
          overtime_minutes: overtimeMinutes,
          flagged_for_overtime: overtimeMinutes >= 15,
        })
        .eq("id", bookingId);

      if (bookingErr) throw bookingErr;

      const { error: payrollErr } = await (supabase as any).rpc(
        "upsert_payroll_entry_for_booking",
        { p_booking_id: bookingId }
      );
      if (payrollErr) {
        console.warn("Payroll recalc after adjustment failed:", payrollErr);
      }

      toast.success("Shift times adjusted, OT & payroll recalculated");
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

          {/* Final breakdown: separates worked duration, OT, and schedule variance */}
          <div className="p-3 bg-muted/50 rounded-md border space-y-1.5 text-xs">
            {fetchedSchedule && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Scheduled:</span>
                <span className="font-mono">
                  {fetchedSchedule.start.slice(0,5)} – {fetchedSchedule.end.slice(0,5)} ({formatDuration(bookedMinutes)})
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Final approved duration:</span>
              <Badge variant={duration === "Invalid" ? "destructive" : "secondary"}>
                {duration}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Overtime (worked − booked):</span>
              <Badge
                variant={overtimeMinutes > 0 ? "default" : "outline"}
                className={overtimeMinutes > 0 ? "bg-orange-100 text-orange-700 border-orange-300" : ""}
              >
                {overtimeMinutes > 0 ? `+${overtimeMinutes}m OT` : "0m"}
              </Badge>
            </div>
            {fetchedSchedule && workedMinutes > 0 && (startVarianceMin !== 0 || endVarianceMin !== 0) && (
              <div className="flex justify-between pt-1 border-t border-border/50">
                <span className="text-muted-foreground">Schedule variance:</span>
                <span className="font-mono text-muted-foreground">
                  start {startVarianceMin >= 0 ? "+" : ""}{startVarianceMin}m · end {endVarianceMin >= 0 ? "+" : ""}{endVarianceMin}m
                </span>
              </div>
            )}
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
