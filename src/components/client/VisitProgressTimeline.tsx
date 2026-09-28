import { Check, Circle } from "lucide-react";
import type { Booking } from "@/hooks/useClientBookings";

/**
 * Client-facing visit progress. Every stage is derived from server-controlled
 * booking fields (status, psw_assigned, checked_in_at, signed_out_at,
 * care_sheet_submitted_at). No invented ETA, no live worker location.
 */
const ROLE_BY_PROVINCE: Record<string, string> = { ON: "PSW", AB: "HCA" };

export const providerRoleFor = (province?: string | null) =>
  ROLE_BY_PROVINCE[(province || "ON").toUpperCase()] ?? "Caregiver";

export type VisitStage = { key: string; label: string; done: boolean };

export const deriveVisitStages = (b: Booking): VisitStage[] => {
  const role = providerRoleFor(b.service_province);
  const cancelled = b.status === "cancelled";
  const assigned = !!b.psw_assigned;
  const checkedIn = !!b.checked_in_at || b.status === "in-progress" || b.status === "completed";
  const completed = !!b.signed_out_at || b.status === "completed";
  const report = !!b.care_sheet_submitted_at;
  const enRoute = !!b.psw_en_route_at;
  if (cancelled) return [{ key: "cancelled", label: "Booking cancelled", done: true }];
  const stages: VisitStage[] = [
    { key: "confirmed", label: "Booking confirmed", done: true },
    { key: "searching", label: `Looking for a ${role}`, done: assigned },
    { key: "assigned", label: assigned ? `${b.psw_first_name || "Your " + role} (${role}) assigned` : `${role} assigned`, done: assigned },
  ];
  // Shown only once the assigned worker has confirmed it on the server. No ETA.
  if (enRoute && assigned) {
    stages.push({ key: "on_my_way", label: `Your ${role} is on the way`, done: true });
  }
  stages.push(
    { key: "checked_in", label: `${role} checked in — visit in progress`, done: checkedIn },
    { key: "completed", label: "Visit completed", done: completed },
    { key: "report", label: "Care report ready", done: report },
  );
  return stages;
};

export const VisitProgressTimeline = ({ booking }: { booking: Booking }) => {
  const stages = deriveVisitStages(booking);
  const current = stages.findIndex((s) => !s.done);
  return (
    <ol className="mt-2 space-y-1.5" aria-label="Visit progress">
      {stages.map((s, i) => (
        <li key={s.key} className="flex items-center gap-2 text-xs">
          {s.done ? (
            <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Check className="w-3 h-3" />
            </span>
          ) : (
            <Circle className={`w-4 h-4 ${i === current ? "text-primary animate-pulse" : "text-muted-foreground/40"}`} />
          )}
          <span className={s.done ? "text-foreground" : i === current ? "text-primary font-medium" : "text-muted-foreground"}>
            {s.label}
          </span>
        </li>
      ))}
    </ol>
  );
};
