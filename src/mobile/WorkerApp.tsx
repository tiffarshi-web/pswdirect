import { useCallback, useEffect, useRef, useState } from "react";
import { Navigate, Route, Routes, BrowserRouter, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import PSWLogin from "@/pages/PSWLogin";
import PSWSignup from "@/pages/PSWSignup";
import PSWPendingStatus from "@/pages/PSWPendingStatus";
import PSWDashboard from "@/pages/PSWDashboard";
import PSWJobClaimPage from "@/pages/PSWJobClaimPage";
import WorkerAccountPage from "./pages/WorkerAccountPage";
import WorkerTabBar from "./components/WorkerTabBar";
import ConnectionBanner from "./components/ConnectionBanner";
import WorkerStartupFallback from "./components/WorkerStartupFallback";
import { workerFallbackPath } from "./workerRoutes";
import { isNativeApp, nativePlatform } from "./native/platform";
import { useNetworkState } from "./native/networkStatus";
import { bootstrapNativeShell, hideSplashScreen } from "./native/bootstrap";
import { attachPushListeners } from "./native/pushNotifications";
import { attachSessionMirror, restoreSession } from "./native/nativeSession";
import { checkWorkerBackendUrl } from "./native/backendGuard";
import { workerError, workerLog } from "./native/logging";
import { WORKER_APP_VERSION, WORKER_BUILD_NUMBER } from "./version";
import {
  SESSION_RESTORE_TIMEOUT_MS,
  STARTUP_TIMEOUT_MS,
  parseAndroidVersion,
  parseWebViewVersion,
  startupErrorCode,
  timedOut,
  withTimeout,
  type StartupDiagnostics,
  type StartupErrorCode,
  type StartupStage,
} from "./native/startup";

const workerQueryClient = new QueryClient();

function WorkerFallback() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <Navigate
      replace
      to={workerFallbackPath(isAuthenticated && user?.role === "psw")}
    />
  );
}

function WorkerOnlyRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== "psw") {
    return <Navigate replace to="/psw-login" />;
  }

  return <>{children}</>;
}

/** Worker-only route graph. No public, client, payment, admin, or SEO imports. */
function WorkerRoutes() {
  return (
    <Routes>
      <Route path="/psw-login" element={<PSWLogin />} />
      <Route path="/join-team" element={<PSWSignup />} />
      <Route path="/psw-pending" element={<WorkerOnlyRoute><PSWPendingStatus /></WorkerOnlyRoute>} />
      <Route path="/psw" element={<WorkerOnlyRoute><PSWDashboard /></WorkerOnlyRoute>} />
      <Route path="/psw/account" element={<WorkerOnlyRoute><WorkerAccountPage /></WorkerOnlyRoute>} />
      <Route path="/psw/jobs/:bookingCode" element={<WorkerOnlyRoute><PSWJobClaimPage /></WorkerOnlyRoute>} />
      <Route path="*" element={<WorkerFallback />} />
    </Routes>
  );
}


/**
 * Native shell.
 *
 * Startup order matters. The splash screen is dismissed first, then the saved
 * session is restored under a timeout, and only afterwards are lifecycle, deep
 * links and push wired up — none of which may delay the first screen. If any
 * step times out or fails the shell shows a retry screen with a safe code
 * instead of a spinner that never ends.
 */
