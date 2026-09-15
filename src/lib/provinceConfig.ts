/**
 * Province configuration — single source of truth for multi-province support.
 *
 * PSW Direct operates province by province. Ontario is live. Alberta is set up
 * for worker recruitment and admin verification, but client bookings stay
 * disabled until an administrator enables them (the "Enable Alberta Live
 * Bookings" switch = provinces.bookings_enabled for AB).
 *
 * Adding a province later = inserting a row in public.provinces. No rebuild.
 */

import { supabase } from "@/integrations/supabase/client";

export type ProvinceCode = string;

export interface ProvinceTaxConfig {
  label?: string;
  home_care_bps?: number;
  doctor_escort_bps?: number;
  hospital_discharge_bps?: number;
}

export interface ProvinceConfig {
  code: ProvinceCode;
  name: string;
  isActive: boolean;
  /** Client-facing bookings allowed. */
  bookingsEnabled: boolean;
  /** Caregiver recruitment open. */
  recruitmentEnabled: boolean;
  /** Payment (Stripe) allowed — always false unless bookings are on too. */
  paymentsEnabled: boolean;
  launchStatus: string;          // "live" | "preparation" | "paused"
  timezone: string;
  currency: string;
  taxConfig: ProvinceTaxConfig;
  providerType: string;          // default/required type, e.g. "PSW" | "HCA"
  providerTypes: string[];       // every type supported in this province
  providerTermLong: string;      // "Personal Support Worker"
  providerTermShort: string;     // "PSW"
  registrationRequired: boolean;
  registrationLabel?: string | null;
  cities: string[];
  pricingRegions: string[];
  policyVersion: string;
  agreementVersion: string;
  privacyPolicyVersion: string;
  supportEmail?: string | null;
  supportPhone?: string | null;
  requiredDocuments: string[];
}

/** Safe defaults used before/without a database round-trip. */
export const DEFAULT_PROVINCES: Record<string, ProvinceConfig> = {
  ON: {
    code: "ON",
    name: "Ontario",
    isActive: true,
    bookingsEnabled: true,
    recruitmentEnabled: true,
    paymentsEnabled: true,
    launchStatus: "live",
    timezone: "America/Toronto",
    currency: "CAD",
    taxConfig: {
      label: "HST",
      home_care_bps: 0,
      doctor_escort_bps: 1300,
      hospital_discharge_bps: 1300,
    },
    providerType: "PSW",
    providerTypes: ["PSW", "RPN", "RN"],
    providerTermLong: "Personal Support Worker",
    providerTermShort: "PSW",
    registrationRequired: false,
    registrationLabel: null,
    cities: [],
    pricingRegions: ["default"],
    policyVersion: "on-v1",
    agreementVersion: "on-provider-v1",
    privacyPolicyVersion: "on-privacy-v1",
    supportEmail: "barrie@pswdirect.ca",
    supportPhone: "(249) 288-4787",
    requiredDocuments: [],
  },
  AB: {
    code: "AB",
    name: "Alberta",
    isActive: true,
    bookingsEnabled: false,
    recruitmentEnabled: false,
    paymentsEnabled: false,
    launchStatus: "preparation",
    timezone: "America/Edmonton",
    currency: "CAD",
    taxConfig: {
      label: "GST",
      home_care_bps: 0,
      doctor_escort_bps: 500,
      hospital_discharge_bps: 500,
    },
    providerType: "HCA",
    providerTypes: ["HCA", "LPN", "RN"],
    providerTermLong: "Health Care Aide",
    providerTermShort: "HCA",
    registrationRequired: true,
    registrationLabel: "Alberta HCA registration / practice permit number",
    cities: ["Calgary"],
    pricingRegions: ["default"],
    policyVersion: "ab-v1",
    agreementVersion: "ab-provider-draft-v0",
    privacyPolicyVersion: "ab-privacy-draft-v0",
    supportEmail: "barrie@pswdirect.ca",
    supportPhone: "(249) 288-4787",
    requiredDocuments: [],
  },
};

export const DEFAULT_PROVINCE_CODE = "ON";

export const CANADIAN_PROVINCES: { code: string; name: string }[] = [
  { code: "AB", name: "Alberta" },
  { code: "BC", name: "British Columbia" },
  { code: "MB", name: "Manitoba" },
  { code: "NB", name: "New Brunswick" },
  { code: "NL", name: "Newfoundland and Labrador" },
  { code: "NS", name: "Nova Scotia" },
  { code: "NT", name: "Northwest Territories" },
  { code: "NU", name: "Nunavut" },
  { code: "ON", name: "Ontario" },
  { code: "PE", name: "Prince Edward Island" },
  { code: "QC", name: "Quebec" },
  { code: "SK", name: "Saskatchewan" },
  { code: "YT", name: "Yukon" },
];

/** First postal letter -> province code. X/Y are territories. */
export const FSA_LETTER_TO_PROVINCE: Record<string, string> = {
  A: "NL", B: "NS", C: "PE", E: "NB",
  G: "QC", H: "QC", J: "QC",
  K: "ON", L: "ON", M: "ON", N: "ON", P: "ON",
  R: "MB", S: "SK", T: "AB", V: "BC",
  X: "NT", Y: "YT",
};

