/**
 * Display-only starting rates for public Ontario SEO pages.
 * Checkout prices come from the server pricing engine; this never feeds billing.
 */
const FIFTY_DOLLAR_SERVICES = new Set(["doctor-escort", "hospital-discharge", "hospital-discharge-care"]);

export const seoStartingRate = (service: string): number =>
  FIFTY_DOLLAR_SERVICES.has(service) ? 50 : 40;
