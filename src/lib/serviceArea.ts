/**
 * Service-area restriction.
 *
 * PSW Direct currently provides bookable services in Ontario only. This module
 * is the single source of truth for that rule on the client. The identical
 * check is enforced server-side in the create-booking edge function so a
 * manipulated frontend cannot create a non-Ontario booking.
 */

export const ACTIVE_PROVINCE_CODE = "ON";
export const ACTIVE_PROVINCE_NAME = "Ontario";
export const SERVICE_AREA_NOTICE =
  "PSW Direct currently provides bookable services in Ontario.";

export const ONTARIO_FSA_LETTERS = ["K", "L", "M", "N", "P"];

export const NON_ONTARIO_PROVINCE_TOKENS = [
  "QC", "BC", "AB", "MB", "SK", "NS", "NB", "NL", "PE", "PEI", "YT", "NT", "NU",
  "QUEBEC", "QUÉBEC", "BRITISH COLUMBIA", "ALBERTA", "MANITOBA", "SASKATCHEWAN",
  "NOVA SCOTIA", "NEW BRUNSWICK", "NEWFOUNDLAND", "LABRADOR", "PRINCE EDWARD ISLAND",
  "YUKON", "NORTHWEST TERRITORIES", "NUNAVUT",
];

/** True when a postal code clearly belongs outside Ontario. */
export const isNonOntarioPostal = (postal?: string | null): boolean => {
  if (!postal) return false;
  const first = postal.trim().toUpperCase()[0];
  if (!/[A-Z]/.test(first)) return false;
  return !ONTARIO_FSA_LETTERS.includes(first);
};

/**
 * True when an address explicitly names a province other than Ontario.
 * Only comma-delimited segments are inspected so street names such as
 * "Quebec Ave" or "Alberta St" are never misread as provinces.
 */
export const hasNonOntarioProvinceToken = (...addresses: (string | null | undefined)[]): boolean =>
  addresses
    .filter(Boolean)
    .flatMap((a) => (a as string).split(","))
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean)
    .some((seg) => {
      const provinceOnly = seg.replace(/\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d$/, "").trim();
      return NON_ONTARIO_PROVINCE_TOKENS.includes(provinceOnly);
    });

/** Conservative combined check used before submitting a booking. */
export const isOutsideServiceArea = (opts: {
  postalCode?: string | null;
  addresses?: (string | null | undefined)[];
}): boolean =>
  isNonOntarioPostal(opts.postalCode) ||
  hasNonOntarioProvinceToken(...(opts.addresses ?? []));
