import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: async () => ({ error: null }) }) },
}));

const getShiftLocation = vi.fn();
vi.mock("@/mobile/native/geolocationService", () => ({
  getShiftLocation: (...args: unknown[]) => getShiftLocation(...args),
}));

import {
  evaluateAttendanceFix,
  captureAttendanceLocation,
  buildAttendanceFailureLog,
  isNonPunitiveFailure,
  describeAttendanceFailure,
  attendanceRulesFromThresholds,
  DEFAULT_ATTENDANCE_ACCURACY_M,
  DEFAULT_ATTENDANCE_MAX_READING_AGE_SECONDS,
  type AttendanceRules,
} from "@/lib/attendanceLocation";
import { DEFAULT_GEOFENCE_THRESHOLDS } from "@/lib/geofenceSettings";
import { MAX_ACCEPTED_ACCURACY_M } from "@/lib/dispatchLocation";

const NOW = Date.parse("2026-09-10T12:00:00.000Z");
const client = { lat: 44.3894, lng: -79.6903 }; // Barrie, ON

const rules = (over: Partial<AttendanceRules> = {}): AttendanceRules => ({
  geofenceRadiusM: 1000,
  targetLat: client.lat,
  targetLng: client.lng,
  enforceGeofence: true,
  now: NOW,
  ...over,
});

const fix = (over: Partial<Parameters<typeof evaluateAttendanceFix>[0]> = {}) => ({
  latitude: client.lat,
  longitude: client.lng,
  accuracy: 20,
  capturedAt: new Date(NOW - 5000).toISOString(),
  ...over,
});

describe("attendance accuracy is separate from discovery accuracy", () => {
  it("is far stricter than the dispatch/discovery accuracy ceiling", () => {
    expect(DEFAULT_ATTENDANCE_ACCURACY_M).toBeLessThan(MAX_ACCEPTED_ACCURACY_M);
    expect(DEFAULT_GEOFENCE_THRESHOLDS.attendanceAccuracyMaxM).toBe(DEFAULT_ATTENDANCE_ACCURACY_M);
  });

  it("keeps the attendance reading age far shorter than the 24h dispatch freshness", () => {
    expect(DEFAULT_ATTENDANCE_MAX_READING_AGE_SECONDS).toBeLessThanOrEqual(300);
  });

  it("derives check-in and sign-out radii from the approved geofence settings", () => {
    const checkIn = attendanceRulesFromThresholds(DEFAULT_GEOFENCE_THRESHOLDS, {
      event: "check_in",
      isTransport: false,
    });
    const transport = attendanceRulesFromThresholds(DEFAULT_GEOFENCE_THRESHOLDS, {
      event: "check_in",
      isTransport: true,
    });
    const signOut = attendanceRulesFromThresholds(DEFAULT_GEOFENCE_THRESHOLDS, {
      event: "sign_out",
      isTransport: false,
    });
    expect(DEFAULT_GEOFENCE_THRESHOLDS.checkinRadiusM).toBe(200);
    expect(DEFAULT_GEOFENCE_THRESHOLDS.transportCheckinRadiusM).toBe(500);
    expect(DEFAULT_GEOFENCE_THRESHOLDS.attendanceAccuracyMaxM).toBe(150);
    expect(DEFAULT_GEOFENCE_THRESHOLDS.attendanceMaxReadingAgeSeconds).toBe(90);
    expect(checkIn.geofenceRadiusM).toBe(DEFAULT_GEOFENCE_THRESHOLDS.checkinRadiusM);
    expect(transport.geofenceRadiusM).toBe(DEFAULT_GEOFENCE_THRESHOLDS.transportCheckinRadiusM);
    expect(signOut.geofenceRadiusM).toBe(DEFAULT_GEOFENCE_THRESHOLDS.signoutRadiusM);
    expect(checkIn.enforceGeofence).toBe(true);
    expect(signOut.enforceGeofence).toBe(false);
  });
});

