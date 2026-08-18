/**
 * DISPLAY-ONLY mirror of the authoritative server tax engine
 * (`supabase/functions/_shared/pricingTax.ts`).
 *
 * The browser may DISPLAY the calculation but never determines it — every
 * persisted amount and every Stripe charge is computed server-side.
 * Keep the alias tables in sync with the server module.
 */

export const HST_RATE_BPS = 1300;

export type ServiceCode = "home_care" | "doctor_escort" | "hospital_discharge";
export type LegacyCategory = "standard" | "doctor-appointment" | "hospital-discharge";

const HOSPITAL_ALIASES = [
  "hospital_visit", "hospital-visit", "hospital visit",
  "hospital_discharge", "hospital-discharge", "hospital discharge",
  "hospital discharge assistance",
  "hospital pick-up/drop-off (discharge)", "hospital pickup/dropoff (discharge)",
  "hospital pick up drop off discharge", "hospital pickup", "hospital dropoff",
  "discharge", "hospital",
];

const DOCTOR_ALIASES = [
  "doctor_escort", "doctor-escort", "doctor escort",
  "doctor appointment escort", "doctor_appointment", "doctor-appointment",
  "doctor appointment", "doctor visit", "doctors appointment",
  "medical appointment escort", "appointment escort", "escort",
  "transport_assistance", "transport-assistance", "transport assistance",
  "medical transport",
];

const canon = (raw: unknown): string =>
  String(raw ?? "").toLowerCase().replace(/[\u2010-\u2015]/g, "-").replace(/\s+/g, " ").trim();

export function normalizeServiceCode(raw: unknown): ServiceCode {
  const v = canon(raw);
  if (!v) return "home_care";
  if (HOSPITAL_ALIASES.some((a) => v === a || v.includes(a))) return "hospital_discharge";
  if (DOCTOR_ALIASES.some((a) => v === a || v.includes(a))) return "doctor_escort";
  return "home_care";
}

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

export function fromLegacyCategory(category: unknown): ServiceCode {
  const v = canon(category);
  if (v === "hospital-discharge") return "hospital_discharge";
  if (v === "doctor-appointment") return "doctor_escort";
  return "home_care";
}

export const toCents = (amount: unknown): number => {
  const n = Number(amount);
  return !isFinite(n) || isNaN(n) ? 0 : Math.round(n * 100);
};
export const fromCents = (cents: number): number => Math.round(cents) / 100;

export interface TaxBreakdown {
  serviceCode: ServiceCode;
  isTaxable: boolean;
  subtotalCents: number;
  hstCents: number;
  parkingCents: number;
  totalCents: number;
  subtotal: number;
  hst: number;
  parking: number;
  total: number;
}

export function computeOrderTotals(input: {
  subtotal: number;
  parking?: number;
  service: ServiceCode | string | string[] | null | undefined;
}): TaxBreakdown {
  const serviceCode = Array.isArray(input.service)
    ? resolveServiceCode(input.service)
    : normalizeServiceCode(input.service);
  const subtotalCents = Math.max(0, toCents(input.subtotal));
  const taxable = isTaxableService(serviceCode);
  const parkingCents = taxable ? Math.min(Math.max(toCents(input.parking ?? 0), 0), 50_000) : 0;
  const hstCents = taxable ? Math.round((subtotalCents * HST_RATE_BPS) / 10_000) : 0;
  const totalCents = subtotalCents + hstCents + parkingCents;
  return {
    serviceCode,
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

export const formatCAD = (amount: number): string =>
  `$${(Math.round((Number(amount) || 0) * 100) / 100).toFixed(2)}`;
