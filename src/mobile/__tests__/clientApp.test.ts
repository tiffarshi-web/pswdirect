import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { resolveClientLink, resolveClientNotificationTarget } from "../client/clientLinks";
import { deriveVisitStages } from "@/components/client/VisitProgressTimeline";

const root = path.resolve(__dirname, "../../..");

describe("Client app identity and isolation", () => {
  const cfg = readFileSync(path.join(root, "mobile/client/capacitor.config.ts"), "utf8");
  it("has its own permanent app ID, distinct from the Worker app", () => {
    expect(cfg).toContain('appId: "ca.pswdirect.client"');
    expect(cfg).not.toContain("ca.pswdirect.worker");
    expect(cfg).not.toMatch(/url:\s*"/);
  });
  it("bundles only client screens", () => {
    const src = readFileSync(path.join(root, "src/mobile/ClientApp.tsx"), "utf8");
    expect(src).not.toMatch(/AdminPortal|PSWDashboard|pages\/seo|PSWLogin/);
  });
});

describe("Client deep links", () => {
  it("allows only client routes on trusted hosts", () => {
    expect(resolveClientLink("https://pswdirect.ca/client").path).toBe("/client");
    expect(resolveClientLink("https://evil.example/client").path).toBe("/client");
    expect(resolveClientLink("https://pswdirect.ca/admin").path).toBe("/client");
    expect(resolveClientLink("http://pswdirect.ca/client-login").path).toBe("/client");
    expect(resolveClientLink("ca.pswdirect.client://client-login").path).toBe("/client-login");
  });
  it("passes a valid order code and sign-in code only", () => {
    expect(resolveClientLink("https://pswdirect.ca/client?order=CDT-000532").path).toBe("/client?order=CDT-000532");
    expect(resolveClientLink("https://pswdirect.ca/client?order=<x>").path).toBe("/client");
    expect(resolveClientLink("https://pswdirect.ca/client?code=abcDEF123456").authCode).toBe("abcDEF123456");
    expect(resolveClientLink("https://pswdirect.ca/client?code=a;b").authCode).toBeUndefined();
  });
  it("notification paths resolve safely", () => {
    expect(resolveClientNotificationTarget({ path: "/client?order=CDT-000001" })).toBe("/client?order=CDT-000001");
    expect(resolveClientNotificationTarget({ path: "/psw" })).toBe("/client");
  });
});

describe("On my way stage", () => {
  const base: any = { status: "active", psw_assigned: "x", psw_first_name: "Ana", service_province: "ON" };
  it("appears only when the server recorded it, with no ETA", () => {
    expect(deriveVisitStages(base).some((s) => s.key === "on_my_way")).toBe(false);
    const s = deriveVisitStages({ ...base, psw_en_route_at: "2026-09-28T12:00:00Z" });
    const onWay = s.find((x) => x.key === "on_my_way");
    expect(onWay?.label).toBe("Your PSW is on the way");
    expect(onWay?.label).not.toMatch(/min|ETA|arriv/i);
  });
  it("uses HCA in Alberta", () => {
    const s = deriveVisitStages({ ...base, service_province: "AB", psw_en_route_at: "x" });
    expect(s.find((x) => x.key === "on_my_way")?.label).toContain("HCA");
  });
});
