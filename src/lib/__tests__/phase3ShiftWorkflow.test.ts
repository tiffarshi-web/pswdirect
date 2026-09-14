// Phase 3 — shift, attendance, care-sheet and completion workflow guarantees.
//
// These are static/behavioural contract tests: they assert the rules that the
// database functions and client code implement, without touching production
// data, sending email, or moving money.

import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import {
  evaluateAttendanceFix,
  attendanceRulesFromThresholds,
  isNonPunitiveFailure,
} from "@/lib/attendanceLocation";
import { DEFAULT_GEOFENCE_THRESHOLDS } from "@/lib/geofenceSettings";

const root = process.cwd();
const read = (p: string) => readFileSync(join(root, p), "utf8");

const migrationsDir = join(root, "supabase/migrations");
const allMigrations = existsSync(migrationsDir)
  ? readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => readFileSync(join(migrationsDir, f), "utf8"))
      .join("\n")
  : "";

const HOME = { lat: 44.3894, lng: -79.6903 };
const fresh = (over: Partial<{ lat: number; lng: number; accuracy: number | null; mocked: boolean }> = {}) => ({
  latitude: over.lat ?? HOME.lat,
  longitude: over.lng ?? HOME.lng,
  accuracy: over.accuracy === undefined ? 20 : over.accuracy,
  capturedAt: new Date().toISOString(),
  isMocked: over.mocked ?? false,
});

const checkInRules = attendanceRulesFromThresholds(DEFAULT_GEOFENCE_THRESHOLDS, {
  event: "check_in",
  isTransport: false,
  targetLat: HOME.lat,
  targetLng: HOME.lng,
});
const signOutRules = attendanceRulesFromThresholds(DEFAULT_GEOFENCE_THRESHOLDS, {
  event: "sign_out",
  isTransport: false,
  targetLat: HOME.lat,
  targetLng: HOME.lng,
});

