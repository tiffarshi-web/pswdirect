// Read-only worked-hours data hook for admin "Worked Hours" review tab.
// NEVER writes to payroll_entries / bookings / payouts. Computes payable hours
// at display-time using the source-of-truth order:
//   A) admin payable_hours_override
//   B) signed_out_at - checked_in_at (or original_* if admin overrode timestamps)
//   C) null -> "Needs Review"

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ReviewState = "paid" | "approved" | "needs_review";

export interface WorkedHoursRow {
  // identifiers
  entry_id: string;
  booking_id: string | null;
  booking_code: string | null;
  // psw
  psw_id: string;
  psw_name: string;
  // client / service
  client_name: string | null;
  service_label: string;
  // dates
  scheduled_date: string;
  scheduled_start: string | null; // time
  scheduled_end: string | null;   // time
  // actual + adjusted timestamps
  actual_check_in: string | null;
  actual_sign_out: string | null;
  original_check_in: string | null;
  original_sign_out: string | null;
  admin_overrode_times: boolean;
  // hours
  booked_hours: number;
  actual_hours: number | null;
  override_hours: number | null;
  final_payable_hours: number | null;
  // pay
  hourly_rate: number;
  total_owed: number;
  paid_amount: number;
  remaining_amount: number;
  // status
  verification_status: string | null;
  gps_check_in_failed: boolean;
  check_in_outside_radius: boolean;
  sign_out_outside_radius: boolean;
  requires_admin_review: boolean;
  is_paid: boolean;
  state: ReviewState;
  needs_review_reasons: string[];
  payroll_review_note: string | null;
}

const hoursBetween = (a?: string | null, b?: string | null): number | null => {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!isFinite(ms) || ms <= 0) return null;
  return Math.round((ms / 3600000) * 100) / 100;
};

