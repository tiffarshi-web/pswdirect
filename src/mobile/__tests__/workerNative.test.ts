import { describe, expect, it } from "vitest";
import { resolveDeepLink, resolveNotificationTarget } from "../native/deepLinks";
import { checkWorkerBackendUrl, findForbiddenSecretKeys } from "../native/backendGuard";
import { sanitizeAnswers } from "../native/careSheetDraftStore";
import { buildDirectionsUrl } from "../native/directions";
import { qualityFor } from "../native/networkStatus";
import { WORKER_ROUTE_PATTERNS, workerFallbackPath } from "../workerRoutes";
import { WORKER_TABS } from "../components/WorkerTabBar";
import { WORKER_APP_VERSION, WORKER_BUILD_NUMBER } from "../version";

const APPROVED_URL = "https://pavibobervhqkfzwkotw.supabase.co";

describe("worker deep links", () => {
  it("keeps worker universal links inside the worker route graph", () => {
    expect(resolveDeepLink("https://pswdirect.ca/psw?tab=active")).toBe("/psw?tab=active");
    expect(resolveDeepLink("https://pswdirect.ca/psw/jobs/CDT-000463")).toBe("/psw/jobs/CDT-000463");
    expect(resolveDeepLink("https://pswdirect.ca/psw-login")).toBe("/psw-login");
  });

  it("sends website, client and admin links to the dashboard instead", () => {
    expect(resolveDeepLink("https://pswdirect.ca/admin")).toBe("/psw");
    expect(resolveDeepLink("https://pswdirect.ca/client")).toBe("/psw");
    expect(resolveDeepLink("https://example.com/psw")).toBe("/psw");
    expect(resolveDeepLink("not a url")).toBe("/psw");
  });

  it("accepts the worker custom scheme", () => {
    expect(resolveDeepLink("ca.pswdirect.worker://psw")).toBe("/psw");
  });

  it("resolves notification payload links safely", () => {
    expect(resolveNotificationTarget({ link: "/psw/jobs/CDT-000001" })).toBe("/psw/jobs/CDT-000001");
    expect(resolveNotificationTarget({ link: "https://evil.example/psw" })).toBe("/psw");
    expect(resolveNotificationTarget(undefined)).toBe("/psw");
  });
});

describe("worker backend guard", () => {
  it("accepts only the approved PSW Direct Canada project", () => {
    expect(checkWorkerBackendUrl(APPROVED_URL)).toEqual({ ok: true, projectRef: "pavibobervhqkfzwkotw" });
  });

  it("rejects other projects, other brands, plain http and missing config", () => {
    expect(checkWorkerBackendUrl("https://someotherproject.supabase.co").ok).toBe(false);
    expect(checkWorkerBackendUrl("https://api.pnsdirect.pk").ok).toBe(false);
    expect(checkWorkerBackendUrl("http://pavibobervhqkfzwkotw.supabase.co").ok).toBe(false);
    expect(checkWorkerBackendUrl(undefined).ok).toBe(false);
  });

  it("flags secrets that must never ship in the mobile bundle", () => {
    const flagged = findForbiddenSecretKeys({
      VITE_SUPABASE_PUBLISHABLE_KEY: "public",
      SUPABASE_SERVICE_ROLE_KEY: "x",
      STRIPE_SECRET_KEY: "sk_live_x",
    });
    expect(flagged).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(flagged).toContain("STRIPE_SECRET_KEY");
    expect(flagged).not.toContain("VITE_SUPABASE_PUBLISHABLE_KEY");
  });
});

describe("care sheet drafts", () => {
  it("never keeps client address or health identifiers on the device", () => {
    const clean = sanitizeAnswers({
      notes: "Client ate well",
      client_address: "12 Any St",
      Patient_Address: "12 Any St",
      health_card: "1234",
      mobility: "walker",
    });
    expect(clean).toEqual({ notes: "Client ate well", mobility: "walker" });
  });
});

describe("directions hand-off", () => {
  it("prefers coordinates and falls back to the address", () => {
    expect(buildDirectionsUrl({ latitude: 44.1, longitude: -77.5 }, "ios")).toContain("maps://?daddr=44.1,-77.5");
    expect(buildDirectionsUrl({ latitude: 44.1, longitude: -77.5 }, "android")).toContain("geo:44.1,-77.5");
    expect(buildDirectionsUrl({ address: "239 Grove St E, Barrie ON" }, "web")).toContain("google.com/maps/dir");
    expect(buildDirectionsUrl({}, "web")).toBeNull();
  });
});

describe("network quality", () => {
  it("treats 2g and unknown-but-disconnected as degraded", () => {
    expect(qualityFor(true, "wifi")).toBe("online");
    expect(qualityFor(true, "2g")).toBe("slow");
    expect(qualityFor(false, "none")).toBe("offline");
  });
});

describe("worker shell scope", () => {
  it("compiles worker routes only", () => {
    expect(WORKER_ROUTE_PATTERNS).toContain("/psw");
    expect(WORKER_ROUTE_PATTERNS).toContain("/psw/account");
    for (const pattern of WORKER_ROUTE_PATTERNS) {
      expect(pattern.startsWith("/psw") || pattern === "/join-team").toBe(true);
    }
    expect(workerFallbackPath(true)).toBe("/psw");
    expect(workerFallbackPath(false)).toBe("/psw-login");
  });

  it("exposes an account tab and no customer, payment or admin tab", () => {
    const keys = WORKER_TABS.map((tab) => tab.key);
    expect(keys).toContain("account");
    expect(keys).not.toContain("admin");
    expect(keys).not.toContain("booking");
    expect(keys).not.toContain("payment");
  });

  it("declares a store-ready version and build number", () => {
    expect(WORKER_APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(WORKER_BUILD_NUMBER).toBeGreaterThan(0);
  });
});
