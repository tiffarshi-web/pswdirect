/**
 * Minimal GA4 event helpers. Uses the gtag already loaded in index.html.
 * Safe when gtag is missing (blocked, native app, tests): calls are no-ops.
 * Never pass personal data — only fixed labels and page paths without query.
 */
type Gtag = (...args: unknown[]) => void;

export const PHONE_CLICK_EVENT = "phone_call_click";
export const BOOKING_COMPLETED_EVENT = "booking_completed";

export const trackEvent = (name: string, params: Record<string, string> = {}): boolean => {
  if (typeof window === "undefined") return false;
  const g = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof g !== "function") return false;
  try {
    g("event", name, params);
    return true;
  } catch {
    return false;
  }
};

/** Pathname only — strips query strings and hashes that could carry codes or emails. */
export const safePagePath = (pathname: string): string => pathname.split(/[?#]/)[0] || "/";

const firedBookings = new Set<string>();

/** Fires booking_completed once per booking id per session. */
export const trackBookingCompleted = (bookingId: string | undefined, flow: string): boolean => {
  if (!bookingId) return false;
  const key = `ga_booking_done_${bookingId}`;
  try {
    if (firedBookings.has(key) || window.sessionStorage.getItem(key)) return false;
    window.sessionStorage.setItem(key, "1");
  } catch {
    if (firedBookings.has(key)) return false;
  }
  firedBookings.add(key);
  return trackEvent(BOOKING_COMPLETED_EVENT, { booking_flow: flow, page_path: safePagePath(window.location.pathname) });
};

/** Delegated listener: any tel: link tap on the site sends phone_call_click. */
export const installPhoneClickTracking = (): (() => void) => {
  const handler = (e: MouseEvent) => {
    const a = (e.target as Element | null)?.closest?.('a[href^="tel:"]');
    if (!a) return;
    trackEvent(PHONE_CLICK_EVENT, { page_path: safePagePath(window.location.pathname) });
  };
  document.addEventListener("click", handler, true);
  return () => document.removeEventListener("click", handler, true);
};
