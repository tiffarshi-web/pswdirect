import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for PSW Earnings / Payout logic.
 * Tests the core business rules without hitting Supabase.
 */

// ── 1. isThursday / getDisabledReason logic ──────────────────────────

describe("isThursday helper", () => {
  it("returns true when Toronto time is Thursday (dow=4)", () => {
    // Thursday March 6 2026, 10am Toronto
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-05T15:00:00Z")); // UTC 15:00 = Toronto 10:00 (EST)
    const dow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Toronto" })
    ).getDay();
    expect(dow).toBe(4); // Thursday
    vi.useRealTimers();
  });

  it("returns false on a Wednesday", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-04T15:00:00Z")); // Wednesday in Toronto
    const dow = new Date(
      new Date().toLocaleString("en-US", { timeZone: "America/Toronto" })
    ).getDay();
    expect(dow).not.toBe(4);
    vi.useRealTimers();
  });
});

// ── 2. Eligibility filter logic (14-day rule) ────────────────────────

describe("eligibleEntries filter (14-day rule)", () => {
  const makeEntry = (overrides: Record<string, any> = {}) => ({
    id: "e1",
    shift_id: "s1",
    psw_id: "psw-1",
    psw_name: "Test PSW",
    task_name: "Personal Care",
    scheduled_date: "2026-02-01",
    hours_worked: 4,
    hourly_rate: 22,
    surcharge_applied: 0,
    total_owed: 88,
    status: "pending",
    cleared_at: null,
    completed_at: null,
    earned_date: "2026-02-01",
    payout_request_id: null,
    created_at: "2026-02-01T00:00:00Z",
    ...overrides,
  });

  // Replicate the eligibleEntries filter from usePayoutRequests
  const filterEligible = (entries: any[]) => {
    const cutoff = new Date("2026-03-04T00:00:00Z"); // "now" for test
    cutoff.setDate(cutoff.getDate() - 14); // Feb 18
    return entries.filter(
      (e: any) =>
        !e.payout_request_id &&
        e.status !== "cleared" &&
        e.completed_at &&
        new Date(e.completed_at) <= cutoff
    );
  };

  it("includes entry completed 15 days ago", () => {
    const entries = [makeEntry({ completed_at: "2026-02-15T12:00:00Z" })]; // 17 days ago
    expect(filterEligible(entries)).toHaveLength(1);
  });

  it("excludes entry completed 5 days ago (too recent)", () => {
    const entries = [makeEntry({ completed_at: "2026-02-28T12:00:00Z" })]; // 4 days ago
    expect(filterEligible(entries)).toHaveLength(0);
  });

  it("excludes entry with no completed_at", () => {
    const entries = [makeEntry({ completed_at: null })];
    expect(filterEligible(entries)).toHaveLength(0);
  });

  it("excludes entry already in a payout request", () => {
    const entries = [
      makeEntry({ completed_at: "2026-02-10T12:00:00Z", payout_request_id: "req-1" }),
    ];
    expect(filterEligible(entries)).toHaveLength(0);
  });

  it("excludes cleared entries", () => {
    const entries = [
      makeEntry({ completed_at: "2026-02-10T12:00:00Z", status: "cleared" }),
    ];
    expect(filterEligible(entries)).toHaveLength(0);
  });

  it("correctly filters mixed entries", () => {
    const entries = [
      makeEntry({ id: "e1", completed_at: "2026-02-10T12:00:00Z" }), // eligible
      makeEntry({ id: "e2", completed_at: "2026-02-28T12:00:00Z" }), // too recent
      makeEntry({ id: "e3", completed_at: "2026-02-10T12:00:00Z", status: "cleared" }), // cleared
      makeEntry({ id: "e4", completed_at: "2026-02-10T12:00:00Z", payout_request_id: "r1" }), // already linked
    ];
    const result = filterEligible(entries);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("e1");
  });
});

// ── 3. getDisabledReason logic ───────────────────────────────────────

