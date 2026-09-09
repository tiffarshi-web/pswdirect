import { useEffect, useState } from "react";
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
import { workerFallbackPath } from "./workerRoutes";
import { isNativeApp } from "./native/platform";
import { useNetworkState } from "./native/networkStatus";
import { bootstrapNativeShell } from "./native/bootstrap";
import { attachPushListeners } from "./native/pushNotifications";
import { attachSessionMirror, restoreSession } from "./native/nativeSession";
import { checkWorkerBackendUrl } from "./native/backendGuard";
import { workerError } from "./native/logging";

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
 * Native shell: restores the saved session, wires lifecycle, deep links and
 * push, and frames the worker routes with a status banner and tab bar.
 */
function WorkerShell() {
  const navigate = useNavigate();
  const network = useNetworkState();
  const { isAuthenticated, user } = useAuth();
  const [restoring, setRestoring] = useState(isNativeApp());

  useEffect(() => {
    let active = true;
    const cleanups: Array<() => void> = [];

    void (async () => {
      try {
        await restoreSession();
      } catch (error) {
        workerError("session", "Could not restore the saved session", error);
      }
      if (!active) return;
      setRestoring(false);

      cleanups.push(attachSessionMirror());

      try {
        cleanups.push(
          await bootstrapNativeShell({
            onDeepLink: (path) => navigate(path),
            onResume: () => undefined,
            onBack: () => false,
          }),
        );
        cleanups.push(
          await attachPushListeners({
            onOpened: (path) => navigate(path),
          }),
        );
      } catch (error) {
        workerError("bootstrap", "Native shell setup failed", error);
      }
    })();

    return () => {
      active = false;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [navigate]);

  if (restoring) {
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
  useEffect(() => {
    const check = checkWorkerBackendUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
    if (check.ok === false) {
      workerError("startup", `Blocked backend configuration: ${check.reason}`);
    }
  }, []);

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