function WorkerShell() {
  const navigate = useNavigate();
  const network = useNetworkState();
  const { isAuthenticated, user } = useAuth();
  const [stage, setStage] = useState<StartupStage>(isNativeApp() ? "booting" : "ready");
  const [errorCode, setErrorCode] = useState<StartupErrorCode | undefined>();
  const [attempt, setAttempt] = useState(0);
  const cleanupsRef = useRef<Array<() => void>>([]);

  const online = network.quality !== "offline";
  const onlineRef = useRef(online);
  onlineRef.current = online;

  const retry = useCallback(() => {
    setErrorCode(undefined);
    setStage("booting");
    setAttempt((value) => value + 1);
  }, []);

  const continueToSignIn = useCallback(() => {
    setErrorCode(undefined);
    setStage("ready");
  }, []);

  useEffect(() => {
    if (!isNativeApp()) return;

    let active = true;
    const cleanups: Array<() => void> = [];
    cleanupsRef.current = cleanups;

    const fail = (failedStage: StartupStage, cause: "timeout" | "error" | "config") => {
      if (!active) return;
      const code = startupErrorCode(failedStage, onlineRef.current, cause);
      workerLog("startup", `Startup stopped at ${failedStage}`, { code });
      setErrorCode(code);
      setStage("failed");
    };

    // Hard ceiling: whatever happens, the app is never still "starting".
    const ceiling = window.setTimeout(() => {
      setStage((current) => {
        if (current === "ready" || current === "failed") return current;
        setErrorCode(startupErrorCode(current, onlineRef.current, "timeout"));
        return "failed";
      });
    }, STARTUP_TIMEOUT_MS);

    void (async () => {
      // 1. Paint something immediately. Never gated on network or session.
      void hideSplashScreen();

      // 2. This build must point at PSW Direct Canada and nothing else.
      if (!active) return;
      setStage("checking_build");
      const check = checkWorkerBackendUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
      if (check.ok === false) {
        workerError("startup", `Blocked backend configuration: ${check.reason}`);
        fail("checking_build", "config");
        return;
      }

      // 3. Restore the saved sign-in, under a timeout. Every outcome —
      //    restored, expired, none, insecure storage — lets the app render;
      //    the route guards decide whether that means dashboard or sign-in.
      if (!active) return;
      setStage("restoring_session");
      let restored: unknown;
      try {
        restored = await withTimeout(restoreSession(), SESSION_RESTORE_TIMEOUT_MS);
      } catch (error) {
        workerError("session", "Could not restore the saved session", error);
        fail("restoring_session", "error");
        return;
      }
      if (!active) return;
      if (timedOut(restored)) {
        fail("restoring_session", "timeout");
        return;
      }

      window.clearTimeout(ceiling);
      setStage("ready");

      // 4. Everything below is best-effort and never blocks the first screen.
      cleanups.push(attachSessionMirror());

      try {
        cleanups.push(
          await bootstrapNativeShell({
            onDeepLink: (path) => navigate(path),
            onResume: () => undefined,
            onBack: () => false,
          }),
        );
      } catch (error) {
        workerError("bootstrap", "Native shell setup failed", error);
      }

      try {
        cleanups.push(
          await attachPushListeners({
            onOpened: (path) => navigate(path),
          }),
        );
      } catch (error) {
        // Job alerts simply stay unavailable; the app must keep working.
        workerError("push", "Notification setup failed", error);
      }
    })();

    return () => {
      active = false;
      window.clearTimeout(ceiling);
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [navigate, attempt]);

  if (stage === "failed") {
    const userAgent = typeof navigator === "undefined" ? undefined : navigator.userAgent;
    const diagnostics: StartupDiagnostics = {
      stage,
      errorCode,
      appVersion: WORKER_APP_VERSION,
      buildNumber: WORKER_BUILD_NUMBER,
      platform: nativePlatform(),
      online,
      webViewVersion: parseWebViewVersion(userAgent),
      androidVersion: parseAndroidVersion(userAgent),
    };
    return (
      <WorkerStartupFallback
        diagnostics={diagnostics}
        onRetry={retry}
        onContinueToSignIn={continueToSignIn}
      />
    );
  }

  if (stage !== "ready") {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const showTabs = isNativeApp() && isAuthenticated && user?.role === "psw";

  return (
    <div className={showTabs ? "min-h-dvh pb-[76px]" : "min-h-dvh"}>
      {network.quality !== "online" && <ConnectionBanner status={network.quality} />}
      <WorkerRoutes />
      {showTabs && <WorkerTabBar />}
    </div>
  );
}

export default function WorkerApp() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={workerQueryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <WorkerShell />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