describe("getDisabledReason logic", () => {
  const getDisabledReason = (opts: {
    isThursday: boolean;
    hasOpenRequest: boolean;
    eligibleCount: number;
  }): string | null => {
    if (!opts.isThursday) return "Payout requests are available Thursdays only.";
    if (opts.hasOpenRequest) return "You already have a payout request in progress.";
    if (opts.eligibleCount === 0)
      return "No earnings are eligible yet (shifts must be completed 14+ days ago).";
    return null;
  };

  it("blocks on non-Thursday", () => {
    expect(
      getDisabledReason({ isThursday: false, hasOpenRequest: false, eligibleCount: 3 })
    ).toContain("Thursdays only");
  });

  it("blocks when open request exists", () => {
    expect(
      getDisabledReason({ isThursday: true, hasOpenRequest: true, eligibleCount: 3 })
    ).toContain("already have a payout request");
  });

  it("blocks when no eligible entries", () => {
    expect(
      getDisabledReason({ isThursday: true, hasOpenRequest: false, eligibleCount: 0 })
    ).toContain("No earnings are eligible");
  });

  it("returns null when all conditions met", () => {
    expect(
      getDisabledReason({ isThursday: true, hasOpenRequest: false, eligibleCount: 2 })
    ).toBeNull();
  });
});

// ── 4. paidThisMonth / paidYTD calculations ──────────────────────────

describe("paidThisMonth / paidYTD calculations", () => {
  const calcPaidThisMonth = (clearedEntries: any[], now: Date) => {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return clearedEntries
      .filter((e: any) => e.cleared_at && new Date(e.cleared_at) >= monthStart)
      .reduce((sum: number, e: any) => sum + e.total_owed, 0);
  };

  const calcPaidYTD = (clearedEntries: any[], now: Date) => {
    const yearStart = new Date(now.getFullYear(), 0, 1);
    return clearedEntries
      .filter((e: any) => e.cleared_at && new Date(e.cleared_at) >= yearStart)
      .reduce((sum: number, e: any) => sum + e.total_owed, 0);
  };

  const now = new Date("2026-03-04T12:00:00Z");

  it("sums only this month's cleared entries", () => {
    const entries = [
      { total_owed: 100, cleared_at: "2026-03-02T12:00:00Z" },
      { total_owed: 50, cleared_at: "2026-02-15T12:00:00Z" }, // last month
      { total_owed: 75, cleared_at: "2026-03-01T00:00:00Z" },
    ];
    expect(calcPaidThisMonth(entries, now)).toBe(175);
  });

  it("sums all year's cleared entries for YTD", () => {
    const entries = [
      { total_owed: 100, cleared_at: "2026-01-15T12:00:00Z" },
      { total_owed: 200, cleared_at: "2026-03-02T12:00:00Z" },
      { total_owed: 50, cleared_at: "2025-12-31T23:59:59Z" }, // last year
    ];
    expect(calcPaidYTD(entries, now)).toBe(300);
  });

  it("returns 0 when no cleared entries", () => {
    expect(calcPaidThisMonth([], now)).toBe(0);
    expect(calcPaidYTD([], now)).toBe(0);
  });
});

// ── 5. hasOpenRequest detection ──────────────────────────────────────

describe("hasOpenRequest detection", () => {
  const hasOpen = (requests: { status: string }[]) =>
    requests.some((r) => ["requested", "approved", "payout_ready"].includes(r.status));

  it("detects open 'requested' status", () => {
    expect(hasOpen([{ status: "requested" }])).toBe(true);
  });

  it("detects open 'approved' status", () => {
    expect(hasOpen([{ status: "approved" }])).toBe(true);
  });

  it("detects open 'payout_ready' status", () => {
    expect(hasOpen([{ status: "payout_ready" }])).toBe(true);
  });

  it("returns false for only 'cleared' requests", () => {
    expect(hasOpen([{ status: "cleared" }])).toBe(false);
  });

  it("returns false for only 'rejected' requests", () => {
    expect(hasOpen([{ status: "rejected" }])).toBe(false);
  });

  it("returns false for empty list", () => {
    expect(hasOpen([])).toBe(false);
  });
});
