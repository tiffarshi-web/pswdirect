import { WORKER_ROUTE_PATTERNS } from "../workerRoutes";

/**
 * Deep-link and push-notification link handling.
 *
 * A link can only ever select a Worker screen. Anything unknown, public,
 * client-facing, or admin resolves to the dashboard, and the route guards still
 * require an authenticated approved worker — a link can never bypass sign-in.
 */

export const WORKER_UNIVERSAL_LINK_HOSTS = ["pswdirect.ca", "www.pswdirect.ca"] as const;
export const WORKER_CUSTOM_SCHEME = "ca.pswdirect.worker";

const JOB_PATH = /^\/psw\/jobs\/([A-Za-z0-9-]{3,32})$/;
const DASHBOARD_TABS = [
  "available",
  "active",
  "schedule",
  "coverage",
  "messages",
  "history",
  "earnings",
  "caresheets",
  "documents",
  "profile",
];

export function resolveDeepLink(rawUrl: string): string {
  let path = "";
  let search = "";

  try {
    const url = new URL(rawUrl);
    if (url.protocol === `${WORKER_CUSTOM_SCHEME}:`) {
      // ca.pswdirect.worker:///psw?tab=active  or  ca.pswdirect.worker://psw
      path = url.pathname && url.pathname !== "/" ? url.pathname : `/${url.hostname}`;
    } else {
      const host = url.hostname.toLowerCase();
      if (!WORKER_UNIVERSAL_LINK_HOSTS.includes(host as (typeof WORKER_UNIVERSAL_LINK_HOSTS)[number])) {
        return "/psw";
      }
      path = url.pathname;
    }
    search = url.search;
  } catch {
    return "/psw";
  }

  path = path.replace(/\/+$/, "") || "/psw";

  const job = JOB_PATH.exec(path);
  if (job) return `/psw/jobs/${job[1]}`;

  if (path === "/psw") {
    const tab = new URLSearchParams(search).get("tab");
    return tab && DASHBOARD_TABS.includes(tab) ? `/psw?tab=${tab}` : "/psw";
  }

  if ((WORKER_ROUTE_PATTERNS as readonly string[]).includes(path)) return path;

  return "/psw";
}

/** Push payloads carry the same link contract as deep links. */
export function resolveNotificationTarget(data: Record<string, unknown> | undefined): string {
  const link = data?.link ?? data?.url ?? data?.path;
  if (typeof link !== "string" || !link) return "/psw";
  if (link.startsWith("/")) return resolveDeepLink(`https://pswdirect.ca${link}`);
  return resolveDeepLink(link);
}
