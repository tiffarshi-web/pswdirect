import { describe, expect, it, vi } from "vitest";
import {
  MIN_SUPPORTED_WEBVIEW_MAJOR,
  SESSION_RESTORE_TIMEOUT_MS,
  STARTUP_TIMEOUT_MS,
  diagnosticsAreSafe,
  isWebViewSupported,
  mayShowSpinner,
  parseAndroidVersion,
  parseWebViewVersion,
  startupErrorCode,
  timedOut,
  withTimeout,
} from "../native/startup";
import { resolveDeepLink, resolveNotificationTarget } from "../native/deepLinks";
import { decodeSession, isSessionExpired } from "../native/nativeSession";

/**
 * Phase 7 startup contract.
 *
 * These encode the fix for the Android beta hang: nothing in startup may wait
 * forever, and every failure must land on a retry screen with a safe code.
 */

describe("startup timeouts", () => {
  it("time-boxes session restore well inside the overall startup ceiling", () => {
    expect(SESSION_RESTORE_TIMEOUT_MS).toBeLessThan(STARTUP_TIMEOUT_MS);
    expect(STARTUP_TIMEOUT_MS).toBeLessThanOrEqual(15000);
  });

  it("stops waiting on a promise that never settles", async () => {
    vi.useFakeTimers();
    const hung = new Promise<string>(() => undefined);
    const race = withTimeout(hung, 8000);
    await vi.advanceTimersByTimeAsync(8000);
    expect(timedOut(await race)).toBe(true);
    vi.useRealTimers();
  });

  it("returns the real value when the step finishes in time", async () => {
    const result = await withTimeout(Promise.resolve("restored"), 1000);
    expect(timedOut(result)).toBe(false);
    expect(result).toBe("restored");
  });

  it("never allows a spinner past the startup ceiling", () => {
    expect(mayShowSpinner("restoring_session", 1000)).toBe(true);
    expect(mayShowSpinner("restoring_session", STARTUP_TIMEOUT_MS)).toBe(false);
    expect(mayShowSpinner("failed", 10)).toBe(false);
    expect(mayShowSpinner("ready", 10)).toBe(false);
  });
});

describe("startup failure codes", () => {
  it("names the offline case first so the tester knows to check the network", () => {
    expect(startupErrorCode("restoring_session", false, "timeout")).toBe("OFFLINE");
    expect(startupErrorCode("restoring_session", true, "timeout")).toBe("STARTUP_TIMEOUT");
    expect(startupErrorCode("restoring_session", true, "error")).toBe("SESSION_RESTORE_FAILED");
    expect(startupErrorCode("checking_build", true, "config")).toBe("BACKEND_CONFIG");
  });

  it("keeps beta diagnostics free of private information", () => {
    expect(
      diagnosticsAreSafe({
        stage: "failed",
        errorCode: "OFFLINE",
        appVersion: "1.0.0",
        platform: "android",
        online: false,
        webViewVersion: "140.0.0.0",
      }),
    ).toBe(true);

    expect(diagnosticsAreSafe({ pushToken: "abc" })).toBe(false);
    expect(diagnosticsAreSafe({ clientAddress: "12 Any St" })).toBe(false);
    expect(diagnosticsAreSafe({ careNotes: "..." })).toBe(false);
  });
});

describe("android webview compatibility", () => {
  const SAMSUNG_A16_ANDROID_16 =
    "Mozilla/5.0 (Linux; Android 16; SM-A166W) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/140.0.7339.80 Mobile Safari/537.36";

  it("reads the device and stable WebView version from the user agent", () => {
    expect(parseAndroidVersion(SAMSUNG_A16_ANDROID_16)).toBe("16");
    expect(parseWebViewVersion(SAMSUNG_A16_ANDROID_16)).toBe("140.0.7339.80");
  });

  it("supports current stable WebView and does not require Canary", () => {
    expect(isWebViewSupported("140.0.7339.80")).toBe(true);
    expect(isWebViewSupported("108.0.0.0")).toBe(true); // Android 13 era
    expect(isWebViewSupported(String(MIN_SUPPORTED_WEBVIEW_MAJOR) + ".0.0.0")).toBe(true);
    expect(isWebViewSupported("75.0.0.0")).toBe(false);
    expect(isWebViewSupported(undefined)).toBe(true);
  });
});

describe("session restoration", () => {
  it("rejects incomplete stored sessions instead of half-restoring", () => {
    expect(decodeSession(null)).toBeNull();
    expect(decodeSession("{}")).toBeNull();
    expect(decodeSession('{"access_token":"a"}')).toBeNull();
    expect(decodeSession("not json")).toBeNull();
    const ok = decodeSession('{"access_token":"a","refresh_token":"r"}');
    expect(ok?.refresh_token).toBe("r");
  });

  it("treats a past expiry as expired so the app returns to sign-in", () => {
    const base = { access_token: "a", refresh_token: "r", savedAt: new Date(0).toISOString() };
    expect(isSessionExpired({ ...base, expires_at: 1000 }, 2_000_000)).toBe(true);
    expect(isSessionExpired({ ...base, expires_at: 9_999_999_999 }, 2_000_000)).toBe(false);
    expect(isSessionExpired({ ...base, expires_at: null })).toBe(false);
  });
});

describe("notification and deep-link authorization", () => {
  it("keeps every alert link inside the caregiver route graph", () => {
    expect(resolveNotificationTarget({ link: "/psw?tab=earnings" })).toBe("/psw?tab=earnings");
    expect(resolveNotificationTarget({ link: "/psw?tab=caresheets" })).toBe("/psw?tab=caresheets");
    expect(resolveNotificationTarget({ link: "/psw?tab=documents" })).toBe("/psw?tab=documents");
    expect(resolveNotificationTarget({ link: "/admin" })).toBe("/psw");
    expect(resolveNotificationTarget({ link: "/client" })).toBe("/psw");
  });

  it("carries no sensitive payload in the link itself", () => {
    // Only a booking code ever appears; never a name, address or health note.
    expect(resolveDeepLink("https://pswdirect.ca/psw/jobs/CDT-000475?client=Jane%20Doe")).toBe(
      "/psw/jobs/CDT-000475",
    );
  });

  it("routes an unknown or retired destination to a safe fallback", () => {
    expect(resolveDeepLink("https://pswdirect.ca/psw/jobs/retired path")).toBe("/psw");
    expect(resolveDeepLink("https://pswdirect.ca/some/removed/screen")).toBe("/psw");
  });
});
