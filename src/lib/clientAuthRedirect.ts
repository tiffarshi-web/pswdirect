// Allowlist for passwordless client-portal redirects.
// Never pass an arbitrary `redirect` value to Supabase — only these paths.
const ALLOWED_PATHS = ["/client", "/client/", "/client-login"] as const;

const ALLOWED_ORIGINS = [
  "https://pswdirect.ca",
  "https://www.pswdirect.ca",
  "https://psadirect.ca",
  "https://www.psadirect.ca",
  "https://pswdirect.lovable.app",
];

export const DEFAULT_CLIENT_REDIRECT_PATH = "/client";

/** Returns a safe same-origin absolute URL for the client portal. */
export function buildClientRedirectUrl(requested?: string | null): string {
  const origin = typeof window !== "undefined" ? window.location.origin : ALLOWED_ORIGINS[0];
  const safeOrigin =
    ALLOWED_ORIGINS.includes(origin) || /^https?:\/\/(localhost|.*\.lovableproject\.com|.*\.lovable\.app)(:\d+)?$/.test(origin)
      ? origin
      : ALLOWED_ORIGINS[0];

  let path = DEFAULT_CLIENT_REDIRECT_PATH;
  if (requested) {
    try {
      // Reject absolute URLs / protocol-relative / traversal outright.
      if (!requested.startsWith("/") || requested.startsWith("//")) {
        path = DEFAULT_CLIENT_REDIRECT_PATH;
      } else {
        const candidate = requested.split("?")[0].split("#")[0];
        path = (ALLOWED_PATHS as readonly string[]).includes(candidate)
          ? candidate
          : DEFAULT_CLIENT_REDIRECT_PATH;
      }
    } catch {
      path = DEFAULT_CLIENT_REDIRECT_PATH;
    }
  }

  return `${safeOrigin}${path}`;
}

export function isAllowedClientPath(path: string): boolean {
  return (ALLOWED_PATHS as readonly string[]).includes(path);
}
