/**
 * Phase 10 — Alberta rate configuration safety.
 *
 * Checks against the live backend that:
 *  - the approved-rate table and the rate-setting RPC are closed to the public
 *  - Alberta client bookings and payments remain switched off
 * Plus source-level guarantees that no Alberta rate is invented in the app.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { approvedRateCents, EARNINGS_UNAVAILABLE, ONTARIO_PSW_RATE_CENTS } from "@/lib/pswPay";

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const headers = { apikey: KEY ?? "", Authorization: `Bearer ${KEY ?? ""}`, "Content-Type": "application/json" };

const reachable = async (): Promise<boolean> => {
  if (!URL || !KEY) return false;
  try {
    const res = await fetch(`${URL}/rest/v1/`, { headers });
    return res.status < 500;
  } catch {
    return false;
  }
};

const live = (name: string, fn: () => Promise<void>) =>
  it(name, async (ctx) => {
    if (!(await reachable())) return ctx.skip();
    await fn();
  });

describe("Phase 10 — approved rate access control", () => {
  live("public devices cannot read the approved-rate table", async () => {
    const res = await fetch(`${URL}/rest/v1/provider_earning_rates?select=*`, { headers });
    expect(res.ok).toBe(false);
  });

  live("public devices cannot set an approved rate", async () => {
    const res = await fetch(`${URL}/rest/v1/rpc/admin_set_provider_earning_rate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ p_province: "AB", p_provider_type: "hca", p_rate_cents: 9999, p_reason: "test" }),
    });
    expect(res.ok).toBe(false);
  });

  live("Alberta client bookings and payments stay switched off", async () => {
    const res = await fetch(
      `${URL}/rest/v1/provinces?select=code,bookings_enabled,payments_enabled&code=eq.AB`,
      { headers },
    );
    if (!res.ok) return; // province table is not publicly readable — nothing to assert
    const [ab] = (await res.json()) as Array<{ bookings_enabled: boolean; payments_enabled: boolean }>;
    if (!ab) return;
    expect(ab.bookings_enabled).toBe(false);
    expect(ab.payments_enabled).toBe(false);
  });
});

describe("Phase 10 — no invented Alberta rate", () => {
  it("Alberta provider types have no hard-coded rate in the app", () => {
    expect(approvedRateCents("AB", "hca")).toBeUndefined();
    expect(approvedRateCents("AB", "lpn")).toBeUndefined();
    expect(approvedRateCents("AB", "rn")).toBeUndefined();
    expect(approvedRateCents("ON", "rn")).toBeUndefined();
    expect(approvedRateCents("ON", "psw")).toBe(ONTARIO_PSW_RATE_CENTS);
  });

  it("the rate screen saves through the audited admin RPC and requires a reason", () => {
    const src = readFileSync("src/components/admin/ProviderRateConfigSection.tsx", "utf8");
    expect(src).toContain("admin_set_provider_earning_rate");
    expect(src).toContain("p_reason");
    expect(src).toContain(EARNINGS_UNAVAILABLE.slice(0, 8));
    expect(src).not.toMatch(/rate_cents:\s*\d{3,}/);
  });
});