describe("attendance rule engine", () => {
  it("accepts a fresh, precise reading inside the geofence", () => {
    const out = evaluateAttendanceFix(fix(), rules());
    expect(out.ok).toBe(true);
    if (out.ok) {
      expect(out.outsideGeofence).toBe(false);
      expect(out.distanceM).toBeLessThan(50);
    }
  });

  it("rejects poor accuracy that discovery would have accepted", () => {
    const out = evaluateAttendanceFix(fix({ accuracy: 3000 }), rules());
    expect(out).toMatchObject({ ok: false, code: "accuracy_too_poor" });
  });

  it("rejects a stale reading", () => {
    const out = evaluateAttendanceFix(
      fix({ capturedAt: new Date(NOW - 10 * 60 * 1000).toISOString() }),
      rules(),
    );
    expect(out).toMatchObject({ ok: false, code: "stale_reading" });
  });

  it("rejects a simulated/mock location", () => {
    const out = evaluateAttendanceFix(fix({ isMocked: true }), rules());
    expect(out).toMatchObject({ ok: false, code: "mock_location" });
  });

  it("rejects a check-in outside the approved geofence", () => {
    const out = evaluateAttendanceFix(fix({ latitude: 43.6532, longitude: -79.3832 }), rules());
    expect(out).toMatchObject({ ok: false, code: "outside_geofence" });
  });

  it("flags but does not block a sign-out outside the geofence", () => {
    const out = evaluateAttendanceFix(
      fix({ latitude: 43.6532, longitude: -79.3832 }),
      rules({ enforceGeofence: false }),
    );
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.outsideGeofence).toBe(true);
  });

  it("accepts a checkout reading taken at the visit address", () => {
    const out = evaluateAttendanceFix(fix(), rules({ enforceGeofence: false, geofenceRadiusM: 2000 }));
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.outsideGeofence).toBe(false);
  });
});

describe("attendance capture never reuses a saved dispatch location", () => {
  beforeEach(() => getShiftLocation.mockReset());

  it("always requests a new phone reading", async () => {
    getShiftLocation.mockResolvedValue({
      status: "ok",
      fix: { ...fix(), capturedAt: new Date(NOW - 1000).toISOString(), isMocked: false },
    });
    const out = await captureAttendanceLocation(rules());
    expect(getShiftLocation).toHaveBeenCalledTimes(1);
    expect(out.ok).toBe(true);
  });

  it("reports denied location permission", async () => {
    getShiftLocation.mockResolvedValue({ status: "denied", message: "off" });
    const out = await captureAttendanceLocation(rules());
    expect(out).toMatchObject({ ok: false, code: "permission_denied" });
  });

  it("reports a GPS timeout", async () => {
    getShiftLocation.mockResolvedValue({ status: "timeout", message: "slow" });
    const out = await captureAttendanceLocation(rules());
    expect(out).toMatchObject({ ok: false, code: "timeout" });
  });
});

describe("failure handling stays non-punitive and privacy safe", () => {
  it("treats poor GPS as a retryable condition, not misconduct", () => {
    expect(isNonPunitiveFailure("accuracy_too_poor")).toBe(true);
    expect(isNonPunitiveFailure("gps_unavailable")).toBe(true);
    const message = describeAttendanceFailure("accuracy_too_poor");
    expect(message).toMatch(/Retry/i);
    expect(message).toMatch(/support/i);
    expect(message).not.toMatch(/suspend|terminate|penalt/i);
  });

  it("logs only approximate coordinates and no client information", () => {
    const log = buildAttendanceFailureLog({
      event: "check_in",
      code: "outside_geofence",
      latitude: 44.389412345,
      longitude: -79.690312345,
      accuracyM: 40,
      distanceM: 5200,
      thresholdM: 1000,
    });
    expect(log.approx_lat).toBe(44.39);
    expect(log.approx_lng).toBe(-79.69);
    expect(JSON.stringify(log)).not.toMatch(/address|client|patient|phone|email/i);
  });
});
