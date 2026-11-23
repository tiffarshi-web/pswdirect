import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const get = vi.fn();
vi.mock("@/lib/nearbyPSWs", () => ({ getPublicPSWsByCity: (c: string) => get(c) }));
vi.mock("@/components/seo/SeoCallCta", () => ({ default: () => null }));
import PublicPswCityCards from "@/components/seo/PublicPswCityCards";

const ui = () => render(<MemoryRouter><PublicPswCityCards city="Barrie" /></MemoryRouter>);

describe("city caregiver section", () => {
  it("shows generic request copy with no names when nobody opted in", async () => {
    get.mockResolvedValue([]);
    ui();
    expect(await screen.findByTestId("public-psw-generic")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "PSW support in Barrie" })).toBeTruthy();
    expect(screen.queryByTestId("public-psw-cards")).toBeNull();
  });
  it("shows cards only from consented rows", async () => {
    get.mockResolvedValue([{ first_name: "Ana", last_name: "M.", home_city: "Barrie", languages: ["English", "Tamil"], profile_photo_url: null, public_summary: null, gender: null, years_experience: null, certifications: null, distanceKm: 0 }]);
    ui();
    expect(await screen.findByText("Ana")).toBeTruthy();
    expect(screen.queryByText(/Ana M\./)).toBeNull();
    expect(screen.getByText("Speaks English, Tamil")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "PSWs serving Barrie" })).toBeTruthy();
  });
});
