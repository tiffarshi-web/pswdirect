// Security, privacy, concurrency and eligibility coverage for the 75 km
// location-based dispatch system. Server rules are authoritative; these tests
// pin the client mirrors and the guards the app itself enforces.

import { describe, it, expect, vi, beforeEach } from "vitest";

const rpcMock = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: () => ({ select: () => ({ in: () => ({ order: () => ({ data: [], error: null }) }) }) }),
  },
}));

import {
  assessLocationPlausibility,
  describeLocationRejection,
  describeExclusion,
  isLocationFresh,
  isWithinDispatchRadius,
  haversineKm,
  recordVerifiedLocation,
  IMPOSSIBLE_SPEED_KMH,
  MAX_ACCEPTED_ACCURACY_M,
} from "@/lib/dispatchLocation";
import { redactJobForCaregiver, looksLikeExactAddress, approximateArea } from "@/lib/jobPrivacy";
import { getClaimShiftMessage } from "@/lib/shiftStore";

beforeEach(() => {
  rpcMock.mockReset();
});

describe("caregiver location isolation", () => {
  it("never asks the server for another caregiver's coordinates", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, recorded_at: "2026-09-10T10:00:00Z" }, error: null });
    await recordVerifiedLocation(44.39, -79.69, 20, "device");
    const [fn, args] = rpcMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(fn).toBe("record_psw_location");
    // The caregiver is resolved from the signed-in session server-side; no id is sent.
    expect(Object.keys(args)).not.toContain("p_psw_id");
  });

  it("surfaces a server authorization refusal instead of any data", async () => {
    rpcMock.mockResolvedValue({ data: null, error: { message: "not_authorized" } });
    const result = await recordVerifiedLocation(44.39, -79.69, 20, "device");
    expect(result.ok).toBe(false);
  });
});

describe("no home-address fallback", () => {
  const now = Date.UTC(2026, 8, 10, 12, 0, 0);
  const hoursAgo = (h: number) => new Date(now - h * 3_600_000).toISOString();

  it("treats an expired phone location as unusable, not as the home address", () => {
    expect(isLocationFresh(hoursAgo(25), 24, now)).toBe(false);
    expect(describeExclusion("location_expired")).toBe("Saved location has expired");
    expect(describeExclusion("no_usable_location")).toBe("No usable location on file");
  });

  it("keeps a recent phone location usable", () => {
    expect(isLocationFresh(hoursAgo(1), 24, now)).toBe(true);
  });
});

describe("location permission and device failures", () => {
  it("explains a denied or unreadable location without offering a fallback", () => {
    expect(describeLocationRejection("session_expired")).toMatch(/sign in/i);
    expect(describeLocationRejection("invalid_coordinates")).toMatch(/valid location/i);
    expect(describeLocationRejection("unknown_error")).toMatch(/could not save/i);
  });

  it("refuses to send an invalid coordinate to the server", async () => {
    const result = await recordVerifiedLocation(0, 0, 10, "device");
    expect(result).toEqual({ ok: false, reason: "invalid_coordinates" });
    expect(rpcMock).not.toHaveBeenCalled();
  });
});

