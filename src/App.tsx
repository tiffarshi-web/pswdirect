import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DevMenu } from "@/components/dev/DevMenu";
import { useAutoTimeout } from "@/hooks/useAutoTimeout";
import HomePage from "./pages/HomePage";
import Login from "./pages/Login";
import OfficeLogin from "./pages/OfficeLogin";
import AdminPortal from "./pages/AdminPortal";
import ClientPortal from "./pages/ClientPortal";
import PSWDashboard from "./pages/PSWDashboard";
import PSWLogin from "./pages/PSWLogin";
import PSWPendingStatus from "./pages/PSWPendingStatus";
import PSWSignup from "./pages/PSWSignup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to enable auto-timeout within auth context - must be inside AuthProvider
const AutoTimeoutWrapper = ({ children }: { children: React.ReactNode }) => {
  useAutoTimeout();
  return <>{children}</>;
};

// Protected route for admin - only allows authenticated admins
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated || user?.role !== "admin") {
    return <Navigate to="/office-login" replace />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <AutoTimeoutWrapper>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/join-team" element={<PSWSignup />} />
              
              {/* PSW Routes */}
              <Route path="/psw-login" element={<PSWLogin />} />
              <Route path="/psw-pending" element={<PSWPendingStatus />} />
              <Route path="/psw" element={<PSWDashboard />} />
              
              {/* Hidden Admin Route */}
              <Route path="/office-login" element={<OfficeLogin />} />
              <Route path="/admin" element={
                <AdminRoute>
                  <AdminPortal />
                </AdminRoute>
              } />
              
              {/* User Portals */}
              <Route path="/client" element={<ClientPortal />} />
              
              {/* Legacy routes - redirect to new structure */}
              <Route path="/book" element={<Navigate to="/" replace />} />
              
              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            {/* Dev Menu - only visible when Live Auth is disabled */}
            <DevMenu />
          </BrowserRouter>
        </AutoTimeoutWrapper>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
