import { describe, it, expect, beforeEach, vi } from "vitest";
import { seoStartingRate } from "@/lib/seoDisplayPricing";
import { trackEvent, trackBookingCompleted, safePagePath, BOOKING_COMPLETED_EVENT, installPhoneClickTracking, PHONE_CLICK_EVENT } from "@/lib/analytics";

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
  it("does not count a missing successful booking identifier", () => {
    const g = vi.fn(); (window as any).gtag = g;
    expect(trackBookingCompleted(undefined, "guest")).toBe(false);
    expect(g).not.toHaveBeenCalled();
  });
  it("a phone tap sends only the event and sanitized path, not the phone number", () => {
    const g = vi.fn(); (window as any).gtag = g;
    window.history.replaceState({}, "", "/home-care-ontario?email=private@example.com#secret");
    const remove = installPhoneClickTracking();
    const link = document.createElement("a");
    link.href = "tel:2492884787";
    link.addEventListener("click", event => event.preventDefault());
    document.body.append(link);
    link.click();
    expect(g).toHaveBeenCalledExactlyOnceWith("event", PHONE_CLICK_EVENT, { page_path: "/home-care-ontario" });
    remove(); link.remove();
    window.history.replaceState({}, "", "/");
  });
});
