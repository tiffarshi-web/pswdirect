/**
 * AUTHORITATIVE SERVER-SIDE PRICING / TAX ENGINE — PSW Direct Canada
 *
 * Single source of truth for service-code normalization and HST.
 * Every order channel (client single-day, client multi-day, admin phone /
 * manual orders, PaymentIntent creation, additional charges, invoices,
 * refunds) MUST resolve taxability through this module.
 *
 * Rules (Ontario):
 *   home_care          → non-taxable
 *   doctor_escort      → 13% HST
 *   hospital_discharge → 13% HST
 *
 * Parking / pass-through disbursements are NOT taxable and are added after HST.
 * All arithmetic is performed in integer cents.
 */

export const HST_RATE_BPS = 1300; // 13.00% in basis points

export type ServiceCode = "home_care" | "doctor_escort" | "hospital_discharge";

/** Legacy category identifiers persisted in app_settings / pricing config. */
export type LegacyCategory = "standard" | "doctor-appointment" | "hospital-discharge";

const HOSPITAL_ALIASES = [
  "hospital_visit",
  "hospital-visit",
  "hospital visit",
  "hospital_discharge",
  "hospital-discharge",
  "hospital discharge",
  "hospital discharge assistance",
  "hospital pick-up/drop-off (discharge)",
  "hospital pickup/dropoff (discharge)",
  "hospital pick up drop off discharge",
  "hospital pickup",
  "hospital dropoff",
  "discharge",
  "hospital",
];

const DOCTOR_ALIASES = [
  "doctor_escort",
  "doctor-escort",
  "doctor escort",
  "doctor appointment escort",
  "doctor_appointment",
  "doctor-appointment",
  "doctor appointment",
  "doctor visit",
  "doctors appointment",
  "medical appointment escort",
  "appointment escort",
  "escort",
  "transport_assistance",
  "transport-assistance",
  "transport assistance",
  "medical transport",
];

const canon = (raw: unknown): string =>
  String(raw ?? "")
    .toLowerCase()
    .replace(/[\u2010-\u2015]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Map any inbound service identifier / label / alias to an authoritative code.
 * Unknown identifiers fall back to `home_care` (non-taxable) — but callers
 * should resolve over the FULL service list via `resolveServiceCode`.
 */
export function normalizeServiceCode(raw: unknown): ServiceCode {
  const v = canon(raw);
  if (!v) return "home_care";
  if (HOSPITAL_ALIASES.some((a) => v === a || v.includes(a))) return "hospital_discharge";
  if (DOCTOR_ALIASES.some((a) => v === a || v.includes(a))) return "doctor_escort";
  return "home_care";
}

/**
 * Resolve the highest-priority (most taxable) service code for an order.
 * hospital_discharge > doctor_escort > home_care
 */
export function resolveServiceCode(serviceTypes: unknown): ServiceCode {
  const list = Array.isArray(serviceTypes) ? serviceTypes : [serviceTypes];
  let code: ServiceCode = "home_care";
  for (const item of list) {
    const c = normalizeServiceCode(item);
    if (c === "hospital_discharge") return "hospital_discharge";
    if (c === "doctor_escort") code = "doctor_escort";
  }
  return code;
}

export function isTaxableService(code: ServiceCode): boolean {
  return code === "doctor_escort" || code === "hospital_discharge";
}

export function toLegacyCategory(code: ServiceCode): LegacyCategory {
  if (code === "hospital_discharge") return "hospital-discharge";
  if (code === "doctor_escort") return "doctor-appointment";
  return "standard";
}

export function fromLegacyCategory(category: unknown): ServiceCode {
  const v = canon(category);
  if (v === "hospital-discharge") return "hospital_discharge";
  if (v === "doctor-appointment") return "doctor_escort";
  return "home_care";
}

/** Dollars → integer cents (half-up, tolerant of strings/nulls). */
export function toCents(amount: unknown): number {
  const n = Number(amount);
  if (!isFinite(n) || isNaN(n)) return 0;
  return Math.round(n * 100);
}

/** Integer cents → dollars with 2-decimal precision. */
export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export interface TaxBreakdown {
  serviceCode: ServiceCode;
  category: LegacyCategory;
  isTaxable: boolean;
  subtotalCents: number;
  hstCents: number;
  parkingCents: number;
  totalCents: number;
  /** Dollar mirrors for persistence / display. */
  subtotal: number;
  hst: number;
  parking: number;
  total: number;
}

export interface TaxInput {
  /** Taxable service + surge/rush lines, in dollars OR cents (see `inCents`). */
  subtotal: number;
  /** Non-taxable pass-through (parking, tolls). */
  parking?: number;
  /** Authoritative code, or any alias / service-type array. */
  service: ServiceCode | string | string[] | null | undefined;
  inCents?: boolean;
}

/**
 * THE authoritative calculation. Integer-cents only.
 *   subtotal = taxable service + applicable charge lines
 *   HST      = round(subtotal * 13%)   (half-up)
 *   total    = subtotal + HST + non-taxable pass-through
 */
export function computeOrderTotals(input: TaxInput): TaxBreakdown {
  const serviceCode = Array.isArray(input.service)
    ? resolveServiceCode(input.service)
    : normalizeServiceCode(input.service);

  const subtotalCents = Math.max(
    0,
    input.inCents ? Math.round(Number(input.subtotal) || 0) : toCents(input.subtotal)
  );
  const rawParking = input.inCents
    ? Math.round(Number(input.parking) || 0)
    : toCents(input.parking ?? 0);
  const taxable = isTaxableService(serviceCode);

  // Parking is only a valid pass-through on transport-type orders. Clamped $500.
  const parkingCents = taxable ? Math.min(Math.max(rawParking, 0), 50_000) : 0;

  const hstCents = taxable
    ? Math.round((subtotalCents * HST_RATE_BPS) / 10_000)
    : 0;

  const totalCents = subtotalCents + hstCents + parkingCents;

  return {
    serviceCode,
    category: toLegacyCategory(serviceCode),
    isTaxable: taxable,
    subtotalCents,
    hstCents,
    parkingCents,
    totalCents,
    subtotal: fromCents(subtotalCents),
    hst: fromCents(hstCents),
    parking: fromCents(parkingCents),
    total: fromCents(totalCents),
  };
}

/**
 * Verify a stored/quoted total against the authoritative engine.
 * Returns the expected cents and whether the candidate matches exactly.
 */
export function verifyTotalCents(
  candidateCents: number,
  input: TaxInput
): { ok: boolean; expectedCents: number; breakdown: TaxBreakdown } {
  const breakdown = computeOrderTotals(input);
  return {
    ok: Math.round(candidateCents) === breakdown.totalCents,
    expectedCents: breakdown.totalCents,
    breakdown,
  };
}
