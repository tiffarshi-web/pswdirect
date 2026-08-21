/**
 * Single source of truth for "may this URL be indexed / appear in a sitemap".
 *
 * Consumed by:
 *  - src/components/seo/PrivateRouteMeta.tsx (runtime robots directive)
 *  - scripts/generate-sitemap.ts             (build-time sitemap eligibility)
 *  - src/pages/seo/__tests__/seoIndexingRegression.test.ts
 *
 * Rules encoded here (from the Aug 2026 Search Console consolidation audit):
 *  1. Account / auth / checkout / booking-management routes are never indexable.
 *  2. Individual PSW profile routes are never indexable and never in a sitemap.
 *  3. Redirect aliases are never indexable and never in a sitemap.
 *  4. Query-string and trailing-slash variants are never canonical.
 */

export const SITE_ORIGIN = "https://pswdirect.ca";

/**
 * Private / functional routes. These must render `noindex,nofollow` and must
 * never appear in any sitemap or internal SEO link module.
 */
export const PRIVATE_PATH_PATTERNS: RegExp[] = [
  // Client account + booking management
  /^\/client(\/|$)/,
  /^\/client-login(\/|$)/,
  /^\/order-confirmed(\/|$)/,
  /^\/track(\/|$)/,
  /^\/pay\//,
  // PSW worker app + private profile pages
  /^\/psw(\/|$)/,
  /^\/psw-login(\/|$)/,
  /^\/psw-pending(\/|$)/,
  /^\/psw-diagnostics(\/|$)/,
  /^\/join-team(\/|$)/,
  // Administrator
  /^\/admin(\/|$)/,
  /^\/admin-setup(\/|$)/,
  /^\/office-login(\/|$)/,
  // Verification + OAuth + install utility routes
  /^\/verify\//,
  /^\/\.lovable\//,
  /^\/install(\/|$)/,
];

/**
 * Exact private paths that must win over the broad `psw-*` / `client-*`
 * public-prefix exceptions below.
 */
const PRIVATE_EXACT = new Set([
  "/client-login",
  "/psw-login",
  "/psw-pending",
  "/psw-diagnostics",
  "/psw-signup",
  "/psw-onboarding",
  "/psw-application",
  "/office-login",
  "/admin-setup",
]);

/** Public SEO routes that live under a private prefix and must stay indexable. */
const PRIVATE_PREFIX_EXCEPTIONS: RegExp[] = [
  /^\/psw-directory(\/|$)/,
  /^\/psw-near-me(\/|$)/,
  /^\/psw-cost(\/|$)/,
  /^\/psw-hourly-rate(\/|$)/,
  /^\/psw-pay-calculator(\/|$)/,
  /^\/psw-agency-vs-private-pay(\/|$)/,
  /^\/psw-work-areas-ontario(\/|$)/,
  /^\/psw-after-surgery(\/|$)/,
  /^\/psw-part-time-jobs(\/|$)/,
  // Programmatic SEO families that begin with "psw-" or "psw" + hyphen.
  /^\/psw-[a-z0-9-]+$/,
  /^\/client-[a-z0-9-]+$/,
];

/** Normalizes a URL or path to a leading-slash, no-query, no-trailing-slash path. */
export const normalizePath = (input: string): string => {
  let path = input;
  try {
    if (/^https?:\/\//i.test(input)) path = new URL(input).pathname;
  } catch {
    /* fall through to string handling */
  }
  path = path.split("?")[0].split("#")[0];
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path.toLowerCase();
};

/** True when the path is an account / auth / checkout / private-profile route. */
export const isPrivatePath = (input: string): boolean => {
  const path = normalizePath(input);
  if (path === "/psw/profile" || path.startsWith("/psw/profile/")) return true;
  if (PRIVATE_EXACT.has(path)) return true;
  if (PRIVATE_PREFIX_EXCEPTIONS.some((re) => re.test(path))) return false;
  return PRIVATE_PATH_PATTERNS.some((re) => re.test(path));
};

/** Robots directive for a private route. Missing/invalid states use nofollow. */
export const privateRobotsDirective = (_path: string): string => "noindex,nofollow";

/** True for an individual PSW profile route (`/psw/profile/:slug`). */
export const isPswProfilePath = (input: string): boolean => {
  const path = normalizePath(input);
  return path.startsWith("/psw/profile/");
};

/** Absolute self-referencing canonical for an eligible public path. */
export const absoluteCanonical = (input: string): string =>
  `${SITE_ORIGIN}${normalizePath(input) === "/" ? "/" : normalizePath(input)}`;
