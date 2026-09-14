// Security-pass coverage: pins the database hardening applied before Phase 3.
// These tests read the committed migrations so the protections cannot be
// silently dropped by a later change.

import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_DIR = join(process.cwd(), "supabase", "migrations");

const allMigrations = readdirSync(MIGRATION_DIR)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => readFileSync(join(MIGRATION_DIR, f), "utf8"))
  .join("\n");

describe("anonymous visitors cannot call administrative database functions", () => {
  it("revokes execute from anon on SECURITY DEFINER functions", () => {
    expect(allMigrations).toMatch(/REVOKE ALL ON FUNCTION public\.%I\(%s\) FROM PUBLIC, anon/);
  });

  it("keeps only a small allowlist callable while signed out", () => {
    const match = allMigrations.match(/keep_anon text\[\] := ARRAY\[([\s\S]*?)\];/);
    expect(match).toBeTruthy();
    const allow = match![1];
    expect(allow).toContain("is_admin");
    expect(allow).not.toContain("admin_approve_payout");
    expect(allow).not.toContain("admin_correct_wrong_day_attendance");
    expect(allow).not.toContain("psw_save_care_sheet");
  });

  it("locks internal and scheduled-job helpers to the server role", () => {
    expect(allMigrations).toContain("'_invoke_edge_function'");
    expect(allMigrations).toContain("'delete_psw_cascade'");
    expect(allMigrations).toMatch(/GRANT EXECUTE ON FUNCTION public\.%I\(%s\) TO service_role/);
  });
});

describe("clients cannot fabricate or tamper with bookings", () => {
  it("blocks direct client-side booking inserts", () => {
    expect(allMigrations).toContain("guard_client_booking_insert");
    expect(allMigrations).toContain(
      "Bookings must be created through the secure server checkout",
    );
  });

  it("keeps the existing column guard on booking updates", () => {
    expect(allMigrations).toContain("enforce_booking_column_permissions");
    expect(allMigrations).toContain("guard_client_booking_update");
  });
});

describe("caregivers cannot approve themselves", () => {
  it("forces admin-controlled fields to pending on self sign-up", () => {
    const fn = allMigrations.slice(allMigrations.indexOf("guard_psw_self_insert"));
    expect(fn).toContain("NEW.vetting_status   := 'pending'");
    expect(fn).toContain("NEW.approved_at      := NULL");
    expect(fn).toContain("NEW.banned_at        := NULL");
    expect(fn).toContain("NEW.psw_number       := NULL");
  });

  it("still guards admin fields on caregiver self-updates", () => {
    expect(allMigrations).toContain("guard_psw_self_update");
  });
});

describe("audit trails stay immutable", () => {
  it("keeps the earnings audit immutable", () => {
    expect(allMigrations).toContain("block_earning_audit_mutation");
  });

  it("keeps the wrong-day correction audit immutable", () => {
    expect(allMigrations).toContain("block_wrong_day_mutation");
  });
});

describe("Phase 1 manual payout protections remain", () => {
  it("keeps automatic provider payouts disabled server-side", () => {
    expect(allMigrations).toContain("automatic_provider_payouts_enabled");
    expect(allMigrations).toContain("AUTOMATIC_PROVIDER_PAYOUTS_ENABLED");
  });

  it("never introduces an automatic provider transfer path", () => {
    expect(allMigrations).not.toMatch(/stripe\s+connect\s+transfer/i);
  });
});

describe("private storage", () => {
  it("stores caregiver documents in a private bucket", () => {
    expect(allMigrations).toMatch(/psw-documents/);
    expect(allMigrations).not.toMatch(/psw-documents'\s*,\s*true/);
  });
});
