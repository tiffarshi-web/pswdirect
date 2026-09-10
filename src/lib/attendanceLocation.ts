// Attendance (check-in / check-out) location rules.
//
// IMPORTANT: these rules are deliberately SEPARATE from the dispatch/discovery
// rules in `src/lib/dispatchLocation.ts`. Discovery may tolerate a coarse fix
// (up to 5 km accuracy) and a saved position that is hours old, because it only
// decides which shifts to show. Attendance proves the caregiver is physically at
// the visit, so it always requires a brand-new, precise, non-simulated reading
// and never reuses the saved dispatch location.

import { getShiftLocation } from "@/mobile/native/geolocationService";
import { fetchGeofenceThresholds, type GeofenceThresholds } from "@/lib/geofenceSettings";
import { supabase } from "@/integrations/supabase/client";

/** Strict attendance defaults (admin-tunable through app_settings). */
export const DEFAULT_ATTENDANCE_ACCURACY_M = 150;
export const DEFAULT_ATTENDANCE_MAX_READING_AGE_SECONDS = 90;

export type AttendanceEvent = "check_in" | "sign_out";

export type AttendanceFailureCode =
  | "permission_denied"
  | "gps_unavailable"
  | "timeout"
  | "mock_location"
  | "accuracy_too_poor"
  | "stale_reading"
  | "outside_geofence"
  | "no_reference";

export interface AttendanceFix {
  latitude: number;
  longitude: number;
  accuracy: number | null;
  capturedAt: string;
  isMocked?: boolean;
}

export interface AttendanceRules {
  /** Approved geofence radius in metres for this shift. */
  geofenceRadiusM: number;
  /** Maximum acceptable GPS accuracy for attendance. */
  maxAccuracyM?: number;
  /** Maximum age of the reading itself. */
  maxReadingAgeSeconds?: number;
  targetLat?: number | null;
  targetLng?: number | null;
  /** Block when outside the geofence (true for check-in, false for sign-out). */
  enforceGeofence?: boolean;
  now?: number;
}

export type AttendanceOutcome =
  | {
      ok: true;
      latitude: number;
      longitude: number;
      accuracyM: number | null;
      distanceM: number | null;
      outsideGeofence: boolean;
      thresholdM: number;
    }
  | {
      ok: false;
      code: AttendanceFailureCode;
      accuracyM?: number | null;
      distanceM?: number | null;
      thresholdM?: number;
    };

const R = 6371000;
const toRad = (v: number) => (v * Math.PI) / 180;

export const metresApart = (
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number,
): number => {
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.min(1, Math.sqrt(h))));
};

/** Pure attendance rule engine — the single source of truth for the checks. */
export const evaluateAttendanceFix = (
  fix: AttendanceFix,
  rules: AttendanceRules,
): AttendanceOutcome => {
  const maxAccuracy = rules.maxAccuracyM ?? DEFAULT_ATTENDANCE_ACCURACY_M;
  const maxAge = rules.maxReadingAgeSeconds ?? DEFAULT_ATTENDANCE_MAX_READING_AGE_SECONDS;
  const now = rules.now ?? Date.now();

  if (fix.isMocked) return { ok: false, code: "mock_location" };

  if (!Number.isFinite(fix.latitude) || !Number.isFinite(fix.longitude)) {
    return { ok: false, code: "gps_unavailable" };
  }

  if (fix.accuracy == null || !Number.isFinite(fix.accuracy) || fix.accuracy > maxAccuracy) {
    return { ok: false, code: "accuracy_too_poor", accuracyM: fix.accuracy ?? null, thresholdM: maxAccuracy };
  }

  const capturedMs = Date.parse(fix.capturedAt);
  if (!Number.isFinite(capturedMs) || (now - capturedMs) / 1000 > maxAge) {
    return { ok: false, code: "stale_reading", accuracyM: fix.accuracy };
  }

  const hasTarget =
    typeof rules.targetLat === "number" &&
    typeof rules.targetLng === "number" &&
    Number.isFinite(rules.targetLat) &&
    Number.isFinite(rules.targetLng);

  if (!hasTarget) {
    return {
      ok: true,
      latitude: fix.latitude,
      longitude: fix.longitude,
      accuracyM: fix.accuracy,
      distanceM: null,
      outsideGeofence: false,
      thresholdM: rules.geofenceRadiusM,
    };
  }

  const distanceM = metresApart(
    fix.latitude,
    fix.longitude,
    rules.targetLat as number,
    rules.targetLng as number,
  );
  const outsideGeofence = distanceM > rules.geofenceRadiusM;

  if (outsideGeofence && rules.enforceGeofence !== false) {
    return {
      ok: false,
      code: "outside_geofence",
      distanceM,
      accuracyM: fix.accuracy,
      thresholdM: rules.geofenceRadiusM,
    };
  }

  return {
    ok: true,
    latitude: fix.latitude,
    longitude: fix.longitude,
    accuracyM: fix.accuracy,
    distanceM,
    outsideGeofence,
    thresholdM: rules.geofenceRadiusM,
  };
};

/**
 * Take a brand-new reading and apply the attendance rules.
 * A saved dispatch location is never used here.
 */
