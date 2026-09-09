import { AlertTriangle, CloudOff, RefreshCw, WifiOff } from "lucide-react";
import type { ConnectionQuality } from "../native/networkStatus";

export type WorkerStatusKind =
  | ConnectionQuality
  | "server-unavailable"
  | "session-expired"
  | "location-unavailable"
  | "push-unavailable"
  | "unsynced-care-sheet"
  | "pending-confirmation";

const COPY: Record<Exclude<WorkerStatusKind, "online">, { title: string; body: string; tone: "warn" | "error" }> = {
  offline: {
    title: "No connection",
    body: "You can read your saved shifts. Accepting work, checking in and finishing a care report need a connection.",
    tone: "error",
  },
  slow: {
    title: "Slow connection",
    body: "Things may take a few extra seconds. Please wait for the confirmation before tapping again.",
    tone: "warn",
  },
  "server-unavailable": {
    title: "PSW Direct is not responding",
    body: "We could not reach PSW Direct. Your saved work is safe on this phone. Try again shortly.",
    tone: "error",
  },
  "session-expired": {
    title: "Please sign in again",
    body: "Your session ended. Any care report you were writing is saved on this phone and will be waiting for you.",
    tone: "warn",
  },
  "location-unavailable": {
    title: "Location unavailable",
    body: "We cannot confirm where you are, so check-in and check-out are paused. Turn on location for PSW Direct.",
    tone: "warn",
  },
  "push-unavailable": {
    title: "Notifications are off",
    body: "You will not be alerted about new shifts. Turn on notifications for PSW Direct in your phone settings.",
    tone: "warn",
  },
  "unsynced-care-sheet": {
    title: "Care report not sent yet",
    body: "Your answers are saved on this phone. They will be sent automatically when you are back online.",
    tone: "warn",
  },
  "pending-confirmation": {
    title: "Waiting for confirmation",
    body: "We are confirming this with PSW Direct. Please do not tap again.",
    tone: "warn",
  },
};

const ICONS: Partial<Record<WorkerStatusKind, typeof WifiOff>> = {
  offline: WifiOff,
  slow: RefreshCw,
  "server-unavailable": CloudOff,
};

export default function ConnectionBanner({ status }: { status: WorkerStatusKind }) {
  if (status === "online") return null;
  const copy = COPY[status];
  const Icon = ICONS[status] ?? AlertTriangle;

  return (
    <div
      role="status"
      aria-live="polite"
      className={
        copy.tone === "error"
          ? "flex items-start gap-3 border-b border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          : "flex items-start gap-3 border-b border-border bg-muted px-4 py-3 text-sm text-foreground"
      }
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <div>
        <p className="font-semibold">{copy.title}</p>
        <p className="text-xs opacity-90">{copy.body}</p>
      </div>
    </div>
  );
}
