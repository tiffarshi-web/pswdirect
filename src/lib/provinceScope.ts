/**
 * Province scoping — shared (non-React) helpers used by the admin portal and,
 * later, the worker app. A selected province only changes which records are
 * *viewed*; it never changes a province's launch status or a record's province.
 */
import type { ProvinceConfig } from "@/lib/provinceConfig";

/** Default province for the admin selector. Not used to guess a record's province. */
export const LEGACY_PROVINCE_CODE = "ON";

export const normalizeProvince = (code?: string | null): string | null =>
  code ? code.trim().toUpperCase() : null;

/**
 * True when a record belongs to `selected`. A record with a missing province
 * is never silently treated as Ontario — it matches no specific province.
 */
export const recordInProvince = (recordProvince: string | null | undefined, selected: string | null) =>
  !selected || normalizeProvince(recordProvince) === selected.toUpperCase();

/**
 * Apply a strict province filter to a Supabase query builder. Rows with no
 * province are excluded from every specific province (all existing bookings,
 * payroll entries and caregivers carry a verified province).
 */
export function scopeToProvince<T>(query: T, column: string, selected: string | null): T {
  if (!selected) return query;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (query as any).eq(column, selected.toUpperCase()) as T;
}

export type ProvinceLaunchLabel = "Live" | "Preparation" | "Paused";

export const provinceLaunchLabel = (p?: Pick<ProvinceConfig, "launchStatus" | "bookingsEnabled" | "isActive"> | null): ProvinceLaunchLabel => {
  if (!p || !p.isActive || p.launchStatus === "paused") return "Paused";
  if (p.launchStatus === "live" && p.bookingsEnabled) return "Live";
  return "Preparation";
};
