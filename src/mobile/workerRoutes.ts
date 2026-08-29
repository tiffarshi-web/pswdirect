/** Routes compiled into the Worker shell. Website/client/admin/SEO paths are absent. */
export const WORKER_ROUTE_PATTERNS = [
  "/psw-login",
  "/join-team",
  "/psw-pending",
  "/psw",
  "/psw/jobs/:bookingCode",
] as const;

export function workerFallbackPath(isAuthenticatedPSW: boolean): "/psw" | "/psw-login" {
  return isAuthenticatedPSW ? "/psw" : "/psw-login";
}
