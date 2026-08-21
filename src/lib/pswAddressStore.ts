// Self-service PSW address management.
// Validation + resilient Canadian geocoding + atomic server-side save.
// The server RPC (public.psw_update_own_address) is the authority: it matches
// auth.uid() to the profile row and writes ONLY address fields + coordinates.

import { supabase } from "@/integrations/supabase/client";
import {
  CANADIAN_POSTAL_CODE_REGEX,
  getCoordinatesFromPostalCode,
} from "@/lib/postalCodeUtils";
import { geocodeAddress } from "@/lib/geocodingUtils";

export interface PSWAddressInput {
  streetAddress: string;
  unit?: string;
  city: string;
  province: string;
  postalCode: string;
}

export interface PSWAddressRecord extends PSWAddressInput {
  lat?: number | null;
  lng?: number | null;
}

/** Provinces the PSW may pick. Ontario-only until national expansion enables more. */
export const ENABLED_PROVINCES: { code: string; name: string }[] = [
  { code: "ON", name: "Ontario" },
];

/** "n6j1s9" | " n6j 1s9 " -> "N6J 1S9". Returns "" when not a valid CA postal code. */
export const normalizePostalCode = (raw: string | null | undefined): string => {
  const compact = (raw || "").toUpperCase().replace(/\s+/g, "");
  if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(compact)) return "";
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
};

export const isValidPostalCode = (raw: string | null | undefined): boolean =>
  CANADIAN_POSTAL_CODE_REGEX.test((raw || "").trim());

const clean = (v: string | null | undefined) => (v || "").trim().replace(/\s+/g, " ");

export interface ValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof PSWAddressInput, string>>;
  normalized?: PSWAddressInput;
}

export const validateAddress = (input: PSWAddressInput): ValidationResult => {
  const errors: ValidationResult["errors"] = {};

  const streetAddress = clean(input.streetAddress);
  const unit = clean(input.unit);
  const city = clean(input.city);
  const province = clean(input.province).toUpperCase();
  const postalCode = normalizePostalCode(input.postalCode);

  if (streetAddress.length < 4 || !/\d/.test(streetAddress)) {
    errors.streetAddress = "Enter your full street address, including the street number.";
  }
  if (city.length < 2) errors.city = "Enter your city or town.";
  if (!ENABLED_PROVINCES.some((p) => p.code === province)) {
    errors.province = "Select your province.";
  }
  if (!postalCode) {
    errors.postalCode = "Enter a valid Canadian postal code (for example M5V 1J9).";
  }

  if (Object.keys(errors).length > 0) return { valid: false, errors };

  return {
    valid: true,
    errors: {},
    normalized: { streetAddress, unit: unit || undefined, city, province, postalCode },
  };
};

export interface GeocodeOutcome {
  lat: number | null;
  lng: number | null;
  precision: "address" | "postal_code" | "city" | "none";
}

/**
 * Resilient geocode, in the approved order:
 *  1. clean full address, 2. postal code, 3. city-level fallback.
 * Never invents coordinates — returns precision "none" when nothing resolves.
 */
export const geocodePSWAddress = async (
  addr: PSWAddressInput,
): Promise<GeocodeOutcome> => {
  const full = `${addr.streetAddress}, ${addr.city}, ${addr.province} ${addr.postalCode}, Canada`;
  try {
    const r = await geocodeAddress(full);
    if (r) return { lat: r.lat, lng: r.lng, precision: "address" };
  } catch {
    /* fall through */
  }

  const local = getCoordinatesFromPostalCode(addr.postalCode);
  if (local) return { lat: local.lat, lng: local.lng, precision: "postal_code" };

  try {
    const r = await geocodeAddress(`${addr.postalCode}, ${addr.province}, Canada`);
    if (r) return { lat: r.lat, lng: r.lng, precision: "postal_code" };
  } catch {
    /* fall through */
  }

  try {
    const r = await geocodeAddress(`${addr.city}, ${addr.province}, Canada`);
    if (r) return { lat: r.lat, lng: r.lng, precision: "city" };
  } catch {
    /* fall through */
  }

  return { lat: null, lng: null, precision: "none" };
};

export interface SaveAddressResult {
  success: boolean;
  message?: string;
  geocoded?: boolean;
}

/** Atomic save through the ownership-enforcing RPC. */
export const saveOwnAddress = async (
  addr: PSWAddressInput,
  coords: { lat: number | null; lng: number | null },
): Promise<SaveAddressResult> => {
  const { data, error } = await supabase.rpc("psw_update_own_address", {
    p_street_address: addr.streetAddress,
    p_unit: addr.unit ?? null,
    p_city: addr.city,
    p_province: addr.province,
    p_postal_code: addr.postalCode,
    p_lat: coords.lat,
    p_lng: coords.lng,
  } as never);

  if (error) {
    // Never surface raw technical errors to the caregiver.
    return {
      success: false,
      message: "We couldn't save your address. Please check the details and try again.",
    };
  }

  const result = (data ?? {}) as { geocoded?: boolean };
  return { success: true, geocoded: !!result.geocoded };
};

/** Read the signed-in caregiver's own saved address. */
export const loadOwnAddress = async (
  pswId: string,
): Promise<PSWAddressRecord | null> => {
  const { data, error } = await supabase
    .from("psw_profiles")
    .select(
      "home_street_address, home_unit, home_city, home_province, home_postal_code, home_lat, home_lng",
    )
    .eq("id", pswId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as Record<string, unknown>;
  return {
    streetAddress: (row.home_street_address as string) || "",
    unit: (row.home_unit as string) || "",
    city: (row.home_city as string) || "",
    province: (row.home_province as string) || "ON",
    postalCode: (row.home_postal_code as string) || "",
    lat: (row.home_lat as number) ?? null,
    lng: (row.home_lng as number) ?? null,
  };
};
