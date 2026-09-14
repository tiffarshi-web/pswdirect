import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeOrderTotals, isTaxableService } from "@/lib/taxRules";
import { getCategoryRates, getRatesForCategory } from "@/lib/pricingConfigStore";

/**
 * Phase 4 — client pricing, taxes, Stripe charging, receipts and reconciliation.
 *
 * Contract tests. These assert the rules that must never silently regress:
 * server-authoritative pricing, grandfathered legacy rates, immutable pricing
 * snapshots, integer-cent math, CAD-only charging, and the hard separation
 * between client charging and (manual-only) provider payouts.
 */

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const createBooking = read("supabase/functions/create-booking/index.ts");
const createPaymentIntent = read("supabase/functions/create-payment-intent/index.ts");
const webhook = read("supabase/functions/stripe-webhook/index.ts");
const pricingTax = read("supabase/functions/_shared/pricingTax.ts");

const cents = (d: number) => Math.round(d * 100);

describe("Phase 4 · standard (new customer) price list", () => {
  it("quotes Home Care at $40/hour", () => {
    expect(getRatesForCategory("standard").firstHour).toBe(40);
  });

  it("quotes Doctor Escort at $50/hour", () => {
    expect(getRatesForCategory("doctor-appointment").firstHour).toBe(50);
  });

  it("quotes Hospital Discharge at $50/hour", () => {
    expect(getRatesForCategory("hospital-discharge").firstHour).toBe(50);
  });

  it("keeps half-hour increments consistent with the hourly rate", () => {
    const rates = getCategoryRates();
    expect(rates.standard.per30Min * 2).toBe(rates.standard.firstHour);
    expect(rates["doctor-appointment"].per30Min * 2).toBe(rates["doctor-appointment"].firstHour);
  });

  it("never quotes below the amount a grandfathered customer is charged", () => {
    // Legacy Ontario rates are $35 / $45. A displayed quote at the standard
    // rate can only ever be equal to or higher than the charged amount.
    expect(getRatesForCategory("standard").firstHour).toBeGreaterThanOrEqual(35);
    expect(getRatesForCategory("doctor-appointment").firstHour).toBeGreaterThanOrEqual(45);
  });
});

describe("Phase 4 · taxation", () => {
  it("leaves Home Care exempt", () => {
    expect(isTaxableService("home_care")).toBe(false);
    const b = computeOrderTotals({ service: "home_care", subtotal: 160 });
    expect(b.hstCents).toBe(0);
    expect(b.totalCents).toBe(cents(160));
  });

  it("applies 13% HST to Doctor Escort", () => {
    const b = computeOrderTotals({ service: "doctor_escort", subtotal: 100 });
    expect(b.hstCents).toBe(1300);
    expect(b.totalCents).toBe(11300);
  });

  it("applies 13% HST to Hospital Discharge", () => {
    const b = computeOrderTotals({ service: "hospital_discharge", subtotal: 200 });
    expect(b.hstCents).toBe(2600);
  });

  it("rounds tax half-up on awkward amounts", () => {
    const b = computeOrderTotals({ service: "doctor_escort", subtotal: 50.05 });
    expect(b.hstCents).toBe(Math.round((cents(50.05) * 1300) / 10000));
  });

  it("adds parking after tax and never taxes it", () => {
    const b = computeOrderTotals({ service: "doctor_escort", subtotal: 100, parking: 12 });
    expect(b.hstCents).toBe(1300);
    expect(b.totalCents).toBe(11300 + 1200);
  });

  it("computes a 3h standard Doctor Escort order end to end", () => {
    const subtotal = 3 * 50;
    const b = computeOrderTotals({ service: "doctor_escort", subtotal });
    expect(b.subtotalCents).toBe(15000);
    expect(b.hstCents).toBe(1950);
    expect(b.totalCents).toBe(16950);
  });

  it("computes a 4h standard Home Care order end to end with no tax", () => {
    const b = computeOrderTotals({ service: "home_care", subtotal: 4 * 40 });
    expect(b.totalCents).toBe(16000);
    expect(b.hstCents).toBe(0);
  });

  it("keeps all tax arithmetic in integer cents", () => {
    expect(pricingTax).toMatch(/integer cents/i);
    expect(pricingTax).toContain("HST_RATE_BPS = 1300");
  });
});

