// Admin Edit Order Dialog — permanent ability to edit any order at any time
// (date, time, duration, address, notes, assigned PSW) directly from Orders Pipeline.
// Updates the existing booking record without going back through dispatch.

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { TimePicker } from "@/components/ui/time-picker";
import { Search, Loader2, AlertTriangle, UserMinus, Languages, User2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { ShiftRecord } from "@/lib/shiftStore";

interface EditOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shift: ShiftRecord | null;
  isActive?: boolean; // true if shift has already started (In Progress)
  onSaved: () => void;
}

interface PSWCandidate {
  id: string;
  pswNumber: number | null;
  firstName: string;
  lastName: string;
  city: string;
  email: string;
}

const minutesBetween = (start: string, end: string): number => {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em) - (sh * 60 + sm);
};

const addMinutes = (start: string, mins: number): string => {
  const [sh, sm] = start.split(":").map(Number);
  const total = sh * 60 + sm + mins;
  const h = Math.floor((total % (24 * 60)) / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const EditOrderDialog = ({ open, onOpenChange, shift, isActive, onSaved }: EditOrderDialogProps) => {
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState(60); // minutes
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [pswId, setPswId] = useState<string | null>(null);
  const [pswFirstName, setPswFirstName] = useState<string>("");
  const [psws, setPsws] = useState<PSWCandidate[]>([]);
  const [loadingPsws, setLoadingPsws] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [activeWarningAck, setActiveWarningAck] = useState(false);

  useEffect(() => {
    if (!open || !shift) return;
    setDate(shift.scheduledDate);
    const s = (shift.scheduledStart || "00:00").slice(0, 5);
    const e = (shift.scheduledEnd || "00:00").slice(0, 5);
    setStartTime(s);
    setEndTime(e);
    setDuration(Math.max(15, minutesBetween(s, e)));
    setAddress(shift.patientAddress || "");
    setNotes(shift.specialNotes || "");
    setPswId(shift.pswId && shift.pswId !== "" ? shift.pswId : null);
    setPswFirstName(shift.pswName?.split(" ")[0] || "");
    setSearch("");
    setActiveWarningAck(false);
    void loadPsws();
  }, [open, shift]);

  const loadPsws = async () => {
    setLoadingPsws(true);
    try {
      const { data, error } = await supabase
        .from("psw_profiles")
        .select("id, psw_number, first_name, last_name, home_city, email")
        .eq("vetting_status", "approved")
        .order("first_name");
      if (error) throw error;
      setPsws(
        (data || []).map((p: any) => ({
          id: p.id,
          pswNumber: p.psw_number ?? null,
          firstName: p.first_name,
          lastName: p.last_name,
          city: p.home_city || "Unknown",
          email: p.email,
        }))
      );
    } catch (err) {
      console.error("Failed to load PSWs", err);
      toast.error("Failed to load PSW list");
    } finally {
      setLoadingPsws(false);
    }
  };

  // Recompute end time when duration changes
  const handleDurationChange = (mins: number) => {
    setDuration(mins);
    if (startTime) setEndTime(addMinutes(startTime, mins));
  };

  // Recompute end time when start changes (preserve duration)
  const handleStartChange = (val: string) => {
    setStartTime(val);
    setEndTime(addMinutes(val, duration));
  };

  // If user edits end-time directly, derive duration
  const handleEndChange = (val: string) => {
    setEndTime(val);
    const d = minutesBetween(startTime, val);
    if (d > 0) setDuration(d);
  };

  const filteredPsws = useMemo(() => {
    if (!search.trim()) return psws;
    const q = search.toLowerCase();
    return psws.filter(
      (p) =>
        p.firstName.toLowerCase().includes(q) ||
        p.lastName.toLowerCase().includes(q) ||
        p.city.toLowerCase().includes(q) ||
        (p.pswNumber !== null && String(p.pswNumber).includes(q)) ||
        p.email.toLowerCase().includes(q)
    );
  }, [psws, search]);

  const selectedPsw = psws.find((p) => p.id === pswId);

  const handleSave = async () => {
    if (!shift) return;
    if (isActive && !activeWarningAck) {
      toast.warning("Please confirm you want to modify an active shift.");
      return;
    }
    if (!date || !startTime || !endTime) {
      toast.error("Date, start time, and end time are required.");
      return;
    }
    if (minutesBetween(startTime, endTime) <= 0) {
      toast.error("End time must be after start time.");
      return;
    }

    setSaving(true);
    try {
      const updates: Record<string, any> = {
        scheduled_date: date,
        start_time: startTime,
        end_time: endTime,
        hours: Number((minutesBetween(startTime, endTime) / 60).toFixed(2)),
        patient_address: address,
        client_address: address,
        special_notes: notes,
        updated_at: new Date().toISOString(),
      };

      const previousPswId = shift.pswId && shift.pswId !== "" ? shift.pswId : null;
      const pswChanged = pswId !== previousPswId;

      if (pswChanged) {
        if (pswId && selectedPsw) {
          updates.psw_assigned = pswId;
          updates.psw_first_name = selectedPsw.firstName;
          updates.claimed_at = new Date().toISOString();
          // Keep status: if it was pending, promote to active; otherwise leave it.
          if (!shift.checkedInAt) {
            updates.status = "active";
          }
        } else {
          // Removed PSW
          updates.psw_assigned = null;
          updates.psw_first_name = null;
          updates.claimed_at = null;
          updates.status = "pending";
        }
      }

      const { error } = await supabase.from("bookings").update(updates).eq("id", shift.id);
      if (error) throw error;

      // Notify newly assigned PSW
      if (pswChanged && pswId && selectedPsw) {
        await supabase.from("notifications").insert({
          user_email: selectedPsw.email,
          title: "📋 Shift Assigned by Admin",
          body: `You have been assigned a shift on ${date} (${startTime}–${endTime}). Please check your dashboard for details.`,
          type: "shift_assigned",
        });
      }

      // Notify removed PSW
      if (pswChanged && previousPswId && previousPswId !== pswId) {
        const { data: prev } = await supabase
          .from("psw_profiles")
          .select("email")
          .eq("id", previousPswId)
          .maybeSingle();
        if (prev?.email) {
          await supabase.from("notifications").insert({
            user_email: prev.email,
            title: "⚠️ Shift Reassigned",
            body: `You have been removed from the shift on ${shift.scheduledDate} (${shift.scheduledStart}–${shift.scheduledEnd}). Contact admin if you have questions.`,
            type: "shift_removed",
          });
        }
      }

      toast.success("Order updated successfully");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Edit order error:", err);
      toast.error(err?.message || "Failed to update order");
    } finally {
      setSaving(false);
    }
  };

  if (!shift) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Edit Order — {shift.bookingId}</DialogTitle>
          <DialogDescription>
            {shift.clientName} · {shift.services.join(", ") || "General Care"}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-3 -mr-3">
          <div className="space-y-5">
            {isActive && (
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="space-y-2">
                    <p className="font-medium text-amber-800 dark:text-amber-300">
                      This shift is currently in progress.
                    </p>
                    <p className="text-amber-700 dark:text-amber-400">
                      Modifying it may affect time tracking, payroll, and the assigned caregiver.
                    </p>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeWarningAck}
                        onChange={(e) => setActiveWarningAck(e.target.checked)}
                      />
                      <span className="text-amber-800 dark:text-amber-300">
                        I understand and want to proceed.
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Client preferences */}
            <div className="rounded-md border bg-muted/30 p-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Client Preferences
              </p>
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline" className="gap-1">
                  <Languages className="w-3 h-3" />
                  Language: {shift.preferredLanguages?.length ? shift.preferredLanguages.join(", ") : "Any"}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <User2 className="w-3 h-3" />
                  Gender: {shift.preferredGender || "No preference"}
                </Badge>
                {shift.careConditions && shift.careConditions.length > 0 && (
                  <Badge variant="outline">
                    Conditions: {shift.careConditions.join(", ")}
                  </Badge>
                )}
              </div>
            </div>

            {/* Date / Time / Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  min={15}
                  step={15}
                  value={duration}
                  onChange={(e) => handleDurationChange(Math.max(15, parseInt(e.target.value) || 15))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Start Time</Label>
                <TimePicker value={startTime} onChange={handleStartChange} />
              </div>
              <div className="space-y-1.5">
                <Label>End Time</Label>
                <TimePicker value={endTime} onChange={handleEndChange} />
              </div>
            </div>

            {/* Address */}
            <div className="space-y-1.5">
              <Label>Service Address</Label>
              <Textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="Street, City, Postal Code"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes / Special Instructions</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Any special instructions for the caregiver..."
              />
            </div>

            <Separator />

            {/* Assigned PSW */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Assigned PSW</Label>
                {pswId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-orange-600 hover:text-orange-700 h-7 px-2"
                    onClick={() => {
                      setPswId(null);
                      setPswFirstName("");
                    }}
                  >
                    <UserMinus className="w-3.5 h-3.5 mr-1" />
                    Remove PSW
                  </Button>
                )}
              </div>

              {selectedPsw ? (
                <div className="rounded-md border bg-card p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">
                      {selectedPsw.firstName} {selectedPsw.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedPsw.pswNumber !== null ? `PSW-${selectedPsw.pswNumber} · ` : ""}
                      {selectedPsw.city}
                    </p>
                  </div>
                  <Badge variant="default">Assigned</Badge>
                </div>
              ) : pswId ? (
                <div className="rounded-md border bg-card p-3 text-sm text-muted-foreground">
                  Currently assigned: {pswFirstName || "Unknown"}
                </div>
              ) : (
                <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
                  No PSW assigned. Order will return to "Unassigned — Needs PSW".
                </div>
              )}

              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, PSW ID, city, or email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="border rounded-md max-h-56 overflow-y-auto">
                {loadingPsws ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredPsws.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">
                    No caregivers match your search.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {filteredPsws.slice(0, 50).map((p) => {
                      const isSelected = p.id === pswId;
                      return (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => {
                              setPswId(p.id);
                              setPswFirstName(p.firstName);
                            }}
                            className={`w-full text-left px-3 py-2 hover:bg-accent/50 flex items-center justify-between ${
                              isSelected ? "bg-accent" : ""
                            }`}
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {p.firstName} {p.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {p.pswNumber !== null ? `PSW-${p.pswNumber} · ` : ""}
                                {p.city}
                              </p>
                            </div>
                            {isSelected && <Badge variant="secondary">Selected</Badge>}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
