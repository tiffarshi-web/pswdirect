import { afterEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import App from "@/App";

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

  it("starts at /telugu-speaking-psw-clarington and replaces the browser location with /telugu-psw-clarington", async () => {
    window.history.replaceState({}, "", "/telugu-speaking-psw-clarington");
    container = document.createElement("div");
    document.body.appendChild(container);

    act(() => {
      root = createRoot(container!);
      root.render(<App />);
    });

    await waitForPathname("/telugu-psw-clarington");

    expect(window.location.pathname).toBe("/telugu-psw-clarington");
  }, 10000);
});