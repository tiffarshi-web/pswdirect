import { createClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSecureAuthStorage } from "@/integrations/supabase/secureAuthStorage";
import {
  __resetSecureStoreStatus,
  SECURE_STORAGE_TIMEOUT_MS,
  secureGet,
  secureRemove,
  secureSet,
  secureStoreStatus,
} from "../native/secureStore";

const plugin = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), remove: vi.fn() }));
vi.mock("@aparajita/capacitor-secure-storage", () => ({ SecureStorage: plugin }));
vi.mock("../native/platform", () => ({ isNativeApp: () => true }));

beforeEach(() => {
  vi.useFakeTimers();
  vi.resetAllMocks();
  __resetSecureStoreStatus();
  localStorage.clear();
  plugin.get.mockResolvedValue(null);
  plugin.set.mockResolvedValue(undefined);
  plugin.remove.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe("native storage startup with the real auth SDK", () => {
  it("releases auth initialization when the Android secure-storage probe never replies", async () => {
    plugin.get.mockImplementation(() => new Promise(() => undefined));
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      error: "invalid_grant",
      error_description: "Invalid login credentials",
    }), { status: 400, headers: { "content-type": "application/json" } }));
    const client = createClient("https://example.supabase.co", "anon", {
      auth: {
        storage: createSecureAuthStorage(),
        storageKey: "sb-startup-test-auth-token",
        persistSession: true,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: fetchMock },
    });
    let restored = false;
    const restore = client.auth.getSession().then(({ data, error }) => {
      expect(error).toBeNull();
      expect(data.session).toBeNull();
      restored = true;
    });

    await vi.advanceTimersByTimeAsync(8000);
    expect(restored).toBe(true);
    await restore;

    // The SDK itself must remain usable after the failed restore; returning
    // only the outer React timeout would leave later auth calls blocked.
    const { error } = await client.auth.signInWithPassword({
      email: "caregiver@example.com",
      password: "invalid-test-password",
    });
    expect(error?.message).toContain("Invalid login credentials");
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(plugin.set).not.toHaveBeenCalled();
  });

  it("bounds a session read that hangs after the initial probe succeeds", async () => {
    plugin.get.mockImplementation((key: string) => key === "psw.worker.probe"
      ? Promise.resolve(null)
      : new Promise(() => undefined));
    const read = secureGet("session");
    await vi.advanceTimersByTimeAsync(SECURE_STORAGE_TIMEOUT_MS);
    expect(await read).toBeNull();
    expect(await secureStoreStatus()).toBe("unavailable");
    expect(await secureSet("session", "never-persisted")).toBe(false);
    expect(plugin.set).not.toHaveBeenCalled();
  });

  it("bounds a hung write and removes it if it completes after sign-out", async () => {
    const encrypted = new Map<string, string>();
    let completeWrite!: () => void;
    plugin.set.mockImplementation((key: string, value: string) => new Promise<void>((resolve) => {
      completeWrite = () => { encrypted.set(key, value); resolve(); };
    }));
    plugin.remove.mockImplementation(async (key: string) => { encrypted.delete(key); });

    const write = secureSet("session", "encrypted-session");
    await vi.advanceTimersByTimeAsync(SECURE_STORAGE_TIMEOUT_MS);
    expect(await write).toBe(false);
    expect(await secureStoreStatus()).toBe("unavailable");
    await secureRemove("session");
    completeWrite();
    await vi.advanceTimersByTimeAsync(0);
    expect(encrypted.has("session")).toBe(false);
    expect(await secureGet("session")).toBeNull();
  });

  it("releases sign-out cleanup when a native removal never replies", async () => {
    plugin.remove.mockImplementation(() => new Promise(() => undefined));
    let removed = false;
    const removal = secureRemove("session").then(() => { removed = true; });
    await vi.advanceTimersByTimeAsync(SECURE_STORAGE_TIMEOUT_MS);
    expect(removed).toBe(true);
    await removal;
  });

  it("shares a concurrent probe and never enables storage after a late response", async () => {
    let finishProbe!: () => void;
    plugin.get.mockImplementation(() => new Promise<null>((resolve) => {
      finishProbe = () => resolve(null);
    }));
    const first = secureStoreStatus();
    const second = secureStoreStatus();
    await vi.advanceTimersByTimeAsync(SECURE_STORAGE_TIMEOUT_MS);
    expect(await first).toBe("unavailable");
    expect(await second).toBe("unavailable");
    expect(plugin.get).toHaveBeenCalledOnce();
    finishProbe();
    await vi.advanceTimersByTimeAsync(0);
    expect(await secureStoreStatus()).toBe("unavailable");
  });
});
