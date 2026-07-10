// Shared Progressier push notification helper.
//
// Progressier's Send API requires ONE recipient per request:
//   recipients: { email: "user@example.com" }  ✅
//   recipients: { emails: [...] }              ❌ (returns 403 / silently drops)
//
// This helper:
//   • Sends one request per recipient (fan-out with limited concurrency).
//   • Retries transient failures (429, 500, 502, 503, 504, network) with exponential backoff.
//   • Does NOT retry permanent failures (400/401/403/404/422).
//   • Never throws — always returns a per-recipient result array so a partial
//     failure never aborts the batch.
//   • Optionally writes a per-recipient row to `push_delivery_logs`.

// deno-lint-ignore-file no-explicit-any
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export type ProgressierPushInput = {
  title: string;
  body: string;
  url: string;
  icon?: string;
};

export type PushRecipientResult = {
  email: string;
  ok: boolean;
  status: number;
  attempts: number;
  response_body: string;
  error?: string;
  retryable_failure?: boolean;
};

export type SendProgressierPushOptions = {
  apiKey: string;
  appId?: string;                         // Progressier app id (defaults to production)
  endpoint?: string;                      // full override for tests
  concurrency?: number;                   // default 5
  maxAttempts?: number;                   // default 3 (initial + 2 retries)
  baseBackoffMs?: number;                 // default 500
  supabase?: SupabaseClient | null;       // if provided, log each attempt
  logContext?: {
    booking_id?: string | null;
    booking_code?: string | null;
    source?: string;                       // e.g. "notify-psws", "dispatch-escalation"
  };
};

const DEFAULT_APP_ID = "xXf0UWVAPdw78va7cNFf";
const TRANSIENT_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function logDelivery(
  supabase: SupabaseClient | null | undefined,
  ctx: SendProgressierPushOptions["logContext"] | undefined,
  payload: ProgressierPushInput,
  result: PushRecipientResult,
) {
  if (!supabase) return;
  try {
    await supabase.from("push_delivery_logs").insert({
      booking_id: ctx?.booking_id ?? null,
      booking_code: ctx?.booking_code ?? null,
      source: ctx?.source ?? null,
      recipient_email: result.email,
      title: payload.title,
      url: payload.url,
      http_status: result.status,
      attempts: result.attempts,
      success: result.ok,
      response_body: result.response_body?.slice(0, 4000) ?? null,
      error_message: result.error ?? null,
    });
  } catch (e) {
    // Never let logging failure break dispatch.
    console.warn("push_delivery_logs insert failed (non-fatal):", (e as Error).message);
  }
}

async function sendOne(
  email: string,
  payload: ProgressierPushInput,
  opts: SendProgressierPushOptions,
): Promise<PushRecipientResult> {
  const endpoint =
    opts.endpoint ?? `https://progressier.app/${opts.appId ?? DEFAULT_APP_ID}/send`;
  const maxAttempts = Math.max(1, opts.maxAttempts ?? 3);
  const baseBackoff = opts.baseBackoffMs ?? 500;

  let lastStatus = 0;
  let lastBody = "";
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${opts.apiKey}`,
        },
        body: JSON.stringify({
          title: payload.title,
          body: payload.body,
          url: payload.url,
          ...(payload.icon ? { icon: payload.icon } : {}),
          recipients: { email },
        }),
      });
      lastStatus = res.status;
      lastBody = await res.text();

      if (res.ok) {
        return {
          email,
          ok: true,
          status: res.status,
          attempts: attempt,
          response_body: lastBody,
        };
      }

      // Permanent failure — do not retry.
      if (!TRANSIENT_STATUS.has(res.status)) {
        return {
          email,
          ok: false,
          status: res.status,
          attempts: attempt,
          response_body: lastBody,
          error: `Progressier rejected recipient (HTTP ${res.status})`,
          retryable_failure: false,
        };
      }

      // Transient — fall through to backoff.
    } catch (e) {
      lastError = (e as Error).message ?? String(e);
      lastStatus = 0;
      lastBody = "";
    }

    if (attempt < maxAttempts) {
      const jitter = Math.floor(Math.random() * 150);
      await sleep(baseBackoff * 2 ** (attempt - 1) + jitter);
    }
  }

  return {
    email,
    ok: false,
    status: lastStatus,
    attempts: maxAttempts,
    response_body: lastBody,
    error: lastError ?? `Transient failure after ${maxAttempts} attempts`,
    retryable_failure: true,
  };
}

export type SendProgressierPushResult = {
  attempted: number;
  succeeded: number;
  failed: number;
  results: PushRecipientResult[];
};

/**
 * Send a Progressier push to a list of recipient emails.
 * Fan-out with bounded concurrency; partial failures never abort the batch.
 */
export async function sendProgressierPush(
  recipients: string[],
  payload: ProgressierPushInput,
  opts: SendProgressierPushOptions,
): Promise<SendProgressierPushResult> {
  const emails = Array.from(new Set(
    recipients.map((e) => (e || "").trim().toLowerCase()).filter(Boolean),
  ));
  if (emails.length === 0) {
    return { attempted: 0, succeeded: 0, failed: 0, results: [] };
  }

  const concurrency = Math.max(1, opts.concurrency ?? 5);
  const results: PushRecipientResult[] = [];
  let idx = 0;

  async function worker() {
    while (idx < emails.length) {
      const myIdx = idx++;
      const email = emails[myIdx];
      const r = await sendOne(email, payload, opts);
      results.push(r);
      await logDelivery(opts.supabase, opts.logContext, payload, r);
      const tag = opts.logContext?.booking_code ? `[${opts.logContext.booking_code}] ` : "";
      if (r.ok) {
        console.log(`📱 ${tag}push OK → ${email} (attempt ${r.attempts}, status ${r.status})`);
      } else {
        console.warn(
          `⚠️ ${tag}push FAIL → ${email} attempts=${r.attempts} status=${r.status} retryable=${r.retryable_failure ?? false} err=${r.error ?? ""} body=${(r.response_body || "").slice(0, 300)}`,
        );
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, emails.length) }, () => worker());
  await Promise.all(workers);

  const succeeded = results.filter((r) => r.ok).length;
  return {
    attempted: emails.length,
    succeeded,
    failed: emails.length - succeeded,
    results,
  };
}

/** Convenience: build a service-role client for logging. */
export function serviceRoleClient(): SupabaseClient | null {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key);
}
