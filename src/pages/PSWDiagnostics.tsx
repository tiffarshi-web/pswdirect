import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, Copy, RefreshCw, Trash2 } from "lucide-react";

type LogLine = { level: string; time: string; text: string };
type AuthProbe = {
  step: string;
  status?: number;
  ok: boolean;
  message?: string;
  code?: string;
  ms?: number;
};

function nowIso() {
  return new Date().toISOString();
}

function safeStringify(v: unknown) {
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/** Installs a console proxy that captures the last N lines. */
function useConsoleCapture(limit = 100) {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const bufRef = useRef<LogLine[]>([]);

  useEffect(() => {
    const levels: Array<"log" | "warn" | "error" | "info" | "debug"> = [
      "log",
      "warn",
      "error",
      "info",
      "debug",
    ];
    const originals: Record<string, (...args: unknown[]) => void> = {};
    levels.forEach((lvl) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      originals[lvl] = (console as any)[lvl].bind(console);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (console as any)[lvl] = (...args: unknown[]) => {
        try {
          const text = args
            .map((a) => (typeof a === "string" ? a : safeStringify(a)))
            .join(" ");
          bufRef.current = [
            ...bufRef.current.slice(-(limit - 1)),
            { level: lvl, time: nowIso(), text },
          ];
          setLogs(bufRef.current);
        } catch {
          /* ignore */
        }
        originals[lvl](...args);
      };
    });

    const onError = (e: ErrorEvent) => {
      bufRef.current = [
        ...bufRef.current.slice(-(limit - 1)),
        { level: "error", time: nowIso(), text: `window.onerror: ${e.message} @ ${e.filename}:${e.lineno}` },
      ];
      setLogs(bufRef.current);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      bufRef.current = [
        ...bufRef.current.slice(-(limit - 1)),
        { level: "error", time: nowIso(), text: `unhandledrejection: ${safeStringify(e.reason)}` },
      ];
      setLogs(bufRef.current);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      levels.forEach((lvl) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (console as any)[lvl] = originals[lvl];
      });
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [limit]);

  const clear = () => {
    bufRef.current = [];
    setLogs([]);
  };

  return { logs, clear };
}

function collectDeviceInfo() {
  const nav = navigator as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number } };
  const conn = nav.connection;
  const isStandalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window.navigator as any).standalone === true;

  let sbKeys: string[] = [];
  try {
    sbKeys = Object.keys(localStorage).filter((k) => k.startsWith("sb-"));
  } catch {
    /* ignore */
  }

  return {
    time: nowIso(),
    url: window.location.href,
    origin: window.location.origin,
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    viewport: `${window.innerWidth}x${window.innerHeight} @ dpr=${window.devicePixelRatio}`,
    online: navigator.onLine,
    cookiesEnabled: navigator.cookieEnabled,
    displayMode: isStandalone ? "standalone (PWA)" : "browser",
    connection: conn
      ? { effectiveType: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt }
      : "unavailable",
    serviceWorkerSupported: "serviceWorker" in navigator,
    supabaseTokenKeys: sbKeys,
    supabaseUrlConfigured: !!import.meta.env.VITE_SUPABASE_URL,
    supabasePublishableKeyConfigured: !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    appVersion: (window as unknown as { __APP_VERSION__?: string }).__APP_VERSION__ ?? "n/a",
  };
}

async function collectServiceWorkerInfo() {
  if (!("serviceWorker" in navigator)) return { supported: false };
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    return {
      supported: true,
      registrations: regs.map((r) => ({
        scope: r.scope,
        active: r.active?.scriptURL,
        waiting: r.waiting?.scriptURL,
        installing: r.installing?.scriptURL,
      })),
    };
  } catch (e) {
    return { supported: true, error: String(e) };
  }
}

async function collectCacheInfo() {
  if (!("caches" in window)) return { supported: false };
  try {
    const names = await caches.keys();
    return { supported: true, names };
  } catch (e) {
    return { supported: true, error: String(e) };
  }
}