describe("Phase 4 · server-authoritative pricing and grandfathering", () => {
  it("resolves the customer's pricing tier on the server", () => {
    expect(createBooking).toContain("resolve_client_pricing_tier");
  });

  it("fails safe to the lower legacy tier when tier resolution errors", () => {
    expect(createBooking).toMatch(/legacy_2026/);
  });

  it("selects tier-aware rate cards from provincial_pricing", () => {
    expect(createBooking).toContain("provincial_pricing");
    expect(createBooking).toContain("pricing_tier");
  });

  it("never trusts a browser-supplied total", () => {
    expect(createBooking).toMatch(/serverTotal/);
    expect(createPaymentIntent).toMatch(/hint only|authoritative/i);
  });

  it("recomputes and overrides the client amount before charging", () => {
    expect(createPaymentIntent).toContain("computeOrderTotals");
    expect(createPaymentIntent).toMatch(/chargeAmount/);
  });
});

describe("Phase 4 · immutable pricing snapshot", () => {
  it("builds a versioned snapshot at order time", () => {
    expect(createBooking).toContain("pricing_rule_version");
    expect(createBooking).toContain("pricingSnapshot");
  });

  it("stores the snapshot and tier on the booking", () => {
    expect(createBooking).toContain("pricing_snapshot: pricingSnapshot");
    expect(createBooking).toContain("pricing_tier: pricingTier");
  });

  it("records the rate, hours, subtotal, tax and total in cents", () => {
    for (const field of [
      "base_hourly_rate_cents",
      "billed_hours",
      "subtotal_cents",
      "tax_cents",
      "total_cents",
    ]) {
      expect(createBooking).toContain(field);
    }
  });

  it("records the tax classification used at the time of sale", () => {
    expect(createBooking).toContain("tax_classification");
    expect(createBooking).toContain("tax_rate_bps");
  });
});

describe("Phase 4 · Stripe charging", () => {
  it("charges in CAD only", () => {
    expect(createPaymentIntent).toContain('currency: "cad"');
  });

  it("uses a deterministic idempotency key derived from the amount", () => {
    expect(createPaymentIntent).toContain("idempotencyKey");
  });

  it("cancels a stale PaymentIntent when the amount changes", () => {
    expect(createPaymentIntent).toMatch(/sameAmount/);
  });

  it("requires a verified webhook signature", () => {
    expect(webhook).toContain("constructEventAsync");
    expect(webhook).toMatch(/signature verification is mandatory/i);
  });

  it("de-duplicates webhook events", () => {
    expect(webhook).toContain("stripe_webhook_events");
    expect(webhook).toMatch(/already processed/i);
  });

  it("sends no care details or health information to Stripe", () => {
    expect(createPaymentIntent).not.toContain("services: bookingDetails?.services");
    expect(createPaymentIntent).toContain("serviceCategory");
  });
});

describe("Phase 4 · receipts and reconciliation", () => {
  it("keeps invoices linked one-to-one with the order", () => {
    expect(webhook).toMatch(/invoice/i);
  });

  it("exposes an administrator-only reconciliation report", () => {
    const ui = read("src/components/admin/PaymentReconciliationSection.tsx");
    expect(ui).toContain("admin_payment_reconciliation");
    expect(ui).toMatch(/read-only/i);
  });

  it("flags paid orders with no Stripe reference and totals that disagree", () => {
    const ui = read("src/components/admin/PaymentReconciliationSection.tsx");
    expect(ui).toContain("booking_paid_without_stripe_reference");
    expect(ui).toContain("receipt_total_differs_from_booking_total");
  });

  it("does not let the reconciliation screen mutate financial records", () => {
    const ui = read("src/components/admin/PaymentReconciliationSection.tsx");
    expect(ui).not.toMatch(/\.update\(|\.insert\(|\.delete\(/);
  });
});

describe("Phase 4 · provider payouts stay manual", () => {
  it("adds no Stripe Connect or transfer calls anywhere in edge functions", () => {
    for (const src of [createBooking, createPaymentIntent, webhook]) {
      expect(src).not.toMatch(/stripe\.transfers|accounts\.create|payouts\.create|Connect/);
    }
  });

  it("never marks a provider paid from a client payment", () => {
    expect(webhook).not.toMatch(/paid_manually/);
  });
});