const PROVINCE_NAME_TOKENS: Record<string, string> = {
  ALBERTA: "AB",
  "BRITISH COLUMBIA": "BC",
  MANITOBA: "MB",
  "NEW BRUNSWICK": "NB",
  NEWFOUNDLAND: "NL",
  LABRADOR: "NL",
  "NOVA SCOTIA": "NS",
  "NORTHWEST TERRITORIES": "NT",
  NUNAVUT: "NU",
  ONTARIO: "ON",
  "PRINCE EDWARD ISLAND": "PE",
  PEI: "PE",
  QUEBEC: "QC",
  "QUÉBEC": "QC",
  SASKATCHEWAN: "SK",
  YUKON: "YT",
};

const CODES = new Set(CANADIAN_PROVINCES.map((p) => p.code));

/** Province implied by a Canadian postal code, or null. */
export const provinceFromPostalCode = (postal?: string | null): string | null => {
  const first = (postal || "").trim().toUpperCase()[0];
  if (!first || !/[A-Z]/.test(first)) return null;
  return FSA_LETTER_TO_PROVINCE[first] ?? null;
};

/**
 * Province explicitly named in an address. Only comma-delimited segments are
 * inspected so street names like "Quebec Ave" or "Alberta St" are never
 * mistaken for a province.
 */
export const provinceFromAddress = (...addresses: (string | null | undefined)[]): string | null => {
  for (const addr of addresses) {
    if (!addr) continue;
    for (const rawSeg of addr.split(",")) {
      const seg = rawSeg.trim().toUpperCase();
      if (!seg) continue;
      const provinceOnly = seg.replace(/\s+[A-Z]\d[A-Z]\s*\d[A-Z]\d$/, "").trim();
      if (CODES.has(provinceOnly)) return provinceOnly;
      if (PROVINCE_NAME_TOKENS[provinceOnly]) return PROVINCE_NAME_TOKENS[provinceOnly];
    }
  }
  return null;
};

/**
 * The province a service address belongs to. Explicit province field wins,
 * then an address segment, then the postal code. Returns null when unknown.
 */
export const resolveServiceProvince = (input: {
  province?: string | null;
  postalCode?: string | null;
  addresses?: (string | null | undefined)[];
}): string | null => {
  const explicit = (input.province || "").trim().toUpperCase();
  if (CODES.has(explicit)) return explicit;
  return provinceFromAddress(...(input.addresses ?? [])) ?? provinceFromPostalCode(input.postalCode);
};

// ── Database-backed configuration (cached) ──────────────────────────────────

let cache: Record<string, ProvinceConfig> | null = null;
let cachedAt = 0;
const TTL_MS = 60_000;

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapRow = (row: any): ProvinceConfig => ({
  code: row.code,
  name: row.name,
  isActive: !!row.is_active,
  bookingsEnabled: !!row.bookings_enabled,
  recruitmentEnabled: !!row.recruitment_enabled,
  paymentsEnabled: !!row.payments_enabled,
  launchStatus: row.launch_status || "preparation",
  timezone: row.timezone || "America/Toronto",
  currency: row.currency || "CAD",
  taxConfig: (row.tax_config as ProvinceTaxConfig) || {},
  providerType: row.provider_type || "PSW",
  providerTypes: row.provider_types?.length ? row.provider_types : [row.provider_type || "PSW"],
  providerTermLong: row.provider_term_long || "Personal Support Worker",
  providerTermShort: row.provider_term_short || "PSW",
  registrationRequired: !!row.registration_required,
  registrationLabel: row.registration_label,
  cities: row.cities || [],
  pricingRegions: row.pricing_regions?.length ? row.pricing_regions : ["default"],
  policyVersion: row.policy_version || "v1",
  agreementVersion: row.agreement_version || "v1",
  privacyPolicyVersion: row.privacy_policy_version || "v1",
  supportEmail: row.support_email ?? null,
  supportPhone: row.support_phone ?? null,
  requiredDocuments: row.required_documents || [],
});
/* eslint-enable @typescript-eslint/no-explicit-any */

export const clearProvinceCache = () => {
  cache = null;
  cachedAt = 0;
};

export const fetchProvinces = async (): Promise<Record<string, ProvinceConfig>> => {
  if (cache && Date.now() - cachedAt < TTL_MS) return cache;
  try {
    const { data, error } = await supabase.from("provinces" as never).select("*");
    if (error) throw error;
    const rows = (data || []) as unknown[];
    if (!rows.length) return DEFAULT_PROVINCES;
    const map: Record<string, ProvinceConfig> = {};
    for (const row of rows) {
      const cfg = mapRow(row);
      map[cfg.code] = cfg;
    }
    cache = map;
    cachedAt = Date.now();
    return map;
  } catch {
    return DEFAULT_PROVINCES;
  }
};