export const captureAttendanceLocation = async (
  rules: AttendanceRules,
): Promise<AttendanceOutcome> => {
  const result = await getShiftLocation();
  if (result.status !== "ok") {
    const code: AttendanceFailureCode =
      result.status === "denied"
        ? "permission_denied"
        : result.status === "timeout"
          ? "timeout"
          : "gps_unavailable";
    return { ok: false, code };
  }
  return evaluateAttendanceFix(
    {
      latitude: result.fix.latitude,
      longitude: result.fix.longitude,
      accuracy: result.fix.accuracy,
      capturedAt: result.fix.capturedAt,
      isMocked: result.fix.isMocked === true,
    },
    rules,
  );
};

/** Plain, non-punitive wording. Poor GPS is never treated as misconduct. */
export const ATTENDANCE_FAILURE_MESSAGES: Record<AttendanceFailureCode, string> = {
  permission_denied:
    "Location is turned off. Turn it on in your phone settings, then tap Retry. If it still won't work, call 24/7 support.",
  gps_unavailable:
    "We couldn't read your location. Step outdoors or near a window and tap Retry, or call 24/7 support.",
  timeout:
    "Your phone took too long to find a location. Wait a moment and tap Retry, or call 24/7 support.",
  mock_location:
    "Your phone is reporting a simulated location. Turn off any location-changing app, then tap Retry.",
  accuracy_too_poor:
    "Your GPS signal isn't accurate enough right now. This is not a problem with your account — step outdoors, wait a few seconds and tap Retry, or call 24/7 support to be signed in manually.",
  stale_reading:
    "That location reading was out of date. Tap Retry to take a fresh one.",
  outside_geofence:
    "You appear to be too far from the visit address to sign in. Move closer and tap Retry, or call 24/7 support.",
  no_reference:
    "We don't have a verified address for this shift yet. Call 24/7 support to be signed in manually.",
};

export const describeAttendanceFailure = (code: AttendanceFailureCode | null | undefined): string =>
  (code && ATTENDANCE_FAILURE_MESSAGES[code]) ||
  "We couldn't confirm your location. Tap Retry, or call 24/7 support.";

/** Failure codes caused by conditions outside the caregiver's control. */
export const isNonPunitiveFailure = (code: AttendanceFailureCode): boolean =>
  code === "accuracy_too_poor" ||
  code === "gps_unavailable" ||
  code === "timeout" ||
  code === "stale_reading" ||
  code === "no_reference";

/** Round to ~1 km so logs never carry an exact caregiver position. */
const approx = (v: number | null | undefined): number | null =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v * 100) / 100 : null;

export interface AttendanceFailureLog {
  event: AttendanceEvent;
  code: AttendanceFailureCode;
  approx_lat: number | null;
  approx_lng: number | null;
  accuracy_m: number | null;
  distance_m: number | null;
  threshold_m: number | null;
}

/**
 * Build a privacy-safe log record: no client name, address, phone or notes, and
 * only approximate caregiver coordinates.
 */
export const buildAttendanceFailureLog = (input: {
  event: AttendanceEvent;
  code: AttendanceFailureCode;
  latitude?: number | null;
  longitude?: number | null;
  accuracyM?: number | null;
  distanceM?: number | null;
  thresholdM?: number | null;
}): AttendanceFailureLog => ({
  event: input.event,
  code: input.code,
  approx_lat: approx(input.latitude),
  approx_lng: approx(input.longitude),
  accuracy_m: input.accuracyM ?? null,
  distance_m: input.distanceM ?? null,
  threshold_m: input.thresholdM ?? null,
});

/** Persist a privacy-safe attendance failure for the office to review. */
export const logAttendanceFailure = async (
  bookingId: string | null | undefined,
  pswId: string | null | undefined,
  payload: AttendanceFailureLog,
): Promise<void> => {
  try {
    await (supabase as any).from("admin_override_requests").insert({
      booking_id: bookingId ?? null,
      psw_id: pswId ?? null,
      request_type: payload.event,
      failure_code: payload.code,
      reason: `Attendance location check failed: ${payload.code}`,
      distance_m: payload.distance_m,
      threshold_m: payload.threshold_m,
      accuracy_m: payload.accuracy_m,
      psw_lat: payload.approx_lat,
      psw_lng: payload.approx_lng,
    });
  } catch {
    // Never block attendance because logging failed.
  }
};

export const attendanceRulesFromThresholds = (
  thresholds: GeofenceThresholds,
  opts: { event: AttendanceEvent; isTransport: boolean; targetLat?: number | null; targetLng?: number | null },
): AttendanceRules => ({
  geofenceRadiusM:
    opts.event === "sign_out"
      ? thresholds.signoutRadiusM
      : opts.isTransport
        ? thresholds.transportCheckinRadiusM
        : thresholds.checkinRadiusM,
  maxAccuracyM: thresholds.attendanceAccuracyMaxM,
  maxReadingAgeSeconds: thresholds.attendanceMaxReadingAgeSeconds,
  targetLat: opts.targetLat ?? null,
  targetLng: opts.targetLng ?? null,
  enforceGeofence: opts.event === "check_in",
});

export const fetchAttendanceThresholds = fetchGeofenceThresholds;
