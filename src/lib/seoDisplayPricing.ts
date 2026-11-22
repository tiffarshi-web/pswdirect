/**
 * Display-only starting rates for public Ontario SEO pages.
 * Checkout prices come from the server pricing engine; this never feeds billing.
 */
const FIFTY_DOLLAR_SERVICES = new Set(["doctor-escort", "medical-escort", "hospital-discharge", "hospital-discharge-care", "hospital-discharge-support"]);

export const seoStartingRate = (service: string): number => {
  const normalized = service.trim().toLowerCase().replace(/[ _]+/g, "-");
  return [...FIFTY_DOLLAR_SERVICES].some((key) => normalized.includes(key)) ? 50 : 40;
};