export const useWorkedHoursReview = () => {
  const [rows, setRows] = useState<WorkedHoursRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // Pull only completed/relevant payroll entries — we never compute against drafts.
    const { data: entries, error: entryErr } = await supabase
      .from("payroll_entries")
      .select("*")
      .order("scheduled_date", { ascending: false })
      .limit(2000);

    if (entryErr) { setError(entryErr.message); setLoading(false); return; }
    const list = entries ?? [];

    const bookingIds = Array.from(new Set(list.map((e: any) => e.shift_id).filter(Boolean)));
    const entryIds = list.map((e: any) => e.id);

    const [bookingsRes, linksRes] = await Promise.all([
      bookingIds.length
        ? supabase
            .from("bookings")
            .select("id, booking_code, client_name, client_first_name, service_type, scheduled_date, start_time, end_time, checked_in_at, signed_out_at, original_checked_in_at, original_signed_out_at, manual_check_in, manual_check_out, verification_status, gps_check_in_failed, check_in_outside_radius, sign_out_outside_radius")
            .in("id", bookingIds as string[])
        : Promise.resolve({ data: [] as any[], error: null }),
      entryIds.length
        ? supabase
            .from("payout_entry_links")
            .select("payroll_entry_id, amount_applied, payouts!inner(voided_at)")
            .in("payroll_entry_id", entryIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);

    const bookingMap = new Map<string, any>();
    (bookingsRes.data ?? []).forEach((b: any) => bookingMap.set(b.id, b));

    const paidByEntry: Record<string, number> = {};
    (linksRes.data ?? []).forEach((l: any) => {
      if (l.payouts?.voided_at) return;
      paidByEntry[l.payroll_entry_id] = (paidByEntry[l.payroll_entry_id] || 0) + Number(l.amount_applied || 0);
    });

    const built: WorkedHoursRow[] = list.map((e: any) => {
      const b = bookingMap.get(e.shift_id);

      const actualIn = b?.checked_in_at ?? null;
      const actualOut = b?.signed_out_at ?? null;
      const origIn = b?.original_checked_in_at ?? null;
      const origOut = b?.original_signed_out_at ?? null;

      const adminOverrodeTimes = !!(origIn || origOut);

      // B) actual hours from current (possibly admin-edited) timestamps,
      //    fallback to originals if current pair is incomplete.
      const actualHours =
        hoursBetween(actualIn, actualOut) ??
        hoursBetween(origIn ?? actualIn, origOut ?? actualOut);

      const overrideHours = e.payable_hours_override != null ? Number(e.payable_hours_override) : null;
      const bookedHours = Number(e.booked_hours ?? e.hours_worked ?? 0);

      // Source-of-truth: A) override -> B) actual -> C) null
      let finalPayable: number | null = null;
      if (overrideHours != null) finalPayable = overrideHours;
      else if (actualHours != null) finalPayable = actualHours;

      const totalOwed = Number(e.total_owed || 0);
      const paid = Math.min(paidByEntry[e.id] || 0, totalOwed);
      const remaining = Math.max(totalOwed - paid, 0);
      const isPaid =
        e.status === "cleared" ||
        e.cleared_at != null ||
        e.manual_payout_id != null ||
        (totalOwed > 0 && paid + 0.005 >= totalOwed);

      // Needs-review reasons (display-only)
      const reasons: string[] = [];
      if (!actualOut && !origOut) reasons.push("No sign-out recorded");
      if (b?.gps_check_in_failed) reasons.push("GPS soft-failed at check-in");
      if (b?.check_in_outside_radius) reasons.push("Check-in outside radius");
      if (b?.sign_out_outside_radius) reasons.push("Sign-out outside radius");
      if (b?.verification_status === "awaiting_review" || b?.verification_status === "flagged") {
        reasons.push(`Verification: ${b.verification_status}`);
      }
      // Heavy variance between admin override and actual hours
      if (overrideHours != null && actualHours != null) {
        const diff = Math.abs(overrideHours - actualHours);
        if (diff >= 1) reasons.push(`Override differs from actual by ${diff.toFixed(2)}h`);
      }
      // Abnormal duration
      if (actualHours != null && (actualHours > 16 || actualHours < 0.25)) {
        reasons.push(`Abnormal worked duration (${actualHours.toFixed(2)}h)`);
      }
      // Final payable missing
      if (finalPayable == null && !isPaid) reasons.push("No payable hours available");
      if (e.requires_admin_review) reasons.push("Flagged by payroll engine");

      let state: ReviewState;
      if (isPaid) state = "paid";
      else if (reasons.length > 0 || finalPayable == null) state = "needs_review";
      else state = "approved";

      const serviceArr: string[] = Array.isArray(b?.service_type) ? b.service_type : [];
      const serviceLabel = serviceArr.length > 0 ? serviceArr.join(", ") : (e.task_name || "Shift");

      return {
        entry_id: e.id,
        booking_id: e.shift_id ?? null,
        booking_code: b?.booking_code ?? null,
        psw_id: e.psw_id,
        psw_name: e.psw_name || "Unknown PSW",
        client_name: b?.client_first_name || b?.client_name || null,
        service_label: serviceLabel,
        scheduled_date: e.scheduled_date,
        scheduled_start: b?.start_time ?? null,
        scheduled_end: b?.end_time ?? null,
        actual_check_in: actualIn,
        actual_sign_out: actualOut,
        original_check_in: origIn,
        original_sign_out: origOut,
        admin_overrode_times: adminOverrodeTimes,
        booked_hours: bookedHours,
        actual_hours: actualHours,
        override_hours: overrideHours,
        final_payable_hours: finalPayable,
        hourly_rate: Number(e.hourly_rate || 0),
        total_owed: totalOwed,
        paid_amount: paid,
        remaining_amount: remaining,
        verification_status: b?.verification_status ?? null,
        gps_check_in_failed: !!b?.gps_check_in_failed,
        check_in_outside_radius: !!b?.check_in_outside_radius,
        sign_out_outside_radius: !!b?.sign_out_outside_radius,
        requires_admin_review: !!e.requires_admin_review,
        is_paid: isPaid,
        state,
        needs_review_reasons: reasons,
        payroll_review_note: e.payroll_review_note ?? null,
      };
    });

    setRows(built);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Per-PSW summary
  const summaryByPsw = useMemo(() => {
    const map = new Map<string, {
      psw_id: string;
      psw_name: string;
      unpaidApprovedHours: number;
      unpaidApprovedAmount: number;
      unpaidShifts: number;
      needsReviewShifts: number;
      paidShifts: number;
    }>();
    for (const r of rows) {
      const cur = map.get(r.psw_id) ?? {
        psw_id: r.psw_id,
        psw_name: r.psw_name,
        unpaidApprovedHours: 0,
        unpaidApprovedAmount: 0,
        unpaidShifts: 0,
        needsReviewShifts: 0,
        paidShifts: 0,
      };
      if (r.state === "paid") cur.paidShifts += 1;
      else if (r.state === "needs_review") cur.needsReviewShifts += 1;
      else if (r.state === "approved") {
        cur.unpaidShifts += 1;
        cur.unpaidApprovedHours += r.final_payable_hours ?? 0;
        cur.unpaidApprovedAmount += r.remaining_amount;
      }
      map.set(r.psw_id, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.unpaidApprovedAmount - a.unpaidApprovedAmount);
  }, [rows]);

  return { rows, summaryByPsw, loading, error, refetch: load };
};
