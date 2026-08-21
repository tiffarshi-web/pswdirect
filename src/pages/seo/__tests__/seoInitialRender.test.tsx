import { act, render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import PSWLanguageCityPage from "../PSWLanguageCityPage";
import RouteIndexabilityMeta from "@/components/seo/RouteIndexabilityMeta";
import manifest from "@/generated/seoEligibilityManifest.json";

let resolveInventory: ((value: unknown[]) => void) | undefined;
let rejectInventory: ((reason: Error) => void) | undefined;

vi.mock("@/lib/nearbyPSWs", () => ({
  getNearbyPSWsByCity: vi.fn(() => new Promise((resolve, reject) => {
    resolveInventory = resolve;
    rejectInventory = reject;
  })),
}));

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content");
const languagePage = (slug: string) => (
  <HelmetProvider>
    <MemoryRouter initialEntries={[`/${slug}`]}>
      <PSWLanguageCityPage languageCode="en" languageLabel="English" city="Barrie" slug={slug} citySlug="psw-barrie" languageSlug="psw-language-english" />
    </MemoryRouter>
  </HelmetProvider>
);

afterEach(() => {
  document.head.innerHTML = "";
  resolveInventory = undefined;
  rejectInventory = undefined;
});

describe("deterministic initial robots metadata", () => {
  it("qualified inventory is indexable before the live request resolves and stays indexable", async () => {
    const slug = manifest.eligibleLanguageCitySlugs[0];
    expect(slug).toBeTruthy();
    render(languagePage(slug));
    await waitFor(() => expect(robots()).toBe("index,follow"));
    await act(async () => resolveInventory?.([]));
    await waitFor(() => expect(robots()).toBe("index,follow"));
  });

  it("zero/unknown inventory fails closed before the live request resolves and never opens", async () => {
    const slug = "unknown-speaking-psw-nowhere";
    render(languagePage(slug));
    await waitFor(() => expect(robots()).toBe("noindex,follow"));
    await act(async () => resolveInventory?.([{ first_name: "Test", last_name: "Worker", languages: ["en"] }]));
    await waitFor(() => expect(robots()).toBe("noindex,follow"));
  });

  it("failed live inventory remains fail-closed", async () => {
    render(languagePage("failed-speaking-psw-nowhere"));
    await waitFor(() => expect(robots()).toBe("noindex,follow"));
    await act(async () => rejectInventory?.(new Error("inventory unavailable")));
    await waitFor(() => expect(robots()).toBe("noindex,follow"));
  });

  it.each([
    ["/client", "noindex,nofollow"],
    ["/admin", "noindex,nofollow"],
    ["/psw-login", "noindex,nofollow"],
    ["/track", "noindex,nofollow"],
    ["/definitely-not-a-route", "noindex,nofollow"],
  ])("emits immediate crawler controls for %s", async (path, expected) => {
    render(<HelmetProvider><MemoryRouter initialEntries={[path]}><RouteIndexabilityMeta /></MemoryRouter></HelmetProvider>);
    await waitFor(() => expect(robots()).toBe(expected));
  });
});