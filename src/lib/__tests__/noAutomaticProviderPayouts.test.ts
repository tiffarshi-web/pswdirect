import { describe, it, expect } from "vitest";
import { execSync } from "node:child_process";

/**
 * Guard test: nothing in the codebase may move money to a provider
 * automatically, and no cash-out / withdraw affordance may exist.
 */
const grep = (pattern: string, paths: string): string => {
  try {
    return execSync(
      `grep -rIn -E "${pattern}" ${paths} --exclude-dir=__tests__ --exclude=manualPayoutPolicy.ts || true`,
      { encoding: "utf8" },
    );
  } catch {
    return "";
  }
};

describe("automatic provider payouts remain impossible", () => {
  it("has no Stripe Connect or transfer/payout creation code", () => {
    const hits = grep(
      "transfers\\.create|payouts\\.create|accounts\\.create|accountLinks\\.create|connect/accounts|v1/transfers",
      "src supabase/functions",
    );
    expect(hits.trim()).toBe("");
  });

  it("has no cash out or withdraw action for providers", () => {
    const hits = grep("Cash ?Out|Withdraw Funds|Withdraw Earnings|Instant Payout", "src");
    expect(hits.trim()).toBe("");
  });

  it("never describes provider payment as automatic or instant", () => {
    const hits = grep(
      "paid (automatically|instantly)|instant(ly)? paid|automatic(ally)? pa(id|yout|yment) to (the )?(psw|provider|nurse)",
      "src supabase/functions",
    );
    expect(hits.trim()).toBe("");
  });
});
