import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { decodeSession, encodeSession, isSessionExpired } from "../native/nativeSession";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

describe("worker session payloads", () => {
  it("round-trips a session", () => {
    const raw = encodeSession("access-1", "refresh-1", 1_800_000_000);
    const parsed = decodeSession(raw);
    expect(parsed?.access_token).toBe("access-1");
    expect(parsed?.refresh_token).toBe("refresh-1");
    expect(parsed?.expires_at).toBe(1_800_000_000);
  });

  it("rejects corrupt or incomplete stored values", () => {
    expect(decodeSession(null)).toBeNull();
    expect(decodeSession("not json")).toBeNull();
    expect(decodeSession(JSON.stringify({ access_token: "a" }))).toBeNull();
    expect(decodeSession(JSON.stringify({ access_token: "", refresh_token: "b" }))).toBeNull();
  });

  it("detects expiry from the stored timestamp", () => {
    const expired = decodeSession(encodeSession("a", "b", 1_000));
    expect(isSessionExpired(expired, 2_000_000)).toBe(true);
    expect(isSessionExpired(decodeSession(encodeSession("a", "b", 9_000_000_000)))).toBe(false);
    expect(isSessionExpired(decodeSession(encodeSession("a", "b", null)))).toBe(false);
  });
});

describe("worker credentials never use plain Preferences", () => {
  const source = read("src/mobile/native/nativeSession.ts");

  it("stores tokens through the secure store only", () => {
    expect(source).toContain("secureSet(SESSION_KEY");
    // Preferences may only be touched to remove the migrated legacy copy.
    const preferenceCalls = source.match(/Preferences\.\w+/g) ?? [];
    expect(new Set(preferenceCalls)).toEqual(new Set(["Preferences.get", "Preferences.remove"]));
    expect(source).not.toContain("Preferences.set");
  });

  it("uses a maintained keychain/keystore plugin", () => {
    expect(read("src/mobile/native/secureStore.ts")).toContain("@aparajita/capacitor-secure-storage");
    expect(read("package.json")).toContain("@aparajita/capacitor-secure-storage");
  });
});

describe("public commitments", () => {
  it("states round-the-clock support and never restricted office hours", () => {
    const support = read("src/pages/legal/SupportPage.tsx");
    expect(support).toContain("Support is available 24 hours a day, seven days a week.");
    expect(support).not.toMatch(/8:00 am|8 a\.m\.|office hours/i);
    expect(support).toContain("call 911");
  });

  it("does not promise an invented deletion deadline", () => {
    const page = read("src/pages/legal/AccountDeletionPage.tsx");
    const fn = read("supabase/functions/worker-account-deletion/index.ts");
    for (const source of [page, fn]) {
      expect(source).not.toMatch(/two business days|thirty days|30 days/i);
    }
    expect(page).toContain("public-account-deletion");
  });
});