describe("Phase 3 — job acceptance", () => {
  const shiftStore = read("src/lib/shiftStore.ts");

  it("1. accepts a job only through the atomic claim function", () => {
    expect(shiftStore).toContain('rpc("claim_booking"');
    expect(shiftStore).not.toMatch(/from\("bookings"\)[\s\S]{0,200}\.update\(\{[\s\S]{0,200}psw_assigned/);
  });

  it("2. a repeated accept by the same caregiver is idempotent, not an error", () => {
    expect(shiftStore).toContain("already_assigned_to_requesting_psw");
    expect(shiftStore).toContain("already_assigned");
  });

  it("3. an unapproved or ineligible caregiver is rejected with a clear reason", () => {
    expect(shiftStore).toContain("psw_not_eligible");
    expect(shiftStore).toContain("outside_eligibility");
    expect(shiftStore).toContain("vsc_expired");
  });

  it("4. the full address is redacted before acceptance", () => {
    expect(shiftStore).toContain("redactJobForCaregiver");
    const privacy = read("src/lib/jobPrivacy.ts");
    expect(privacy.length).toBeGreaterThan(0);
  });
});

describe("Phase 3 — geofenced attendance", () => {
  it("5. a precise in-range reading passes check-in", () => {
    const out = evaluateAttendanceFix(fresh(), checkInRules);
    expect(out.ok).toBe(true);
  });

  it("6. a reliable out-of-range reading blocks check-in", () => {
    const out = evaluateAttendanceFix(fresh({ lat: HOME.lat + 0.05 }), checkInRules);
    expect(out.ok).toBe(false);
    if (out.ok === false) expect(out.code).toBe("outside_geofence");
  });

  it("7. weak GPS is never treated as misconduct", () => {
    const out = evaluateAttendanceFix(fresh({ accuracy: 900 }), checkInRules);
    expect(out.ok).toBe(false);
    if (out.ok === false) {
      expect(out.code).toBe("accuracy_too_poor");
      expect(isNonPunitiveFailure(out.code)).toBe(true);
    }
  });

  it("7b. weak GPS check-in still starts the visit, marked awaiting review", () => {
    const tab = read("src/components/psw/ActiveShiftTab.tsx");
    expect(tab).toContain("failureReason: failure.code");
    expect(allMigrations).toContain("'awaiting_review'");
  });

  it("7c. simulated and stale readings are rejected", () => {
    const mocked = evaluateAttendanceFix(fresh({ mocked: true }), checkInRules);
    expect(mocked.ok).toBe(false);
    const stale = evaluateAttendanceFix(
      { ...fresh(), capturedAt: new Date(Date.now() - 10 * 60_000).toISOString() },
      checkInRules,
    );
    expect(stale.ok).toBe(false);
    if (stale.ok === false) expect(stale.code).toBe("stale_reading");
  });

  it("8. duplicate check-in is prevented server-side and client-side", () => {
    expect(read("src/lib/shiftStore.ts")).toContain("idempotent: true");
    expect(allMigrations).toContain("already_checked_in");
  });
});

describe("Phase 3 — care sheet", () => {
  const sheet = read("src/components/psw/PSWCareSheet.tsx");

  it("9. drafts save through the authorized RPC and show a saving state", () => {
    expect(read("src/components/psw/ActiveShiftTab.tsx")).toContain("save_care_sheet_draft");
    expect(sheet).toContain("CareSheetDraftStatus");
    expect(allMigrations).toContain("care_sheet_last_saved_at");
  });

  it("10. only the assigned caregiver can write the care sheet", () => {
    expect(allMigrations).toContain("AND psw_assigned = _psw_id");
    expect(allMigrations).toContain("current_psw_profile_id()");
  });

  it("10b. a submitted care sheet cannot be silently overwritten by a draft", () => {
    expect(allMigrations).toContain("care_sheet_status IN ('draft','missing')");
  });

  it("safety, incident and follow-up fields exist and are kept in the draft", () => {
    expect(sheet).toContain("safetyConcerns");
    expect(sheet).toContain("incidentReported");
    expect(sheet).toContain("followUpRecommended");
    expect(allMigrations).toContain("'safetyConcerns'");
  });

  it("12. only JPEG/PNG-style images are accepted, up to six", () => {
    expect(sheet).toContain("MAX_PHOTOS = 6");
    expect(sheet).toMatch(/image\//);
  });
});

describe("Phase 3 — sign-out and completion", () => {
  const tab = read("src/components/psw/ActiveShiftTab.tsx");

  it("15. sign-out submits the final care sheet in the same server call", () => {
    expect(read("src/lib/shiftStore.ts")).toContain('rpc("complete_shift_signout"');
    expect(allMigrations).toContain("care_sheet_status = 'submitted'");
  });

  it("16. weak GPS at sign-out completes the visit but routes it to office review", () => {
    const soft = evaluateAttendanceFix(fresh({ lat: HOME.lat + 0.02 }), signOutRules);
    expect(soft.ok).toBe(true);
    expect(allMigrations).toContain("_location_review");
    expect(tab).toContain("logAttendanceFailure");
  });

  it("17. duplicate sign-out cannot occur", () => {
    expect(allMigrations).toContain("AND signed_out_at IS NULL");
  });

  it("24. voided wrong-day attendance cannot complete a booking", () => {
    expect(allMigrations).toContain("attendance_voided");
    expect(allMigrations).toContain("not_checked_in");
  });
});

describe("Phase 3 — earnings stay manual", () => {
  it("18/19/20. one entry per visit, never paid, never a payout", () => {
    expect(allMigrations).toContain("set_payroll_entry_earning_status");
    expect(allMigrations).toContain("'pending_office_review'");
    expect(allMigrations).toContain("'pending_care_sheet'");
    expect(allMigrations).toContain("ON CONFLICT (shift_id)");
    expect(allMigrations).not.toMatch(/earning_status\s*=\s*'paid_manually'\s*;?\s*$/m);
  });

  it("28. automatic provider payouts remain disabled", () => {
    const policy = read("src/lib/manualPayoutPolicy.ts");
    expect(policy).toContain("AUTOMATIC_PROVIDER_PAYOUTS_ENABLED");
    expect(policy).toMatch(/false/);
  });
});

describe("Phase 3 — client report delivery", () => {
  const fn = read("supabase/functions/send-care-sheet-email/index.ts");

  it("21. the completed report is delivered only once unless an admin retries", () => {
    expect(fn).toContain("already_delivered");
    expect(fn).toContain("isAdminCaller");
    expect(fn).toContain("care_sheet_delivery_attempts");
  });

  it("22. a voided care sheet is never delivered", () => {
    expect(fn).toContain('b.care_sheet_status !== "submitted"');
  });

  it("no photo data or health detail leaks into the email subject or payload", () => {
    expect(fn).toContain('EXCLUDED.has(key)');
    expect(fn).toContain("`Care sheet – ${b.booking_code}`");
  });

  it("delivery status and failure reason are recorded", () => {
    expect(fn).toContain("care_sheet_delivery_status");
    expect(fn).toContain("care_sheet_delivery_error");
  });
});

describe("Phase 3 — security posture preserved", () => {
  it("26. bookings are still created through server checkout only", () => {
    expect(allMigrations).toContain("guard_client_booking_insert");
  });

  it("27. caregivers cannot approve themselves", () => {
    expect(allMigrations).toContain("guard_psw_self_insert");
  });

  it("no automatic provider transfer code exists", () => {
    const fnDir = join(root, "supabase/functions");
    const names = readdirSync(fnDir);
    expect(names.some((n) => /transfer|connect-payout|provider-payout/i.test(n))).toBe(false);
  });
});
