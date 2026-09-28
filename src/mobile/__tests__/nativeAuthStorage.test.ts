import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const secure = new Map<string, string>();
let storeOk = true;
vi.mock("@/mobile/native/secureStore", () => ({
  secureStoreStatus: async () => (storeOk ? "ok" : "unavailable"),
  secureGet: async (k: string) => (storeOk ? secure.get(k) ?? null : null),
  secureSet: async (k: string, v: string) => (storeOk ? (secure.set(k, v), true) : false),
  secureRemove: async (k: string) => void secure.delete(k),
}));

import { createSecureAuthStorage } from "@/integrations/supabase/secureAuthStorage";

const root = path.resolve(__dirname, "../../..");
const URL_ = "https://example.supabase.co";
const KEY = "sb-example-auth-token";

function jwt(expSecondsFromNow: number) {
  const b64 = (o: object) => btoa(JSON.stringify(o)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u1", exp: Math.floor(Date.now() / 1000) + expSecondsFromNow, role: "authenticated" })}.sig`;
}
const user = { id: "u1", aud: "authenticated", role: "authenticated", email: "c@example.com", app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };

describe("native Supabase auth storage", () => {
  let spies: ReturnType<typeof vi.spyOn>[] = [];
  beforeEach(() => {
    secure.clear();
    storeOk = true;
    localStorage.clear();
    spies = [];
  });
  afterEach(() => spies.forEach((s) => s.mockRestore()));

  const watchLocalStorage = () => {
    const proto = Object.getPrototypeOf(localStorage);
    spies = [vi.spyOn(proto, "setItem"), vi.spyOn(proto, "getItem")];
    return spies;
  };

  it("sign-in, refresh and sign-out never write tokens to localStorage", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("grant_type=refresh_token")) {
        return new Response(JSON.stringify({ access_token: jwt(3600), refresh_token: "r2", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, token_type: "bearer", user }), { status: 200, headers: { "content-type": "application/json" } });
      }
      if (url.includes("/logout")) return new Response(null, { status: 204 });
      if (url.includes("/user")) return new Response(JSON.stringify(user), { status: 200, headers: { "content-type": "application/json" } });
      return new Response("{}", { status: 200, headers: { "content-type": "application/json" } });
    });
    const [setSpy] = watchLocalStorage();
    const client = createClient(URL_, "anon", {
      auth: { storage: createSecureAuthStorage(), storageKey: KEY, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: fetchMock as unknown as typeof fetch },
    });

    // Expired access token forces a refresh through the adapter.
    const { error } = await client.auth.setSession({ access_token: jwt(-60), refresh_token: "r1" });
    expect(error).toBeNull();
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes("grant_type=refresh_token"))).toBe(true);
    expect(JSON.parse(secure.get(KEY)!).refresh_token).toBe("r2");

    await client.auth.signOut();
    expect(secure.has(KEY)).toBe(false);
    expect(setSpy.mock.calls.filter(([k]) => String(k).startsWith("sb-"))).toHaveLength(0);
    expect(Object.keys(localStorage).filter((k) => k.startsWith("sb-"))).toHaveLength(0);
  });

  it("moves an old plaintext token into secure storage on upgrade and deletes it", async () => {
    localStorage.setItem(KEY, JSON.stringify({ access_token: "a", refresh_token: "r" }));
    localStorage.setItem("sb-example-auth-token-code-verifier", "v");
    const s = createSecureAuthStorage();
    expect(await s.getItem(KEY)).toContain('"refresh_token":"r"');
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(localStorage.getItem("sb-example-auth-token-code-verifier")).toBeNull();
  });

  it("fails closed when secure storage is unavailable", async () => {
    storeOk = false;
    localStorage.setItem(KEY, "plaintext");
    const s = createSecureAuthStorage();
    expect(await s.getItem(KEY)).toBeNull();
    await s.setItem(KEY, "new");
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(secure.size).toBe(0);
  });

  it("both native bundles swap in the secure client; website config does not", () => {
    for (const cfg of ["vite.client.config.ts", "vite.worker.config.ts"]) {
      expect(readFileSync(path.join(root, cfg), "utf8")).toContain("nativeClient.ts");
    }
    expect(readFileSync(path.join(root, "vite.config.ts"), "utf8")).not.toContain("nativeClient");
  });
});