async function collectSessionInfo() {
  try {
    const { data: sess } = await supabase.auth.getSession();
    const s = sess.session;
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    return {
      hasCachedSession: !!s,
      accessTokenPresent: !!s?.access_token,
      refreshTokenPresent: !!s?.refresh_token,
      expiresAt: s?.expires_at ? new Date(s.expires_at * 1000).toISOString() : null,
      cachedUserId: s?.user?.id ?? null,
      cachedEmail: s?.user?.email ?? null,
      revalidatedUserId: userData?.user?.id ?? null,
      revalidatedEmail: userData?.user?.email ?? null,
      revalidationError: userErr
        ? { name: userErr.name, message: userErr.message, status: (userErr as { status?: number }).status }
        : null,
    };
  } catch (e) {
    return { error: String(e) };
  }
}

export default function PSWDiagnostics() {
  const { logs, clear: clearLogs } = useConsoleCapture(150);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [running, setRunning] = useState(false);
  const [probes, setProbes] = useState<AuthProbe[]>([]);
  const [device, setDevice] = useState<ReturnType<typeof collectDeviceInfo> | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [swInfo, setSwInfo] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  const refreshEnvironment = async () => {
    setDevice(collectDeviceInfo());
    setSwInfo(await collectServiceWorkerInfo());
    setCacheInfo(await collectCacheInfo());
    setSessionInfo(await collectSessionInfo());
  };

  useEffect(() => {
    refreshEnvironment();
  }, []);

  const runAuthProbe = async () => {
    if (!email.trim()) {
      toast({ title: "Enter your PSW email", variant: "destructive" });
      return;
    }
    setRunning(true);
    const results: AuthProbe[] = [];

    // 1. Reachability probe (no auth) — hits Supabase auth health endpoint.
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    if (url && key) {
      const t0 = performance.now();
      try {
        const res = await fetch(`${url}/auth/v1/health`, {
          headers: { apikey: key },
        });
        results.push({
          step: "Auth server reachability (/auth/v1/health)",
          ok: res.ok,
          status: res.status,
          ms: Math.round(performance.now() - t0),
        });
      } catch (e) {
        results.push({
          step: "Auth server reachability (/auth/v1/health)",
          ok: false,
          message: String(e),
          ms: Math.round(performance.now() - t0),
        });
      }
    } else {
      results.push({
        step: "Auth server reachability",
        ok: false,
        message: "Supabase URL or publishable key missing in this bundle.",
      });
    }

    // 2. Sign-in attempt (only if password provided).
    if (password) {
      const t0 = performance.now();
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });
        if (error) {
          results.push({
            step: "signInWithPassword",
            ok: false,
            status: (error as { status?: number }).status,
            code: (error as { code?: string }).code,
            message: error.message,
            ms: Math.round(performance.now() - t0),
          });
        } else {
          results.push({
            step: "signInWithPassword",
            ok: true,
            message: `Session obtained for ${data.user?.email}`,
            ms: Math.round(performance.now() - t0),
          });

          // 3. PSW profile lookup by email (mirrors AuthContext).
          const t1 = performance.now();
          const { data: psw, error: pswErr } = await supabase
            .from("psw_profiles")
            .select("id, first_name, last_name, vetting_status, lifecycle_status")
            .ilike("email", email.trim().toLowerCase())
            .maybeSingle();
          results.push({
            step: "psw_profiles lookup by email (ilike)",
            ok: !pswErr && !!psw,
            message: pswErr
              ? pswErr.message
              : psw
                ? `Found PSW ${psw.first_name} ${psw.last_name} — vetting=${psw.vetting_status}, lifecycle=${(psw as { lifecycle_status?: string }).lifecycle_status ?? "n/a"}`
                : "No matching row in psw_profiles for this email.",
            code: pswErr?.code,
            ms: Math.round(performance.now() - t1),
          });

          // 4. user_roles admin check (informational).
          const t2 = performance.now();
          const uid = data.user?.id;
          if (uid) {
            const { data: roleRow, error: roleErr } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", uid);
            results.push({
              step: "user_roles lookup",
              ok: !roleErr,
              message: roleErr
                ? roleErr.message
                : `Roles: ${(roleRow ?? []).map((r) => r.role).join(", ") || "(none)"}`,
              code: roleErr?.code,
              ms: Math.round(performance.now() - t2),
            });
          }
        }
      } catch (e) {
        results.push({
          step: "signInWithPassword (threw)",
          ok: false,
          message: String(e),
          ms: Math.round(performance.now() - t0),
        });
      }
    } else {
      results.push({
        step: "signInWithPassword",
        ok: false,
        message: "Skipped — no password entered. Add password to run the full flow.",
      });
    }

    setProbes(results);
    await refreshEnvironment();
    setRunning(false);
  };

  const buildReport = () => {
    return [
      "=== PSW SIGN-IN DIAGNOSTIC REPORT ===",
      `Generated: ${nowIso()}`,
      "",
      "--- Device / Environment ---",
      safeStringify(device),
      "",
      "--- Supabase Session (cached & revalidated) ---",
      safeStringify(sessionInfo),
      "",
      "--- Service Workers ---",
      safeStringify(swInfo),
      "",
      "--- Caches ---",
      safeStringify(cacheInfo),
      "",
      "--- Auth Probes ---",
      safeStringify(probes),
      "",
      "--- Recent Console Logs (last 150) ---",
      logs.map((l) => `[${l.time}] ${l.level.toUpperCase()} ${l.text}`).join("\n"),
    ].join("\n");
  };

  const copyReport = async () => {
    try {
      await navigator.clipboard.writeText(buildReport());
      toast({ title: "Report copied", description: "Paste it to your admin." });
    } catch {
      toast({ title: "Copy failed", description: "Long-press the report text to copy.", variant: "destructive" });
    }
  };

  const clearCaches = async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) {
          try {
            await r.unregister();
          } catch {
            /* ignore */
          }
        }
      }
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.allSettled(names.map((n) => caches.delete(n)));
      }
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith("sb-"))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* ignore */
      }
      toast({ title: "Caches cleared", description: "Reloading…" });
      setTimeout(() => window.location.reload(), 600);
    } catch (e) {
      toast({ title: "Clear failed", description: String(e), variant: "destructive" });
    }
  };

  return (
    <div className="min-h-dvh bg-background p-4 pb-24">
      <div className="mx-auto max-w-2xl space-y-4">
        <div className="flex items-center justify-between">
          <Link to="/psw-login" className="text-sm text-muted-foreground inline-flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Back to sign in
          </Link>
          <Button size="sm" variant="outline" onClick={refreshEnvironment}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>PSW sign-in diagnostics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">
              Use this if you can't sign in. Run the probe, then send the report to the office so we can pinpoint the exact failure.
            </p>
            <div className="space-y-2">
              <Label htmlFor="diag-email">Your PSW email</Label>
              <Input
                id="diag-email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="diag-password">Password (optional — enables the full sign-in test)</Label>
              <Input
                id="diag-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for reachability-only test"
              />
              <p className="text-xs text-muted-foreground">
                Password is used once for the live probe and never stored or logged. Only sanitized responses appear in the report.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={runAuthProbe} disabled={running}>
                {running && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Run diagnostic probe
              </Button>
              <Button variant="outline" onClick={copyReport}>
                <Copy className="h-4 w-4 mr-1" /> Copy full report
              </Button>
              <Button variant="outline" onClick={clearCaches}>
                <Trash2 className="h-4 w-4 mr-1" /> Clear caches & reload
              </Button>
              <Button variant="ghost" onClick={clearLogs}>
                Clear console buffer
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Auth probe results</CardTitle>
          </CardHeader>
          <CardContent>
            {probes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No probe run yet.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {probes.map((p, i) => (
                  <li key={i} className="rounded border p-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{p.step}</span>
                      <span className={p.ok ? "text-green-600" : "text-destructive"}>
                        {p.ok ? "OK" : "FAIL"}
                        {typeof p.status === "number" ? ` · ${p.status}` : ""}
                        {typeof p.ms === "number" ? ` · ${p.ms}ms` : ""}
                      </span>
                    </div>
                    {(p.message || p.code) && (
                      <div className="mt-1 text-xs text-muted-foreground break-words">
                        {p.code ? `[${p.code}] ` : ""}
                        {p.message}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report preview</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              readOnly
              value={buildReport()}
              className="min-h-[280px] font-mono text-xs"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
