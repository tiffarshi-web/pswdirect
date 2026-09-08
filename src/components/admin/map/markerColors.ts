// Single source of truth for admin coverage-map marker colours.
//
// Business meaning (do not change without updating the legend + tests):
//   GREEN  = jobs that have NOT been accepted/assigned yet (open, pending payment, unserved)
//   BLUE   = jobs already accepted/assigned to a worker (assigned, active, in progress, completed)
//   WORKERS use a separate palette (orange / violet / grey) so they can never be
//            confused with job markers.
//
// Colour names match the leaflet-color-markers icon set used by the renderer.

import type { OrderBucket, PSWRow } from "./types";

export type MarkerColor = "green" | "blue" | "orange" | "violet" | "grey";

/** Buckets that represent a job nobody has accepted yet. */
export const UNACCEPTED_BUCKETS: OrderBucket[] = ["open", "pending", "unserved"];

/** Buckets that represent a job a worker has accepted / been assigned to. */
export const ACCEPTED_BUCKETS: OrderBucket[] = ["assigned", "active", "in_progress", "completed"];

export const orderMarkerColor = (bucket: OrderBucket): MarkerColor =>
  UNACCEPTED_BUCKETS.includes(bucket) ? "green" : "blue";

export const pswMarkerColor = (status: PSWRow["status"]): MarkerColor =>
  status === "on_shift" ? "violet" : status === "assigned" ? "grey" : "orange";

/** Tailwind dot classes for the legend / filter toggles, derived from the same mapping. */
export const MARKER_DOT_CLASS: Record<MarkerColor, string> = {
  green: "bg-green-500",
  blue: "bg-blue-500",
  orange: "bg-orange-500",
  violet: "bg-violet-500",
  grey: "bg-gray-400",
};
