/**
 * Production logging for the packaged app.
 *
 * Anything that could carry a token, a client address, health information or
 * money is redacted before it reaches the device log, which is readable over
 * USB on both platforms.
 */

const SENSITIVE_KEY = /(token|password|secret|authorization|address|postal|phone|email|health|diagnos|medic|amount|payout|rate|sin|card)/i;
const BEARER = /\b(eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/g;

export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[deep]";
  if (typeof value === "string") return value.replace(BEARER, "[redacted-token]");
  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE_KEY.test(key) ? "[redacted]" : redact(item, depth + 1);
    }
    return out;
  }
  return value;
}

export function workerLog(scope: string, message: string, details?: unknown): void {
  if (details === undefined) {
    console.info(`[worker:${scope}] ${message}`);
    return;
  }
  console.info(`[worker:${scope}] ${message}`, redact(details));
}

export function workerError(scope: string, message: string, details?: unknown): void {
  console.error(`[worker:${scope}] ${message}`, details === undefined ? "" : redact(details));
}