export const getProvinceConfig = async (code?: string | null): Promise<ProvinceConfig | null> => {
  if (!code) return null;
  const all = await fetchProvinces();
  return all[code.toUpperCase()] ?? DEFAULT_PROVINCES[code.toUpperCase()] ?? null;
};

/**
 * Bookable = province exists, is active, client bookings are enabled AND
 * payment is enabled. All four are re-checked on the server before Stripe.
 */
export const isBookingEnabledForProvince = async (code?: string | null): Promise<boolean> => {
  const cfg = await getProvinceConfig(code);
  return !!cfg && cfg.isActive && cfg.bookingsEnabled && cfg.paymentsEnabled;
};

/** Tax rate (basis points) for a service in a province. */
export const taxBpsForProvince = (
  cfg: ProvinceConfig | null | undefined,
  service: "home_care" | "doctor_escort" | "hospital_discharge",
): number => {
  const configured = cfg?.taxConfig?.[`${service}_bps` as keyof ProvinceTaxConfig];
  if (typeof configured === "number" && isFinite(configured) && configured >= 0) return configured;
  return service === "home_care" ? 0 : 1300;
};

/** Worker wording for a province, e.g. "Personal Support Worker" / "Health Care Aide". */
export const providerTerm = (
  cfg: ProvinceConfig | null | undefined,
  variant: "short" | "long" = "short",
): string => {
  const resolved = cfg ?? DEFAULT_PROVINCES[DEFAULT_PROVINCE_CODE];
  return variant === "long" ? resolved.providerTermLong : resolved.providerTermShort;
};

export const providerTermForCode = (code: string | null | undefined, variant: "short" | "long" = "short"): string =>
  providerTerm(DEFAULT_PROVINCES[(code || DEFAULT_PROVINCE_CODE).toUpperCase()], variant);

// ── Provider ↔ order eligibility (mirrors the server-side dispatch filters) ──

/** One provincial authorization held by a caregiver. */
export interface ProvincialAuthorization {
  province: string;
  providerType: string;
  verificationStatus: string;   // pending | verified | rejected | restricted | expired
  jobEligible: boolean;
  expiresAt?: string | null;
  restrictions?: string | null;
}

export interface ProviderEligibilityInput {
  province?: string | null;
  providerType?: string | null;
  vettingStatus?: string | null;
  eligibleForJobs?: boolean | null;
  registrationStatus?: string | null;
  registrationExpiry?: string | null;
  suspended?: boolean | null;
  /**
   * Provincial authorizations. When present these are the authority — a
   * caregiver may hold authorizations in more than one province, each
   * separately reviewed. Absent = legacy single-province record.
   */
  authorizations?: ProvincialAuthorization[] | null;
}

export interface OrderProvinceRequirement {
  serviceProvince?: string | null;
  requiredProviderType?: string | null;
}

/** True when an authorization is verified, job-eligible and unexpired. */
export const isAuthorizationActive = (
  auth: ProvincialAuthorization,
  now: Date = new Date(),
): boolean => {
  if (auth.verificationStatus !== "verified") return false;
  if (!auth.jobEligible) return false;
  if (auth.expiresAt && new Date(auth.expiresAt).getTime() <= now.getTime()) return false;
  return true;
};

/**
 * True when a provider may see/accept an order. The order's province and
 * provider type must be covered by an active provincial authorization, and
 * the provider must be approved, eligible and unsuspended. Ontario-only
 * caregivers never match Alberta orders and vice versa.
 */
export const canProviderTakeOrder = (
  provider: ProviderEligibilityInput,
  order: OrderProvinceRequirement,
  now: Date = new Date(),
): boolean => {
  const orderProvince = (order.serviceProvince || DEFAULT_PROVINCE_CODE).toUpperCase();
  const requiredType = (
    order.requiredProviderType || DEFAULT_PROVINCES[orderProvince]?.providerType || "PSW"
  ).toUpperCase();

  if (provider.suspended) return false;
  if (provider.vettingStatus !== "approved") return false;
  if (provider.eligibleForJobs === false) return false;

  if (provider.authorizations && provider.authorizations.length) {
    return provider.authorizations.some(
      (a) =>
        (a.province || "").toUpperCase() === orderProvince &&
        (a.providerType || "").toUpperCase() === requiredType &&
        isAuthorizationActive(a, now),
    );
  }

  // Legacy single-province record.
  const providerProvince = (provider.province || DEFAULT_PROVINCE_CODE).toUpperCase();
  if (providerProvince !== orderProvince) return false;
  const providerType = (
    provider.providerType || DEFAULT_PROVINCES[providerProvince]?.providerType || "PSW"
  ).toUpperCase();
  if (requiredType !== providerType) return false;

  const cfg = DEFAULT_PROVINCES[providerProvince];
  if (cfg?.registrationRequired) {
    if (provider.registrationStatus !== "verified") return false;
    if (!provider.registrationExpiry) return false;
    if (new Date(provider.registrationExpiry).getTime() <= now.getTime()) return false;
  }
  return true;
};
