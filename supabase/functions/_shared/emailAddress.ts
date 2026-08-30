/**
 * RECIPIENT ADDRESS NORMALIZATION — PSW Direct Canada
 *
 * Stored client emails have historically included stray whitespace and plain
 * typos ("name@gmailcom", "name@rogers,com"). Sending those straight to the
 * provider produces a 422 `Invalid \`to\` field`, which some senders turned
 * into an HTTP 500 back to the browser.
 *
 * Rules:
 *   - normalize: trim, strip wrapping <>, remove internal whitespace, lowercase
 *   - validate: single @, a dot-bearing domain, no commas/spaces
 * We never "repair" a typo — a bad address is reported, not guessed at.
 */

export function normalizeEmailAddress(raw: unknown): string {
  return String(raw ?? "")
    .trim()
    .replace(/^<|>$/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[a-z]{2,}$/i;

export function isValidEmailAddress(raw: unknown): boolean {
  return EMAIL_RE.test(normalizeEmailAddress(raw));
}

/** Normalize + validate in one step. */
export function resolveRecipient(raw: unknown): { ok: boolean; email: string } {
  const email = normalizeEmailAddress(raw);
  return { ok: EMAIL_RE.test(email), email };
}
