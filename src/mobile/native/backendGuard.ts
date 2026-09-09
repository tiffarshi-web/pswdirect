/**
 * The Worker shell may only ever talk to the Canadian PSW Direct backend.
 *
 * PNS Direct (Pakistan) and PSA Direct live in other projects; a build that
 * points at them — by mistake or by tampering — must fail loudly instead of
 * shipping. This runs at startup, before any authenticated request.
 */

export const APPROVED_BACKEND_PROJECT_REFS = ["pavibobervhqkfzwkotw"] as const;

/** Hosts that must never appear in a Worker build. */
export const FORBIDDEN_BACKEND_MARKERS = ["pnsdirect", "pns-direct", "psadirect", "psa-direct"] as const;

export type BackendCheck =
  | { ok: true; projectRef: string }
  | { ok: false; reason: string };

export function checkWorkerBackendUrl(rawUrl: string | undefined): BackendCheck {
  if (!rawUrl) return { ok: false, reason: "Backend URL is not configured for this build." };

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "Backend URL is malformed." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, reason: "Backend URL must use HTTPS." };
  }

  const host = url.hostname.toLowerCase();
  const forbidden = FORBIDDEN_BACKEND_MARKERS.find((marker) => host.includes(marker));
  if (forbidden) {
    return { ok: false, reason: `Backend URL points at a non-PSW Direct Canada project (${forbidden}).` };
  }

  const ref = APPROVED_BACKEND_PROJECT_REFS.find(
    (approved) => host === `${approved}.supabase.co` || host.includes(approved),
  );
  if (!ref) {
    return { ok: false, reason: "Backend URL is not an approved PSW Direct Canada project." };
  }

  return { ok: true, projectRef: ref };
}

/**
 * Secrets must never reach the mobile bundle. Only the publishable/anon key and
 * public Maps browser key are allowed; anything service-role or Stripe-secret
 * shaped is a release blocker.
 */
export function findForbiddenSecretKeys(env: Record<string, unknown>): string[] {
  const forbidden: string[] = [];
  for (const [name, value] of Object.entries(env)) {
    const upper = name.toUpperCase();
    if (upper.includes("SERVICE_ROLE") || upper.includes("SECRET_KEY") || upper === "STRIPE_SECRET_KEY") {
      forbidden.push(name);
      continue;
    }
    if (typeof value === "string" && (value.startsWith("sk_live_") || value.startsWith("sk_test_") || value.startsWith("rk_live_"))) {
      forbidden.push(name);
    }
  }
  return forbidden;
}
