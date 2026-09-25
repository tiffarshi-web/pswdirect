/**
 * Province scoping — shared (non-React) helpers used by the admin portal and,
 * later, the worker app. A selected province only changes which records are
 * *viewed*; it never changes a province's launch status or a record's province.
 */
import type { ProvinceConfig } from "@/lib/provinceConfig";

/** Legacy records created before multi-province support belong to Ontario. */
export const LEGACY_PROVINCE_CODE = "ON";

export const normalizeProvince = (code?: string | null): string =>
  (code || LEGACY_PROVINCE_CODE).trim().toUpperCase();

/** True when a record (with possibly-missing province) belongs to `selected`. */
export const recordInProvince = (recordProvince: string | null | undefined, selected: string | null) =>
  !selected || normalizeProvince(recordProvince) === selected.toUpperCase();

/**
 * Apply a province filter to a Supabase query builder. For Ontario, rows
 * with no province are included (legacy backfill safety).
 */
export function scopeToProvince<T>(query: T, column: string, selected: string | null): T {
  if (!selected) return query;
  const code = selected.toUpperCase();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const q = query as any;
  return (code === LEGACY_PROVINCE_CODE
    ? q.or(`${column}.eq.${code},${column}.is.null`)
    : q.eq(column, code)) as T;
}

export type ProvinceLaunchLabel = "Live" | "Preparation" | "Paused";

export const provinceLaunchLabel = (p?: Pick<ProvinceConfig, "launchStatus" | "bookingsEnabled" | "isActive"> | null): ProvinceLaunchLabel => {
  if (!p || !p.isActive || p.launchStatus === "paused") return "Paused";
  if (p.launchStatus === "live" && p.bookingsEnabled) return "Live";
  return "Preparation";
};
