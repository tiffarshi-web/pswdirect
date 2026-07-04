// Shared helper: independently verify a Stripe PaymentIntent before trusting
// any client-supplied payment identifier. Never mark a booking paid without
// calling this and receiving { ok: true }.
//
// Usage:
//   const result = await verifyStripePayment(stripe, paymentIntentId, {
//     expectedAmountCents: Math.round(booking.total * 100),
//     expectedCurrency: "cad",
//     expectedMetadata: { booking_id: booking.id },
//   });
//   if (!result.ok) return json({ error: result.reason }, 400);

import type Stripe from "npm:stripe@14.21.0";

export type VerifyResult =
  | { ok: true; paymentIntent: Stripe.PaymentIntent }
  | { ok: false; code: string; reason: string; details?: Record<string, unknown> };

export interface VerifyOptions {
  expectedAmountCents: number;
  expectedCurrency?: string; // default "cad"
  /** Allowed cent variance for rounding (default 1). */
  amountToleranceCents?: number;
  /** Metadata keys that must match if present on the PI. */
  expectedMetadata?: Record<string, string | undefined | null>;
}

export async function verifyStripePayment(
  stripe: Stripe,
  paymentIntentId: unknown,
  opts: VerifyOptions,
): Promise<VerifyResult> {
  if (typeof paymentIntentId !== "string" || !paymentIntentId.startsWith("pi_")) {
    return { ok: false, code: "invalid_pi_format", reason: "Invalid PaymentIntent id" };
  }

  let pi: Stripe.PaymentIntent;
  try {
    pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[stripe-verify] retrieve failed", { paymentIntentId, msg });
    return { ok: false, code: "pi_not_found", reason: "PaymentIntent not found on Stripe", details: { msg } };
  }

  if (pi.status !== "succeeded") {
    console.warn("[stripe-verify] not succeeded", { id: pi.id, status: pi.status });
    return { ok: false, code: "pi_not_succeeded", reason: `PaymentIntent status is ${pi.status}`, details: { status: pi.status } };
  }

  const expectedCurrency = (opts.expectedCurrency || "cad").toLowerCase();
  if ((pi.currency || "").toLowerCase() !== expectedCurrency) {
    console.warn("[stripe-verify] currency mismatch", { id: pi.id, got: pi.currency, expected: expectedCurrency });
    return {
      ok: false,
      code: "currency_mismatch",
      reason: `Currency mismatch: expected ${expectedCurrency}, got ${pi.currency}`,
      details: { got: pi.currency, expected: expectedCurrency },
    };
  }

  const tolerance = opts.amountToleranceCents ?? 1;
  const received = pi.amount_received ?? pi.amount ?? 0;
  if (Math.abs(received - opts.expectedAmountCents) > tolerance) {
    console.warn("[stripe-verify] amount mismatch", {
      id: pi.id,
      received,
      expected: opts.expectedAmountCents,
    });
    return {
      ok: false,
      code: "amount_mismatch",
      reason: `Amount mismatch: expected ${opts.expectedAmountCents} cents, got ${received}`,
      details: { got: received, expected: opts.expectedAmountCents },
    };
  }

  if (opts.expectedMetadata) {
    for (const [k, v] of Object.entries(opts.expectedMetadata)) {
      if (!v) continue;
      const got = pi.metadata?.[k];
      if (got && got !== v) {
        console.warn("[stripe-verify] metadata mismatch", { id: pi.id, key: k, got, expected: v });
        return {
          ok: false,
          code: "metadata_mismatch",
          reason: `PaymentIntent metadata.${k} does not match booking`,
          details: { key: k, got, expected: v },
        };
      }
    }
  }

  return { ok: true, paymentIntent: pi };
}
