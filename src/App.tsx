import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { DevMenu } from "@/components/dev/DevMenu";
import HomePage from "./pages/HomePage";
import OfficeLogin from "./pages/OfficeLogin";
import AdminPortal from "./pages/AdminPortal";
import ClientPortal from "./pages/ClientPortal";
import ClientLogin from "./pages/ClientLogin";
import PSWDashboard from "./pages/PSWDashboard";
import PSWLogin from "./pages/PSWLogin";
import PSWPendingStatus from "./pages/PSWPendingStatus";
import PSWSignup from "./pages/PSWSignup";
import InstallApp from "./pages/InstallApp";
import AdminSetup from "./pages/AdminSetup";
import VerifyProfile from "./pages/VerifyProfile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Loading spinner component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

// Master admin email for emergency bypass
const MASTER_ADMIN_EMAIL = "tiffarshi@gmail.com";

// Protected route for admin - must be used inside AuthProvider
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  
  // Show loading spinner while checking auth
  if (isLoading) {
    return <LoadingSpinner />;
  }
  
  // MASTER ADMIN BYPASS: Always allow access for master admin email
  const isMasterAdmin = user?.email?.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase();
  
  if (!isAuthenticated || (!isMasterAdmin && user?.role !== "admin")) {
    return <Navigate to="/office-login" replace />;
  }
  
  return <>{children}</>;
};

// Main app content - separated to use hooks inside AuthProvider
const AppRoutes = () => (
  <BrowserRouter>
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<HomePage />} />
      <Route path="/join-team" element={<PSWSignup />} />
      
      {/* PSW Routes */}
      <Route path="/psw-login" element={<PSWLogin />} />
      <Route path="/psw-pending" element={<PSWPendingStatus />} />
      <Route path="/psw" element={<PSWDashboard />} />
      <Route path="/install" element={<InstallApp />} />
      
      {/* Hidden Admin Routes */}
      <Route path="/office-login" element={<OfficeLogin />} />
      <Route path="/admin-setup" element={<AdminSetup />} />
      <Route path="/admin" element={
        <AdminRoute>
          <AdminPortal />
        </AdminRoute>
      } />
      
      {/* Client Routes */}
      <Route path="/client-login" element={<ClientLogin />} />
      <Route path="/client" element={<ClientPortal />} />
      
      {/* Verification Routes (QR Code landing pages) */}
      <Route path="/verify/:type/:id" element={<VerifyProfile />} />
      
      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
    {/* Dev Menu - only visible when Live Auth is disabled */}
    <DevMenu />
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <AppRoutes />
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
