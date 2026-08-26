import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Safe "Update available — Refresh" control.
 *
 * Installed PWA users can keep running an old app shell long after a deploy.
 * Rather than telling caregivers to clear their cache, we poll the deployed
 * index.html and compare the hashed entry bundle with the one this tab loaded.
 * When they differ we surface a non-blocking banner. Refreshing clears only
 * HTTP/app caches and reloads — it never unregisters the push service worker
 * and never touches auth tokens, so the session survives the update.
 */

const POLL_MS = 5 * 60 * 1000;

const currentBundle = (): string | null => {
  try {
    const scripts = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src*="/assets/"]'));
    const match = scripts
      .map((s) => s.getAttribute("src") || "")
      .find((src) => /\/assets\/index-[^/]+\.js$/.test(src));
    return match ? match.split("/").pop()! : null;
  } catch {
    return null;
  }
};

const deployedBundle = async (): Promise<string | null> => {
  const res = await fetch(`/index.html?ts=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/\/assets\/(index-[A-Za-z0-9_-]+\.js)/);
  return m ? m[1] : null;
};

export const UpdateAvailableBanner = () => {
  const [outdated, setOutdated] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const check = useCallback(async () => {
    if (typeof window === "undefined" || navigator.onLine === false) return;
    const mine = currentBundle();
    if (!mine) return; // dev server / module scripts without hashed assets
    try {
      const live = await deployedBundle();
      if (live && live !== mine) setOutdated(true);
    } catch {
      // network hiccup — try again on the next tick
    }
  }, []);

  useEffect(() => {
    check();
    const id = setInterval(check, POLL_MS);
    const onFocus = () => check();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [check]);

  const applyUpdate = async () => {
    setRefreshing(true);
    try {
      if ("caches" in window) {
        const names = await caches.keys();
        // Only app-shell caches. Progressier's own caches/worker are left alone.
        await Promise.all(
          names.filter((n) => /precache|runtime|^psw-|^psa-|workbox/i.test(n)).map((n) => caches.delete(n)),
        );
      }
    } catch {
      // ignore — the reload below still picks up the new index.html
    } finally {
      window.location.reload();
    }
  };

  if (!outdated) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-xl border border-primary/40 bg-card p-3 shadow-lg">
        <RefreshCw className={`h-5 w-5 shrink-0 text-primary ${refreshing ? "animate-spin" : ""}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Update available</p>
          <p className="text-xs text-muted-foreground">Refresh to load the latest version. You stay signed in.</p>
        </div>
        <Button size="sm" onClick={applyUpdate} disabled={refreshing}>
          {refreshing ? "Updating…" : "Refresh"}
        </Button>
      </div>
    </div>
  );
};

export default UpdateAvailableBanner;
