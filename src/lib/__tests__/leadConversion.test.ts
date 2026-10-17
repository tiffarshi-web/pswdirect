import { describe, it, expect, beforeEach, vi } from "vitest";
import { seoStartingRate } from "@/lib/seoDisplayPricing";
import { trackEvent, trackBookingCompleted, safePagePath, BOOKING_COMPLETED_EVENT } from "@/lib/analytics";

describe("SEO display rates", () => {
  it("doctor escort shows $50", () => expect(seoStartingRate("doctor-escort")).toBe(50));
  it("hospital discharge shows $50", () => {
    expect(seoStartingRate("hospital-discharge")).toBe(50);
    expect(seoStartingRate("hospital-discharge-care")).toBe(50);
  });
  it("home care shows $40", () => expect(seoStartingRate("in-home-care-services")).toBe(40));
});

describe("GA4 events", () => {
  beforeEach(() => { delete (window as any).gtag; sessionStorage.clear(); });
  it("is a no-op without gtag", () => expect(trackEvent("x")).toBe(false));
  it("booking_completed fires once per booking", () => {
    const g = vi.fn(); (window as any).gtag = g;
    expect(trackBookingCompleted("b1", "guest")).toBe(true);
    expect(trackBookingCompleted("b1", "guest")).toBe(false);
    expect(g).toHaveBeenCalledTimes(1);
    expect(g.mock.calls[0][1]).toBe(BOOKING_COMPLETED_EVENT);
  });
  it("strips query strings from page paths", () => expect(safePagePath("/track?code=CDT-1&e=a@b.c")).toBe("/track"));
});
