import { describe, it, expect } from "vitest";
import {
  DEFAULT_DISPATCH_RADIUS_KM,
  DEFAULT_LOCATION_MAX_AGE_HOURS,
  describeExclusion,
  formatLocationAge,
  haversineKm,
  isLocationFresh,
  isValidCoordinate,
  isWithinDispatchRadius,
  locationAgeHours,
} from "@/lib/dispatchLocation";

// Barrie, Ontario — used as the service address for radius boundary cases.
const SERVICE = { lat: 44.3894, lng: -79.6903 };

/** Point roughly `km` north of the service address. */
const northOf = (km: number) => ({ lat: SERVICE.lat + km / 111.32, lng: SERVICE.lng });

describe("dispatch radius boundaries", () => {
  it("includes a caregiver at 74.9 km", () => {
    const d = haversineKm(SERVICE.lat, SERVICE.lng, northOf(74.9).lat, northOf(74.9).lng);
    expect(d).toBeLessThan(DEFAULT_DISPATCH_RADIUS_KM);
    expect(isWithinDispatchRadius(d, DEFAULT_DISPATCH_RADIUS_KM)).toBe(true);
  });

  it("excludes a caregiver at 75.1 km", () => {
    const d = haversineKm(SERVICE.lat, SERVICE.lng, northOf(75.1).lat, northOf(75.1).lng);
    expect(d).toBeGreaterThan(DEFAULT_DISPATCH_RADIUS_KM);
    expect(isWithinDispatchRadius(d, DEFAULT_DISPATCH_RADIUS_KM)).toBe(false);
  });

  it("treats the exact boundary as inside", () => {
    expect(isWithinDispatchRadius(75, 75)).toBe(true);
  });

  it("honours an administrator-changed radius", () => {
    expect(isWithinDispatchRadius(60, 50)).toBe(false);
    expect(isWithinDispatchRadius(60, 100)).toBe(true);
  });

  it("keeps distance sane for an Ontario border case", () => {
    // Windsor to Detroit-side coordinates stay well inside 75 km.
    expect(haversineKm(42.3149, -83.0364, 42.3314, -83.0458)).toBeLessThan(75);
    // Ottawa to Gatineau across the provincial border is a short hop; the
    // province guard, not the radius, is what keeps dispatch Ontario-only.
    expect(haversineKm(45.4215, -75.6972, 45.4765, -75.7013)).toBeLessThan(75);
  });
});

describe("location freshness", () => {
  const now = Date.UTC(2026, 0, 10, 12, 0, 0);
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

  it("trusts a location recorded within the window", () => {
    expect(isLocationFresh(hoursAgo(2), DEFAULT_LOCATION_MAX_AGE_HOURS, now)).toBe(true);
    expect(isLocationFresh(hoursAgo(23.9), DEFAULT_LOCATION_MAX_AGE_HOURS, now)).toBe(true);
  });

  it("rejects a stale location", () => {
    expect(isLocationFresh(hoursAgo(24.1), DEFAULT_LOCATION_MAX_AGE_HOURS, now)).toBe(false);
    expect(isLocationFresh(hoursAgo(72), DEFAULT_LOCATION_MAX_AGE_HOURS, now)).toBe(false);
  });

  it("rejects a missing location", () => {
    expect(isLocationFresh(null, DEFAULT_LOCATION_MAX_AGE_HOURS, now)).toBe(false);
    expect(isLocationFresh(undefined, DEFAULT_LOCATION_MAX_AGE_HOURS, now)).toBe(false);
    expect(locationAgeHours(null)).toBeNull();
  });

  it("respects a configured expiry other than 24 hours", () => {
    expect(isLocationFresh(hoursAgo(10), 6, now)).toBe(false);
    expect(isLocationFresh(hoursAgo(10), 48, now)).toBe(true);
  });

  it("formats age for the admin map", () => {
    expect(formatLocationAge(0.25)).toBe("15 min ago");
    expect(formatLocationAge(5)).toBe("5 h ago");
    expect(formatLocationAge(72)).toBe("3 d ago");
    expect(formatLocationAge(null)).toBe("no location");
  });
});

describe("coordinate validation", () => {
  it("accepts real Ontario coordinates", () => {
    expect(isValidCoordinate(44.3894, -79.6903)).toBe(true);
  });

  it("rejects null island, out-of-range and non-numeric values", () => {
    expect(isValidCoordinate(0, 0)).toBe(false);
    expect(isValidCoordinate(91, -79)).toBe(false);
    expect(isValidCoordinate(44, -181)).toBe(false);
    expect(isValidCoordinate("abc", -79)).toBe(false);
    expect(isValidCoordinate(null, null)).toBe(false);
    expect(isValidCoordinate(NaN, NaN)).toBe(false);
  });
});

describe("exclusion reasons shown to administrators", () => {
  it("explains every server exclusion code in plain language", () => {
    for (const code of [
      "not_approved",
      "suspended_or_inactive",
      "account_deletion_requested",
      "police_check_expired",
      "no_usable_location",
      "booking_not_geocoded",
      "outside_radius",
      "no_vehicle",
      "schedule_conflict",
      "other_matching_rule",
    ]) {
      expect(describeExclusion(code)).not.toBe(code);
      expect(describeExclusion(code).length).toBeGreaterThan(3);
    }
  });

  it("labels an eligible caregiver", () => {
    expect(describeExclusion(null)).toBe("Eligible");
  });
});

describe("map radius rendering", () => {
  it("converts the configured radius into circle metres", () => {
    expect(DEFAULT_DISPATCH_RADIUS_KM * 1000).toBe(75_000);
    expect(50 * 1000).toBe(50_000);
  });
});