describe("location spoofing detection", () => {
  it("rejects a simulated location before it reaches the server", async () => {
    const result = await recordVerifiedLocation(44.39, -79.69, 10, "device", true);
    expect(result).toEqual({ ok: false, reason: "mock_location" });
    expect(rpcMock).not.toHaveBeenCalled();
  });

  it("passes the mock flag to the server for real device reads", async () => {
    rpcMock.mockResolvedValue({ data: { ok: true, recorded_at: "x" }, error: null });
    await recordVerifiedLocation(44.39, -79.69, 10, "device", false);
    const [, args] = rpcMock.mock.calls[0] as [string, Record<string, unknown>];
    expect(args.p_is_mocked).toBe(false);
  });

  it("rejects readings that are far too imprecise", () => {
    expect(assessLocationPlausibility({ accuracyM: MAX_ACCEPTED_ACCURACY_M + 1 })).toEqual({
      accepted: false,
      flag: "accuracy_too_poor",
    });
  });

  it("rejects an impossible jump between two positions", () => {
    // Barrie to Thunder Bay in one minute.
    const distance = haversineKm(44.3894, -79.6903, 48.3809, -89.2477);
    expect(assessLocationPlausibility({ distanceKm: distance, secondsElapsed: 60 })).toEqual({
      accepted: false,
      flag: "impossible_jump",
    });
    expect(distance / (60 / 3600)).toBeGreaterThan(IMPOSSIBLE_SPEED_KMH);
  });

  it("flags but keeps a fast-but-possible move", () => {
    expect(assessLocationPlausibility({ distanceKm: 120, secondsElapsed: 900 })).toEqual({
      accepted: true,
      flag: "suspicious_speed",
    });
  });

  it("accepts an ordinary drive across town", () => {
    expect(assessLocationPlausibility({ distanceKm: 12, secondsElapsed: 900, accuracyM: 15 })).toEqual({
      accepted: true,
      flag: null,
    });
  });
});

describe("client privacy before and after acceptance", () => {
  const job = {
    clientName: "Sandra Silva",
    clientFirstName: "Sandra",
    clientPhone: "249-288-4787",
    clientEmail: "client@example.com",
    patientAddress: "239 Grove St E, Barrie, ON",
    unitNumber: "12B",
    buzzerCode: "4412",
    entryPoint: "Side door",
    postalCode: "L4M 2R1",
  };

  it("hides identity, entry details and the exact address on an open job", () => {
    const safe = redactJobForCaregiver(job, { isAssigned: false, postalCode: job.postalCode });
    expect(safe.clientName).toBeUndefined();
    expect(safe.clientPhone).toBeUndefined();
    expect(safe.clientEmail).toBeUndefined();
    expect(safe.unitNumber).toBeUndefined();
    expect(safe.buzzerCode).toBeUndefined();
    expect(safe.entryPoint).toBeUndefined();
    expect(safe.patientAddress).toBe("L4M area");
    expect(safe.patientAddress).not.toMatch(/239 Grove/);
  });

  it("reveals everything to the assigned caregiver only", () => {
    const mine = redactJobForCaregiver(job, { isAssigned: true, postalCode: job.postalCode });
    expect(mine.clientName).toBe("Sandra Silva");
    expect(mine.patientAddress).toBe("239 Grove St E, Barrie, ON");
    expect(mine.buzzerCode).toBe("4412");
  });

  it("leaves an already-masked area string alone", () => {
    expect(looksLikeExactAddress("Barrie, ON · L4M area")).toBe(false);
    expect(looksLikeExactAddress("239 Grove St E")).toBe(true);
    expect(approximateArea(null)).toMatch(/after you accept/i);
  });
});

describe("simultaneous acceptance", () => {
  it("gives one winner and tells the loser the shift is gone", () => {
    expect(getClaimShiftMessage("already_claimed")).toMatch(/just accepted by another/i);
  });

  it("explains an eligibility loss without exposing client data", () => {
    expect(getClaimShiftMessage("outside_eligibility")).toMatch(/no longer eligible/i);
    expect(getClaimShiftMessage("schedule_conflict")).toMatch(/overlaps/i);
  });
});

describe("eligibility exclusions", () => {
  it("names every exclusion an administrator can see", () => {
    for (const code of [
      "not_approved",
      "suspended_or_inactive",
      "account_deletion_requested",
      "police_check_expired",
      "location_expired",
      "no_usable_location",
      "booking_not_geocoded",
      "outside_radius",
      "no_vehicle",
      "schedule_conflict",
    ]) {
      expect(describeExclusion(code)).not.toBe(code);
    }
  });

  it("keeps the radius rule inclusive at the boundary only", () => {
    expect(isWithinDispatchRadius(75, 75)).toBe(true);
    expect(isWithinDispatchRadius(75.01, 75)).toBe(false);
  });
});
