/**
 * Deep-link / notification link handling for the Client app.
 * A link can only select a client screen; anything else lands on /client,
 * and the route guard still requires sign-in.
 */
export const CLIENT_UNIVERSAL_LINK_HOSTS = ["pswdirect.ca", "www.pswdirect.ca"] as const;
export const CLIENT_CUSTOM_SCHEME = "ca.pswdirect.client";
export const CLIENT_ROUTES = ["/client", "/client-login", "/order-confirmed"] as const;

const ORDER_CODE = /^CDT-\d{3,8}$/;

export interface ResolvedClientLink {
  path: string;
  /** PKCE code or token hash for passwordless sign-in, when the link carries one. */
  authCode?: string;
  tokenHash?: string;
  otpType?: string;
}

export function resolveClientLink(rawUrl: string): ResolvedClientLink {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { path: "/client" };
  }
  let path: string;
  if (url.protocol === `${CLIENT_CUSTOM_SCHEME}:`) {
    path = url.pathname && url.pathname !== "/" ? url.pathname : `/${url.hostname}`;
  } else {
    const host = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || !(CLIENT_UNIVERSAL_LINK_HOSTS as readonly string[]).includes(host)) {
      return { path: "/client" };
    }
    path = url.pathname;
  }
  path = path.replace(/\/+$/, "") || "/client";
  if (!(CLIENT_ROUTES as readonly string[]).includes(path)) path = "/client";

  const order = url.searchParams.get("order");
  if (path === "/client" && order && ORDER_CODE.test(order)) path = `/client?order=${order}`;

  const code = url.searchParams.get("code") ?? undefined;
  const tokenHash = url.searchParams.get("token_hash") ?? undefined;
  const otpType = url.searchParams.get("type") ?? undefined;
  return {
    path,
    authCode: code && /^[A-Za-z0-9-]{8,128}$/.test(code) ? code : undefined,
    tokenHash: tokenHash && /^[A-Za-z0-9_-]{8,256}$/.test(tokenHash) ? tokenHash : undefined,
    otpType: otpType && ["magiclink", "email", "signup"].includes(otpType) ? otpType : undefined,
  };
}

export function resolveClientNotificationTarget(data: Record<string, unknown> | undefined): string {
  const link = data?.path ?? data?.url ?? data?.link;
  if (typeof link !== "string" || !link) return "/client";
  return resolveClientLink(link.startsWith("/") ? `https://pswdirect.ca${link}` : link).path;
}
