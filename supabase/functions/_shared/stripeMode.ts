/**
 * RUNTIME STRIPE KEY-MODE GUARD — PSW Direct Canada
 *
 * Two completely separate credential sets:
 *   live  → STRIPE_SECRET_KEY        + STRIPE_WEBHOOK_SECRET
 *   test  → STRIPE_TEST_SECRET_KEY   + STRIPE_TEST_WEBHOOK_SECRET
 *
 * Rules enforced here (fail closed, never silently downgrade):
 *   1. A booking / group flagged `is_test_data = true` may ONLY be charged
 *      with an `sk_test_` key. If the test key is absent, the charge is
 *      refused — it must never fall back to the live key.
 *   2. A real (non-test) booking may ONLY be charged with the live key.
 *   3. Key prefixes must match the requested mode: `sk_test_` for test,
 *      `sk_live_` for live.
 *   4. A verified webhook event's `livemode` flag must match the mode of the
 *      signing secret that verified it, and must match the test/live nature
 *      of the records it is about to finalize.
 */

export type StripeMode = "live" | "test";

export class StripeModeError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = "StripeModeError";
  }
}

/** Which mode a record must be processed in. */
export function modeForRecord(isTestData: unknown): StripeMode {
  return isTestData === true ? "test" : "live";
}

/** Resolve + validate the secret key for a mode. Throws on any mismatch. */
export function getStripeSecretKey(mode: StripeMode): string {
  if (mode === "test") {
    const key = Deno.env.get("STRIPE_TEST_SECRET_KEY");
    if (!key) {
      throw new StripeModeError(
        "test_mode_not_configured",
        "STRIPE_TEST_SECRET_KEY is not configured. Test-data orders cannot be charged, and must never use the live key.",
      );
    }
    if (!key.startsWith("sk_test_")) {
      throw new StripeModeError(
        "key_mode_mismatch",
        "STRIPE_TEST_SECRET_KEY is not a test key (expected the sk_test_ prefix).",
      );
    }
    return key;
  }

  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) {
    throw new StripeModeError("live_mode_not_configured", "STRIPE_SECRET_KEY is not configured.");
  }
  if (key.startsWith("sk_test_")) {
    throw new StripeModeError(
      "key_mode_mismatch",
      "A live (non-test) order cannot be charged with a test key.",
    );
  }
  if (!key.startsWith("sk_live_")) {
    throw new StripeModeError("key_mode_mismatch", "STRIPE_SECRET_KEY has an unrecognised prefix.");
  }
  return key;
}

/** Signing secrets to attempt, live first. Test is only present when configured. */
export function webhookSecretCandidates(): Array<{ mode: StripeMode; secret: string }> {
  const out: Array<{ mode: StripeMode; secret: string }> = [];
  const live = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  const test = Deno.env.get("STRIPE_TEST_WEBHOOK_SECRET");
  if (live) out.push({ mode: "live", secret: live });
  if (test) out.push({ mode: "test", secret: test });
  return out;
}

/** A test event must carry livemode=false; a live event livemode=true. */
export function assertEventMatchesMode(event: { livemode?: boolean }, mode: StripeMode): void {
  const expected = mode === "live";
  if (Boolean(event?.livemode) !== expected) {
    throw new StripeModeError(
      "livemode_mismatch",
      `Event livemode=${event?.livemode} was verified with the ${mode} signing secret.`,
    );
  }
}

/** The records being finalized must belong to the same mode as the event. */
export function assertRecordMatchesMode(isTestData: unknown, mode: StripeMode): void {
  const recordMode = modeForRecord(isTestData);
  if (recordMode !== mode) {
    throw new StripeModeError(
      "record_mode_mismatch",
      `A ${mode} Stripe event cannot finalize a ${recordMode}-mode record.`,
    );
  }
}
