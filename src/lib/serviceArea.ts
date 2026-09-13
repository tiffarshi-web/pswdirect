/**
 * Service-area restriction (province aware).
 *
 * Ontario is live. Other provinces are only bookable once an administrator
 * enables client bookings for them in the provinces table. Everything a
 * caller needs is derived from the province configuration so adding a new
 * province never requires a code change here.
 *
 * The identical rule is enforced server-side in the create-booking edge
 * function so a manipulated frontend cannot create a booking in a province
 * that is not live.
 */

import {
  DEFAULT_PROVINCES,
  getProvinceConfig,
  provinceFromAddress,
  provinceFromPostalCode,
  resolveServiceProvince,
} from "@/lib/provinceConfig";

export const ACTIVE_PROVINCE_CODE = "ON";
export const ACTIVE_PROVINCE_NAME = "Ontario";
export const SERVICE_AREA_NOTICE =
  "PSW Direct currently provides bookable services in Ontario.";

export const comingSoonNotice = (provinceName: string) =>
  `PSW Direct is coming soon to ${provinceName}. Join the waiting list and we'll let you know the moment we start taking bookings there.`;

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

/** True when an address explicitly names a province other than Ontario. */
export const hasNonOntarioProvinceToken = (...addresses: (string | null | undefined)[]): boolean => {
  const code = provinceFromAddress(...addresses);
  return !!code && code !== "ON";
};

/** Conservative combined check: is this address outside Ontario? */
export const isOutsideServiceArea = (opts: {
  postalCode?: string | null;
  addresses?: (string | null | undefined)[];
}): boolean =>
  isNonOntarioPostal(opts.postalCode) ||
  hasNonOntarioProvinceToken(...(opts.addresses ?? []));

export interface ServiceAreaStatus {
  /** Detected province code, or null when the address is too vague. */
  province: string | null;
  provinceName: string | null;
  /** Bookings (and payment) allowed for this address. */
  bookable: boolean;
  /** A known Canadian province that is set up but not taking bookings yet. */
  comingSoon: boolean;
  message: string | null;
}

/**
 * Province-aware service-area evaluation used by the booking flow.
 * Unknown province => treated as bookable (Ontario default) so vague
 * Ontario addresses are never blocked; the server re-checks anyway.
 */
export const evaluateServiceArea = async (opts: {
  province?: string | null;
  postalCode?: string | null;
  addresses?: (string | null | undefined)[];
}): Promise<ServiceAreaStatus> => {
  const code = resolveServiceProvince(opts);
  if (!code) {
    return { province: null, provinceName: null, bookable: true, comingSoon: false, message: null };
  }

  const cfg = (await getProvinceConfig(code)) ?? DEFAULT_PROVINCES[code] ?? null;
  const name = cfg?.name ?? code;

  if (cfg && cfg.isActive && cfg.bookingsEnabled) {
    return { province: code, provinceName: name, bookable: true, comingSoon: false, message: null };
  }

  return {
    province: code,
    provinceName: name,
    bookable: false,
    comingSoon: true,
    message: comingSoonNotice(name),
  };
};

export { provinceFromPostalCode, provinceFromAddress, resolveServiceProvince };
