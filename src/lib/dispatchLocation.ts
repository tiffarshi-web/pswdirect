// Location-based shift matching — shared client helpers.
//
// The server is authoritative: distance, radius and eligibility are computed in
// public.psw_eligible_booking_ids / public.psw_dispatch_location. Everything in
// this file exists to mirror those rules for display, to refresh the caregiver's
// verified position, and to keep the admin dispatch map honest.

import { supabase } from "@/integrations/supabase/client";

export const DEFAULT_DISPATCH_RADIUS_KM = 75;
export const DEFAULT_LOCATION_MAX_AGE_HOURS = 24;

export interface DispatchLocationSettings {
  /** Administrator-controlled matching radius (app_settings.active_service_radius). */
  radiusKm: number;
  /** Administrator-controlled trust window for a saved location, in hours. */
  maxAgeHours: number;
}

export const DEFAULT_DISPATCH_LOCATION_SETTINGS: DispatchLocationSettings = {
  radiusKm: DEFAULT_DISPATCH_RADIUS_KM,
  maxAgeHours: DEFAULT_LOCATION_MAX_AGE_HOURS,
};

const toPositiveNumber = (value: unknown, fallback: number): number => {
  const n = typeof value === "string" ? parseFloat(value) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

let cachedSettings: DispatchLocationSettings | null = null;
let cachedAt = 0;
const SETTINGS_TTL_MS = 60_000;

export const fetchDispatchLocationSettings = async (): Promise<DispatchLocationSettings> => {
  if (cachedSettings && Date.now() - cachedAt < SETTINGS_TTL_MS) return cachedSettings;
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["active_service_radius", "location_max_age_hours"]);
    if (error) throw error;
    const map = new Map((data || []).map((row: any) => [row.setting_key, row.setting_value]));
    cachedSettings = {
      radiusKm: toPositiveNumber(map.get("active_service_radius"), DEFAULT_DISPATCH_RADIUS_KM),
      maxAgeHours: toPositiveNumber(map.get("location_max_age_hours"), DEFAULT_LOCATION_MAX_AGE_HOURS),
    };
    cachedAt = Date.now();
    return cachedSettings;
  } catch (e) {
    console.warn("fetchDispatchLocationSettings failed, using defaults:", e);
    return cachedSettings ?? DEFAULT_DISPATCH_LOCATION_SETTINGS;
  }
};

/** Straight-line distance in kilometres (same formula the server uses). */
export const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Inclusive: a caregiver exactly on the boundary is inside the radius. */
export const isWithinDispatchRadius = (distanceKm: number, radiusKm: number): boolean =>
  Number.isFinite(distanceKm) && distanceKm <= radiusKm;

export const isValidCoordinate = (lat: unknown, lng: unknown): boolean => {
  const la = Number(lat);
  const ln = Number(lng);
  if (!Number.isFinite(la) || !Number.isFinite(ln)) return false;
  if (la < -90 || la > 90 || ln < -180 || ln > 180) return false;
  if (la === 0 && ln === 0) return false;
  return true;
};

export const locationAgeHours = (recordedAt: string | Date | null | undefined, now: number = Date.now()): number | null => {
  if (!recordedAt) return null;
  const t = recordedAt instanceof Date ? recordedAt.getTime() : Date.parse(recordedAt);
  if (!Number.isFinite(t)) return null;
  return (now - t) / 3_600_000;
};

/** A saved position is trusted for shift discovery only inside the configured window. */
export const isLocationFresh = (
  recordedAt: string | Date | null | undefined,
  maxAgeHours: number = DEFAULT_LOCATION_MAX_AGE_HOURS,
  now: number = Date.now(),
): boolean => {
  const age = locationAgeHours(recordedAt, now);
  if (age === null) return false;
  return age >= 0 && age <= maxAgeHours;
};

export const formatLocationAge = (ageHours: number | null | undefined): string => {
  if (ageHours === null || ageHours === undefined || !Number.isFinite(ageHours)) return "no location";
  if (ageHours < 1) return `${Math.max(1, Math.round(ageHours * 60))} min ago`;
  if (ageHours < 48) return `${Math.round(ageHours)} h ago`;
  return `${Math.round(ageHours / 24)} d ago`;
};

/** Human wording for the admin dispatch map. */
export const EXCLUSION_LABELS: Record<string, string> = {
  not_approved: "Application not approved",
  suspended_or_inactive: "Suspended or inactive",
  account_deletion_requested: "Account deletion requested",
  police_check_expired: "Police check expired",
  no_usable_location: "No usable location on file",
  booking_not_geocoded: "Order address not geocoded",
  outside_radius: "Outside the dispatch radius",
  no_vehicle: "No vehicle for a transport shift",
  schedule_conflict: "Already booked at this time",
  other_matching_rule: "Excluded by another matching rule",
};

export const describeExclusion = (reason: string | null | undefined): string =>
  reason ? EXCLUSION_LABELS[reason] ?? reason : "Eligible";

export type RecordLocationResult =
  | { ok: true; recordedAt: string }
  | { ok: false; reason: string };

/**
 * Send the caregiver's current position to the server. The server resolves the
 * caregiver from the signed-in session, so coordinates can never be attributed
 * to someone else and eligibility can never be spoofed from the app.
 */
export const recordVerifiedLocation = async (
  latitude: number,
  longitude: number,
  accuracyM?: number | null,
  source: string = "device",
): Promise<RecordLocationResult> => {
  if (!isValidCoordinate(latitude, longitude)) {
    return { ok: false, reason: "invalid_coordinates" };
  }
  try {
    const { data, error } = await supabase.rpc("record_psw_location" as any, {
      p_lat: latitude,
      p_lng: longitude,
      p_accuracy_m: accuracyM ?? null,
      p_source: source,
    });
    if (error) return { ok: false, reason: error.message };
    const result = data as { ok?: boolean; reason?: string; recorded_at?: string } | null;
    if (!result?.ok) return { ok: false, reason: result?.reason || "unknown_error" };
    return { ok: true, recordedAt: result.recorded_at || new Date().toISOString() };
  } catch (e: any) {
    return { ok: false, reason: e?.message || "unknown_error" };
  }
};
