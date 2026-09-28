import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";

const root = path.resolve(__dirname, "../../..");
const read = (p: string) => readFileSync(path.join(root, p), "utf8");

// ── Secure-session behaviour with mocked native plugins ──
const secure = new Map<string, string>();
const prefs = new Map<string, string>();
const rpc = vi.fn(async () => ({ data: null, error: null }));
const setSession = vi.fn(async () => ({ error: null }));

vi.mock("@/mobile/native/platform", () => ({ isNativeApp: () => true, nativePlatform: () => "android", isPluginAvailable: () => true }));
vi.mock("../native/platform", () => ({ isNativeApp: () => true, nativePlatform: () => "android", isPluginAvailable: () => true }));
vi.mock("../native/secureStore", () => ({
  secureStoreStatus: async () => "ok",
  secureGet: async (k: string) => secure.get(k) ?? null,
  secureSet: async (k: string, v: string) => (secure.set(k, v), true),
  secureRemove: async (k: string) => void secure.delete(k),
}));
vi.mock("@capacitor/preferences", () => ({
  Preferences: {
    get: async ({ key }: { key: string }) => ({ value: prefs.get(key) ?? null }),
    set: async ({ key, value }: { key: string; value: string }) => void prefs.set(key, value),
    remove: async ({ key }: { key: string }) => void prefs.delete(key),
  },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    rpc,
    auth: {
      getSession: async () => ({ data: { session: null } }),
      setSession,
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => undefined } } }),
    },
  },
}));
vi.mock("../native/careSheetDraftStore", () => ({ clearAllDrafts: async () => undefined }));

describe("Client secure session", () => {
  beforeEach(() => {
    secure.clear();
    prefs.clear();
    rpc.mockClear();
    setSession.mockClear();
  });

  it("migrates a plaintext session and push token into secure storage and deletes the plaintext", async () => {
    const m = await import("../client/clientSession");
    prefs.set(m.CLIENT_LEGACY_SESSION_KEY, JSON.stringify({ access_token: "a", refresh_token: "r" }));
    prefs.set(m.CLIENT_PUSH_TOKEN_KEY, "device-token-123");
    const out = await m.restoreClientSession();
    expect(out).toBe("restored");
    expect(setSession).toHaveBeenCalledWith({ access_token: "a", refresh_token: "r" });
    expect(prefs.size).toBe(0);
    expect(secure.get(m.CLIENT_PUSH_TOKEN_KEY)).toBe("device-token-123");
  });

  it("sign-out revokes the device on the server and wipes secure storage", async () => {
    const m = await import("../client/clientSession");
    secure.set(m.CLIENT_SESSION_KEY, JSON.stringify({ access_token: "a", refresh_token: "r" }));
    secure.set(m.CLIENT_PUSH_TOKEN_KEY, "device-token-123");
    await m.clearLocalClientData();
    expect(rpc).toHaveBeenCalledWith("deactivate_client_push_token", { _token: "device-token-123" });
    expect(secure.size).toBe(0);
  });

  it("returns none when nothing is stored", async () => {
    const m = await import("../client/clientSession");
    expect(await m.restoreClientSession()).toBe("none");
  });
});

describe("Client beta configuration", () => {
  it("keeps Stripe verification inside the app and returns to My Orders", () => {
    expect(read("mobile/client/capacitor.config.ts")).toContain('"*.stripe.com"');
    const app = read("src/mobile/ClientApp.tsx");
    expect(app).toContain("OrderConfirmedRoute");
    expect(app).toMatch(/params\.get\("code"\)/);
  });
  it("never stores the push token in plain Preferences", () => {
    expect(read("src/mobile/client/clientPush.ts")).not.toContain("Preferences");
  });
  it("native Android project has the client identity, no backup, and deep links", () => {
    expect(read("mobile/client/android/app/build.gradle")).toContain('applicationId "ca.pswdirect.client"');
    const manifest = read("mobile/client/android/app/src/main/AndroidManifest.xml");
    expect(manifest).toContain('android:allowBackup="false"');
    expect(manifest).toContain('android:scheme="ca.pswdirect.client"');
    expect(read("mobile/client/ios/App/App.xcodeproj/project.pbxproj")).toContain("PRODUCT_BUNDLE_IDENTIFIER = ca.pswdirect.client;");
  });
  it("sign-out in the client portal clears native data first", () => {
    expect(read("src/pages/ClientPortal.tsx")).toContain("clearLocalClientData");
  });
});
