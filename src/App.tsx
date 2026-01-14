import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DevMenu } from "@/components/dev/DevMenu";
import { useAutoTimeout } from "@/hooks/useAutoTimeout";
import Index from "./pages/Index";
import AdminPortal from "./pages/AdminPortal";
import ClientPortal from "./pages/ClientPortal";
import PSWDashboard from "./pages/PSWDashboard";
import PSWSignup from "./pages/PSWSignup";
import BookService from "./pages/BookService";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

// Component to enable auto-timeout within auth context
const AutoTimeoutWrapper = ({ children }: { children: React.ReactNode }) => {
  useAutoTimeout();
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
              <Route path="/" element={<Index />} />
              <Route path="/admin" element={<AdminPortal />} />
              <Route path="/client" element={<ClientPortal />} />
              <Route path="/psw" element={<PSWDashboard />} />
              <Route path="/join-team" element={<PSWSignup />} />
              <Route path="/book" element={<BookService />} />
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
