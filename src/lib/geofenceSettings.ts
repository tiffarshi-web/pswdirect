// Geofence threshold settings, fetched from app_settings.
// Phase 1: makes the previously hard-coded radii tunable without a deploy.

import { supabase } from "@/integrations/supabase/client";

export interface GeofenceThresholds {
  checkinRadiusM: number;          // home-care check-in (default 1000)
  transportCheckinRadiusM: number; // transport pick-up check-in (default 500)
  signoutRadiusM: number;          // sign-out soft radius (default 2000)
}

export const DEFAULT_GEOFENCE_THRESHOLDS: GeofenceThresholds = {
  checkinRadiusM: 1000,
  transportCheckinRadiusM: 500,
  signoutRadiusM: 2000,
};

const KEYS = [
  "checkin_radius_m",
  "transport_checkin_radius_m",
  "signout_radius_m",
] as const;

let cached: GeofenceThresholds | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

const toNum = (v: unknown, fallback: number): number => {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const fetchGeofenceThresholds = async (): Promise<GeofenceThresholds> => {
  if (cached && Date.now() - cachedAt < TTL_MS) return cached;
  try {
    const { data, error } = await supabase
      .from("app_settings")
      .select("setting_key, setting_value")
      .in("setting_key", KEYS as unknown as string[]);
    if (error) throw error;
    const map = new Map((data || []).map((r: any) => [r.setting_key, r.setting_value]));
    const result: GeofenceThresholds = {
      checkinRadiusM: toNum(map.get("checkin_radius_m"), DEFAULT_GEOFENCE_THRESHOLDS.checkinRadiusM),
      transportCheckinRadiusM: toNum(
        map.get("transport_checkin_radius_m"),
        DEFAULT_GEOFENCE_THRESHOLDS.transportCheckinRadiusM,
      ),
      signoutRadiusM: toNum(map.get("signout_radius_m"), DEFAULT_GEOFENCE_THRESHOLDS.signoutRadiusM),
    };
    cached = result;
    cachedAt = Date.now();
    return result;
  } catch (e) {
    console.warn("fetchGeofenceThresholds failed, using defaults:", e);
    return cached ?? DEFAULT_GEOFENCE_THRESHOLDS;
  }
};

export const getCachedGeofenceThresholds = (): GeofenceThresholds =>
  cached ?? DEFAULT_GEOFENCE_THRESHOLDS;

// Log a PSW request for admin override when GPS sign-in/out fails.
export interface OverrideRequestInput {
  bookingId?: string | null;
  pswId?: string | null;
  requestType: "check_in" | "sign_out";
  reason?: string;
  failureCode?: string;
  distanceM?: number | null;
  thresholdM?: number | null;
  accuracyM?: number | null;
  pswLat?: number | null;
  pswLng?: number | null;
}

export const requestAdminOverride = async (
  input: OverrideRequestInput,
): Promise<{ ok: boolean; error?: string }> => {
  try {
    const { error } = await supabase.from("admin_override_requests" as any).insert({
      booking_id: input.bookingId ?? null,
      psw_id: input.pswId ?? null,
      request_type: input.requestType,
      reason: input.reason ?? null,
      failure_code: input.failureCode ?? null,
      distance_m: input.distanceM ?? null,
      threshold_m: input.thresholdM ?? null,
      accuracy_m: input.accuracyM ?? null,
      psw_lat: input.pswLat ?? null,
      psw_lng: input.pswLng ?? null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Unknown error" };
  }
};
