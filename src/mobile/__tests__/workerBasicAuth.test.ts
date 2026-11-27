import { beforeEach, describe, expect, it, vi } from "vitest";
import { restoreWorkerSignIn, signInWorker, signOutWorker } from "../native/workerBasicAuth";

const backend = vi.hoisted(() => ({ getSession: vi.fn(), signIn: vi.fn(), signOut: vi.fn(), profile: vi.fn(), restore: vi.fn(), clear: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: backend.getSession, signInWithPassword: backend.signIn, signOut: backend.signOut },
    from: () => ({ select: () => ({ ilike: () => ({ maybeSingle: backend.profile }) }) }),
  },
}));
vi.mock("../native/nativeSession", () => ({ restoreSession: backend.restore, clearLocalWorkerData: backend.clear }));

beforeEach(() => {
  vi.resetAllMocks();
  backend.restore.mockResolvedValue("none");
  backend.getSession.mockResolvedValue({ data: { session: null }, error: null });
  backend.signIn.mockResolvedValue({ data: { user: { email: "sam@example.com" } }, error: null });
  backend.profile.mockResolvedValue({ data: { first_name: "Sam", vetting_status: "approved" }, error: null });
  backend.signOut.mockResolvedValue({ error: null });
  backend.clear.mockResolvedValue(undefined);
});

describe("basic Worker existing-backend integration", () => {
  it("restores the native session and looks up the real caregiver profile", async () => {
    backend.getSession.mockResolvedValue({ data: { session: { user: { email: "sam@example.com" } } }, error: null });
    expect(await restoreWorkerSignIn()).toEqual({ firstName: "Sam", email: "sam@example.com", status: "approved" });
    expect(backend.restore).toHaveBeenCalled();
  });

  it("requires a caregiver profile after successful backend authentication", async () => {
    backend.profile.mockResolvedValue({ data: null, error: null });
    await expect(signInWorker("sam@example.com", "example-password")).rejects.toThrow("No caregiver profile");
  });

  it("shows a safe sign-in message instead of a raw backend error", async () => {
    backend.signIn.mockResolvedValue({ data: {}, error: { message: "internal diagnostic detail" } });
    await expect(signInWorker("sam@example.com", "example-password")).rejects.toThrow("Check your connection");
  });

  it("removes native session data and signs out locally without changing other devices", async () => {
    await signOutWorker();
    expect(backend.clear).toHaveBeenCalled();
    expect(backend.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
