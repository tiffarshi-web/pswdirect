import { describe, expect, it } from "vitest";
import { WORKER_ROUTE_PATTERNS, workerFallbackPath } from "../workerRoutes";

describe("Worker mobile route policy", () => {
  it("contains only PSW authentication and Worker routes", () => {
    expect(WORKER_ROUTE_PATTERNS).toEqual([
      "/psw-login",
      "/join-team",
      "/psw-pending",
      "/psw",
      "/psw/jobs/:bookingCode",
    ]);

    for (const forbidden of ["/", "/client", "/pay/:token", "/admin", "/faq", "/psw-directory"]) {
      expect(WORKER_ROUTE_PATTERNS).not.toContain(forbidden);
    }
  });

  it("returns signed-out users to login", () => {
    expect(workerFallbackPath(false)).toBe("/psw-login");
  });

  it("returns authenticated PSWs to their dashboard", () => {
    expect(workerFallbackPath(true)).toBe("/psw");
  });
});
