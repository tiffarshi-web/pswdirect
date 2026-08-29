import { afterEach, describe, expect, it, vi } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "@/App";

vi.mock("@/lib/nearbyPSWs", () => ({
  getNearbyPSWsByCity: vi.fn().mockResolvedValue([]),
}));

vi.mock("@/hooks/useServiceTasks", () => ({
  useServiceTasks: () => ({ tasks: [], loading: false, error: null, refetch: vi.fn() }),
  fetchServiceTasksAsync: vi.fn().mockResolvedValue([]),
  getServiceTasksCached: vi.fn().mockReturnValue([]),
}));

const waitForPathname = async (expected: string) => {
  for (let i = 0; i < 40; i += 1) {
    if (window.location.pathname === expected) return;
    await new Promise((resolve) => window.setTimeout(resolve, 25));
  }
};

describe("language-city alias route integration", () => {
  let root: Root | null = null;
  let container: HTMLDivElement | null = null;

  afterEach(() => {
    if (root) {
      act(() => root?.unmount());
      root = null;
    }
    container?.remove();
    container = null;
    window.history.replaceState({}, "", "/");
  });

  it("starts at /telugu-psw-clarington and replaces the browser location with /telugu-speaking-psw-clarington", async () => {
    window.history.replaceState({}, "", "/telugu-psw-clarington");
    container = document.createElement("div");
    document.body.appendChild(container);

    act(() => {
      root = createRoot(container!);
      root.render(<App />);
    });

    await waitForPathname("/telugu-speaking-psw-clarington");

    expect(window.location.pathname).toBe("/telugu-speaking-psw-clarington");
  }, 10000);
});
