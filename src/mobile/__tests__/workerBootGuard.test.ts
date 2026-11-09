import { readFileSync } from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const html = readFileSync(path.resolve(__dirname, "../../../mobile/worker/index.html"), "utf8");
const guard = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
let dom: JSDOM;

beforeEach(() => {
  vi.useFakeTimers();
  dom = new JSDOM(html, { runScripts: "outside-only", url: "https://localhost" });
  // Drive the independent HTML guard without loading React or Supabase.
  dom.window.setTimeout = window.setTimeout.bind(window);
  dom.window.clearTimeout = window.clearTimeout.bind(window);
  dom.window.eval(guard);
});

afterEach(() => {
  dom.window.close();
  vi.clearAllTimers();
  vi.useRealTimers();
});

function element(id: string) {
  return dom.window.document.getElementById(id)!;
}

describe("Worker boot before React loads", () => {
  it("offers retry when app modules never load, and ignores a late mount", async () => {
    await vi.advanceTimersByTimeAsync(12000);
    expect(element("worker-startup-title").textContent).toBe("Could not start PSW Direct");
    expect(element("worker-startup-retry").hidden).toBe(false);
    expect(element("root").hidden).toBe(true);

    dom.window.dispatchEvent(new dom.window.Event("psw-worker-shell-mounted"));
    expect(element("worker-startup").hidden).toBe(false);
    expect(element("root").hidden).toBe(true);
  });

  it.each(["error", "unhandledrejection"])("shows retry for an early %s", (event) => {
    dom.window.dispatchEvent(new dom.window.Event(event));
    expect(element("worker-startup-retry").hidden).toBe(false);
    expect(element("root").hidden).toBe(true);
  });

  it("hands off to the mounted shell, but still handles a React crash", async () => {
    dom.window.dispatchEvent(new dom.window.Event("psw-worker-shell-mounted"));
    await vi.advanceTimersByTimeAsync(12000);
    expect(element("worker-startup").hidden).toBe(true);
    expect(element("root").hidden).toBe(false);

    dom.window.dispatchEvent(new dom.window.CustomEvent("psw-worker-startup-error"));
    expect(element("worker-startup").hidden).toBe(false);
    expect(element("worker-startup-retry").hidden).toBe(false);
    expect(element("root").hidden).toBe(true);
  });

  it("explains a missing backend configuration without loading the app", () => {
    dom.window.dispatchEvent(new dom.window.CustomEvent("psw-worker-startup-error", { detail: "BACKEND_CONFIG" }));
    expect(element("worker-startup-message").textContent).toContain("not configured correctly");
    expect(element("root").hidden).toBe(true);
  });
});
