/**
 * Phase 9 — REAL database integration tests.
 *
 * These tests talk to the live backend over HTTP with the public (anon) key.
 * They are deliberately NOT mocked: they prove the actual grants, row-level
 * security policies and SECURITY DEFINER authorization boundaries behave as
 * designed. They never write data — every request must be rejected.
 *
 * The in-database regression suite (real functions, triggers, transactions and
 * paid-record immutability) lives in `public.phase9_earnings_selftest()` and is
 * executed by the office/service role; this file asserts that untrusted callers
 * cannot reach any of it.
 */

import { describe, it, expect, beforeAll } from "vitest";

const URL = (import.meta as any).env?.VITE_SUPABASE_URL as string | undefined;
const KEY = (import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const headers = {
  apikey: KEY || "",
  Authorization: `Bearer ${KEY || ""}`,
  "Content-Type": "application/json",
};

let reachable = false;

const call = (path: string, init?: RequestInit) =>
  fetch(`${URL}${path}`, { ...init, headers: { ...headers, ...(init?.headers || {}) } });

beforeAll(async () => {
  if (!URL || !KEY) return;
  try {
    const res = await fetch(`${URL}/rest/v1/`, { headers });
    reachable = res.status < 500;
  } catch {
    reachable = false;
  }
});

const maybe = () => (reachable ? it : it.skip);

describe("Phase 9 — database authorization boundaries (live backend)", () => {
  maybe()("public clients cannot read the approved provider rate table", async () => {
    const res = await call("/rest/v1/provider_earning_rates?select=rate_cents");
    expect(res.ok).toBe(false);
    expect([401, 403, 404]).toContain(res.status);
  });

  maybe()("public clients cannot create or override a provider rate", async () => {
    const res = await call("/rest/v1/provider_earning_rates", {
      method: "POST",
      body: JSON.stringify({ province: "ON", provider_type: "psw", rate_cents: 2700 }),
    });
    expect(res.ok).toBe(false);
  });

  maybe()("public clients cannot read payroll entries", async () => {
    const res = await call("/rest/v1/payroll_entries?select=id,rate_cents,gross_cents&limit=1");
    if (res.ok) {
      // RLS may return an empty set rather than an error — no rows is also correct.
      expect(await res.json()).toEqual([]);
    } else {
      expect([401, 403, 404]).toContain(res.status);
    }
  });

  maybe()("public clients cannot change hours, rate or calculated earnings", async () => {
    const res = await call("/rest/v1/payroll_entries?id=neq.00000000-0000-0000-0000-000000000000", {
      method: "PATCH",
      body: JSON.stringify({ rate_cents: 2700, gross_cents: 999999, payable_minutes: 9999 }),
    });
    if (res.ok) {
      expect(await res.json()).toEqual([]); // no row was allowed through RLS
    } else {
      expect(res.ok).toBe(false);
    }
  });

  maybe()("public clients cannot run the earnings reconciliation", async () => {
    const res = await call("/rest/v1/rpc/phase9_earnings_reconciliation", {
      method: "POST",
      body: JSON.stringify({ p_apply: true }),
    });
    expect(res.ok).toBe(false);
  });

  maybe()("public clients cannot run the earnings self-test", async () => {
    const res = await call("/rest/v1/rpc/phase9_earnings_selftest", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.ok).toBe(false);
  });

  maybe()("public clients cannot set a booking pay rate", async () => {
    const res = await call("/rest/v1/rpc/admin_set_psw_pay_rate", {
      method: "POST",
      body: JSON.stringify({
        p_booking_id: "00000000-0000-0000-0000-000000000000",
        p_new_rate: 27,
        p_reason: "unauthorized attempt",
      }),
    });
    expect(res.ok).toBe(false);
  });

  maybe()("public clients cannot override payable hours", async () => {
    const res = await call("/rest/v1/rpc/admin_set_payable_hours", {
      method: "POST",
      body: JSON.stringify({
        p_entry_id: "00000000-0000-0000-0000-000000000000",
        p_override_hours: 99,
        p_note: "unauthorized attempt",
      }),
    });
    expect(res.ok).toBe(false);
  });
});
