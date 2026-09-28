import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260928092000_block_wrong_date_checkin.sql"),
  "utf8",
);
const shiftStore = readFileSync(resolve(process.cwd(), "src/lib/shiftStore.ts"), "utf8");

describe("provider check-in date lock", () => {
  it("compares against the province-local calendar date", () => {
    expect(migration).toContain("FROM public.provinces p");
    expect(migration).toContain("now() AT TIME ZONE v_timezone");
    expect(migration).toContain("v_service_date IS DISTINCT FROM v_row.scheduled_date");
  });

  it("keeps the final update protected against a date race", () => {
    expect(migration).toContain("AND scheduled_date = v_service_date");
    expect(migration).toContain("'error', 'wrong_service_date'");
  });

  it("preserves idempotent retries after a valid check-in", () => {
    const idempotencyCheck = migration.indexOf("IF v_row.checked_in_at IS NOT NULL");
    const dateMismatchCheck = migration.indexOf("IF v_service_date IS DISTINCT FROM v_row.scheduled_date");
    expect(idempotencyCheck).toBeGreaterThan(-1);
    expect(idempotencyCheck).toBeLessThan(dateMismatchCheck);
  });

  it("shows the caregiver an actionable scheduled-date message", () => {
    expect(shiftStore).toContain('rpcError === "wrong_service_date"');
    expect(shiftStore).toContain("You can only sign in on");
    expect(shiftStore).toContain("contact the office to correct the order");
  });
});
