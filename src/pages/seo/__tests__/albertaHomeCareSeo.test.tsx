import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AlbertaHomeCarePage from "../AlbertaHomeCarePage";
import RouteIndexabilityMeta from "@/components/seo/RouteIndexabilityMeta";

vi.mock("@/generated/seoEligibilityManifest.json", () => ({
  default: {
    eligibleLanguageCitySlugs: [],
    knownPublicPaths: ["/alberta-home-care"],
    sitemapPaths: ["/alberta-home-care"],
  },
}));

const generatorFiles = import.meta.glob("/scripts/generate-sitemap.ts", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const sitemapGenerator = generatorFiles["/scripts/generate-sitemap.ts"] ?? "";

const robots = () => document.head.querySelector('meta[name="robots"]')?.getAttribute("content");

describe("Alberta SEO preparation page", () => {
  it("has unique metadata, a self-canonical, and is in the sitemap", async () => {
    expect(sitemapGenerator).toContain('"/alberta-home-care"');

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/alberta-home-care"]}>
          <RouteIndexabilityMeta />
          <AlbertaHomeCarePage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(robots()).toBe("index,follow");
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href"))
        .toBe("https://pswdirect.ca/alberta-home-care");
      expect(document.title).toBe("Alberta Home Care Updates | PSW Direct");
      expect(document.head.querySelector('meta[name="description"]')?.getAttribute("content"))
        .toContain("Alberta bookings and provider applications are not open yet");
    });
  });

  it("clearly states Alberta is not live and does not offer an Alberta booking link", () => {
    const { getByRole, getByText, queryByRole } = render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/alberta-home-care"]}>
          <AlbertaHomeCarePage />
        </MemoryRouter>
      </HelmetProvider>,
    );

    expect(getByRole("heading", { level: 1, name: "Home Care in Alberta: Launch Updates" })).toBeTruthy();
    expect(getByText(/Alberta bookings and provider applications are not open yet/i)).toBeTruthy();
    expect(queryByRole("link", { name: /book/i })).toBeNull();
  });
});
