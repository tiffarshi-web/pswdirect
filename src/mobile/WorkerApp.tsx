import { Navigate, Route, Routes, BrowserRouter } from "react-router-dom";
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
import { workerFallbackPath } from "./workerRoutes";

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
      <Route path="/psw/jobs/:bookingCode" element={<WorkerOnlyRoute><PSWJobClaimPage /></WorkerOnlyRoute>} />
      <Route path="*" element={<WorkerFallback />} />
    </Routes>
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
              <WorkerRoutes />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
