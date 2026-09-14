// Office-only "Correct Wrong-Day Attendance" dialog.
//
// Shows the administrator the full picture before anything changes, then calls
// the admin-only database function. The same booking, the same payment and all
// original evidence are preserved — nothing is deleted here.

import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, CalendarClock, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  buildCorrectionIdempotencyKey,
  planWrongDayCorrection,
  validateWrongDayCorrection,
  MANUAL_PAYMENT_BLOCK_MESSAGE,
  type WrongDayAssignment,
  type WrongDayCase,
} from "@/lib/wrongDayCorrection";

interface Props {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingCode: string;
  clientName: string;
  pswName?: string | null;
  assignedPswId?: string | null;
  scheduledDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  checkedInAt?: string | null;
  signedOutAt?: string | null;
  careSheetStatus?: string | null;
  hasCareSheet?: boolean;
  bookingStatus?: string | null;
  onCorrected?: () => void;
}

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : "—");

export const WrongDayCorrectionDialog = ({
  open, onClose, bookingId, bookingCode, clientName, pswName, assignedPswId,
  scheduledDate, startTime, endTime, checkedInAt, signedOutAt,
  careSheetStatus, hasCareSheet, bookingStatus, onCorrected,
}: Props) => {
  const { user } = useAuth();
  const [correctionCase, setCorrectionCase] = useState<WrongDayCase>("no_care_original_date");
  const [reason, setReason] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newStart, setNewStart] = useState("");
  const [newEnd, setNewEnd] = useState("");
  const [clientInformed, setClientInformed] = useState(false);
  const [assignment, setAssignment] = useState<WrongDayAssignment>("keep");
  const [newPswId, setNewPswId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [nonce, setNonce] = useState("");
  const [location, setLocation] = useState<string>("—");
  const [earnings, setEarnings] = useState<{ total: number; paid: boolean }>({ total: 0, paid: false });
  const [pswOptions, setPswOptions] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!open) return;
    setNonce(crypto.randomUUID());
    setReason(""); setAdminNotes(""); setConfirmed(false); setClientInformed(false);
    setAssignment("keep"); setNewPswId(""); setCorrectionCase("no_care_original_date");
    setNewDate(scheduledDate ?? ""); setNewStart(startTime?.slice(0, 5) ?? ""); setNewEnd(endTime?.slice(0, 5) ?? "");

    (async () => {
      const { data: b } = await supabase
        .from("bookings")
        .select("check_in_outside_radius, check_in_distance_m, check_in_accuracy_m, gps_check_in_failed, gps_check_in_failure_reason")
        .eq("id", bookingId)
        .maybeSingle();
      if (b) {
        const parts: string[] = [];
        if ((b as any).gps_check_in_failed) parts.push(`GPS failed (${(b as any).gps_check_in_failure_reason ?? "unknown"})`);
        if ((b as any).check_in_outside_radius) parts.push("Outside approved radius");
        if ((b as any).check_in_distance_m != null) parts.push(`${Math.round(Number((b as any).check_in_distance_m))} m away`);
        if ((b as any).check_in_accuracy_m != null) parts.push(`±${Math.round(Number((b as any).check_in_accuracy_m))} m accuracy`);
        setLocation(parts.length ? parts.join(" · ") : "Verified at the visit address");
      }

      const { data: entries } = await supabase
        .from("payroll_entries")
        .select("total_owed, status, earning_status")
        .eq("shift_id", bookingId);
      const rows = entries ?? [];
      setEarnings({
        total: rows.reduce((s, r: any) => s + Number(r.total_owed || 0), 0),
        paid: rows.some((r: any) => r.status === "cleared" || r.earning_status === "paid_manually"),
      });

      const { data: psws } = await supabase
        .from("psw_profiles")
        .select("id, first_name, last_name")
        .eq("vetting_status", "approved")
        .limit(200);
      setPswOptions((psws ?? []).map((p: any) => ({ id: p.id, name: `${p.first_name ?? ""} ${p.last_name ?? ""}`.trim() })));
    })();
  }, [open, bookingId, scheduledDate, startTime, endTime]);

  const input = useMemo(() => ({
    correctionCase,
    reason,
    adminNotes,
    careDelivered: correctionCase === "care_delivered_review",
    newDate: correctionCase === "no_care_new_date" ? newDate : null,
    newStart: correctionCase === "no_care_new_date" ? newStart : null,
    newEnd: correctionCase === "no_care_new_date" ? newEnd : null,
    clientInformed,
    assignment,
    newPswId: assignment === "reassign" ? newPswId : null,
    adminEmail: user?.email ?? null,
    finalConfirmation: confirmed,
  }), [correctionCase, reason, adminNotes, newDate, newStart, newEnd, clientInformed, assignment, newPswId, user?.email, confirmed]);

  const ctx = {
    bookingId, bookingCode, status: bookingStatus ?? null,
    checkedInAt, signedOutAt, careSheetStatus, hasCareSheet,
    assignedPswId: assignedPswId ?? null,
    hasRecordedManualPayment: earnings.paid,
  };

  const errors = validateWrongDayCorrection(input, ctx);
  const plan = planWrongDayCorrection(input, ctx);

  const submit = async () => {
    if (errors.length) return;
    setSaving(true);
    const { data, error } = await (supabase as any).rpc("admin_correct_wrong_day_attendance", {
      p_booking_id: bookingId,
      p_case: correctionCase,
      p_reason: reason.trim(),
      p_idempotency_key: buildCorrectionIdempotencyKey(bookingId, nonce),
      p_admin_notes: adminNotes || null,
      p_care_delivered: correctionCase === "care_delivered_review",
      p_new_date: correctionCase === "no_care_new_date" ? newDate : null,
      p_new_start: correctionCase === "no_care_new_date" ? newStart : null,
      p_new_end: correctionCase === "no_care_new_date" ? newEnd : null,
      p_client_informed: clientInformed,
      p_assignment: assignment,
      p_new_psw_id: assignment === "reassign" ? newPswId : null,
    });
    setSaving(false);

    if (error) { toast.error(error.message); return; }
    if (data && data.ok === false) { toast.error(data.message || MANUAL_PAYMENT_BLOCK_MESSAGE); return; }

    toast.success(
      data?.result === "routed_to_manual_review"
        ? "Sent to office review — nothing was changed on the order."
        : `Order ${bookingCode} restored to the correct date.`,
    );
    onCorrected?.();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="w-5 h-5" />
            Correct Wrong-Day Attendance
          </DialogTitle>
          <DialogDescription>
            Puts this same paid order back on the correct date. The client is never charged again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="rounded-lg border p-3 grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Order</span><div className="font-medium">{bookingCode}</div></div>
            <div><span className="text-muted-foreground">Client</span><div className="font-medium">{clientName}</div></div>
            <div><span className="text-muted-foreground">Caregiver</span><div className="font-medium">{pswName || "Unassigned"}</div></div>
            <div><span className="text-muted-foreground">Current status</span><div className="font-medium">{bookingStatus ?? "—"}</div></div>
            <div><span className="text-muted-foreground">Scheduled</span><div className="font-medium">{scheduledDate} {startTime?.slice(0, 5)}–{endTime?.slice(0, 5)}</div></div>
            <div><span className="text-muted-foreground">Signed in</span><div className="font-medium">{fmt(checkedInAt)}</div></div>
            <div><span className="text-muted-foreground">Signed out</span><div className="font-medium">{fmt(signedOutAt)}</div></div>
            <div><span className="text-muted-foreground">Location check</span><div className="font-medium">{location}</div></div>
            <div><span className="text-muted-foreground">Care sheet</span><div className="font-medium">{careSheetStatus ?? "none"}</div></div>
            <div><span className="text-muted-foreground">Earnings</span><div className="font-medium">${earnings.total.toFixed(2)} {earnings.paid && <Badge variant="destructive" className="ml-1">Paid</Badge>}</div></div>
          </div>

          {earnings.paid && (
            <div className="flex items-start gap-2 rounded-lg border border-destructive bg-destructive/10 p-3">
              <ShieldAlert className="w-4 h-4 mt-0.5 text-destructive shrink-0" />
              <p className="text-destructive">{MANUAL_PAYMENT_BLOCK_MESSAGE}</p>
            </div>
          )}

          <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3">
            <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-700 shrink-0" />
            <p className="text-amber-900">
              This voids the recorded sign-in, sign-out, care sheet and earnings for this visit
              (evidence is kept in the permanent correction history) and returns the order to
              Upcoming Orders. It does not refund or re-charge the client.
            </p>
          </div>

          <div className="space-y-2">
            <Label>What happened?</Label>
            <RadioGroup value={correctionCase} onValueChange={(v) => setCorrectionCase(v as WrongDayCase)}>
              <div className="flex items-start gap-2"><RadioGroupItem value="no_care_original_date" id="c1" /><Label htmlFor="c1" className="font-normal">No care was delivered — reactivate for the original scheduled date</Label></div>
              <div className="flex items-start gap-2"><RadioGroupItem value="no_care_new_date" id="c2" /><Label htmlFor="c2" className="font-normal">No care was delivered — use a corrected appointment date</Label></div>
              <div className="flex items-start gap-2"><RadioGroupItem value="care_delivered_review" id="c3" /><Label htmlFor="c3" className="font-normal">Care was actually delivered on a different date (send to office review)</Label></div>
            </RadioGroup>
          </div>

          {correctionCase === "no_care_new_date" && (
            <div className="grid grid-cols-3 gap-2">
              <div><Label htmlFor="nd">Date</Label><Input id="nd" type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} /></div>
              <div><Label htmlFor="ns">Start</Label><Input id="ns" type="time" value={newStart} onChange={(e) => setNewStart(e.target.value)} /></div>
              <div><Label htmlFor="ne">End</Label><Input id="ne" type="time" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} /></div>
            </div>
          )}

          {correctionCase !== "care_delivered_review" && (
            <div className="space-y-2">
              <Label>Caregiver assignment</Label>
              <Select value={assignment} onValueChange={(v) => setAssignment(v as WrongDayAssignment)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="keep">Keep the current caregiver</SelectItem>
                  <SelectItem value="unassign">Unassign and return to the job pool</SelectItem>
                  <SelectItem value="reassign">Assign a different approved caregiver</SelectItem>
                </SelectContent>
              </Select>
              {assignment === "reassign" && (
                <Select value={newPswId} onValueChange={setNewPswId}>
                  <SelectTrigger><SelectValue placeholder="Choose a caregiver" /></SelectTrigger>
                  <SelectContent>
                    {pswOptions.map((p) => <SelectItem key={p.id} value={p.id}>{p.name || p.id}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Correction reason (required)</Label>
            <Input id="reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Caregiver signed in a day early" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Administrator notes</Label>
            <Textarea id="notes" value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} />
          </div>

          {correctionCase === "no_care_new_date" && (
            <label className="flex items-center gap-2">
              <Checkbox checked={clientInformed} onCheckedChange={(v) => setClientInformed(!!v)} />
              <span>The client has been informed of the new date</span>
            </label>
          )}

          <label className="flex items-center gap-2">
            <Checkbox checked={confirmed} onCheckedChange={(v) => setConfirmed(!!v)} />
            <span>
              I confirm this correction as {user?.email ?? "an administrator"}
              {plan.result === "reactivated" ? ` — the order will return to ${plan.newStatus === "active" ? "the caregiver's upcoming jobs" : "the available job pool"}.` : " — this will only be routed for office review."}
            </span>
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving || errors.length > 0}>
            {saving ? "Applying..." : plan.result === "manual_review" ? "Send to Office Review" : "Apply Correction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
