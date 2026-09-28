import { useEffect } from "react";
import { Navigate, Route, Routes, BrowserRouter, useNavigate } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App as CapApp, type URLOpenListenerEvent } from "@capacitor/app";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ClientLogin from "@/pages/ClientLogin";
import ClientPortal from "@/pages/ClientPortal";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import ConnectionBanner from "./components/ConnectionBanner";
import { isNativeApp } from "./native/platform";
import { useNetworkState } from "./native/networkStatus";
import { hideSplashScreen } from "./native/bootstrap";
import { resolveClientLink } from "./client/clientLinks";
import { attachClientPushListeners } from "./client/clientPush";

const queryClient = new QueryClient();

/** Client-only route graph. No admin, worker, or SEO screens are bundled. */
function ClientRoutes() {
  return (
    <Routes>
      <Route path="/client-login" element={<ClientLogin />} />
      <Route path="/client" element={<ClientPortal />} />
      <Route path="/order-confirmed" element={<OrderConfirmationPage />} />
      <Route path="*" element={<Navigate replace to="/client" />} />
    </Routes>
  );
}

function ClientShell() {
  const navigate = useNavigate();
  const network = useNetworkState();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isNativeApp()) return;
    void hideSplashScreen();
    const handleUrl = async (raw: string) => {
      const link = resolveClientLink(raw);
      try {
        if (link.authCode) await supabase.auth.exchangeCodeForSession(link.authCode);
        else if (link.tokenHash && link.otpType)
          await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: link.otpType as "magiclink" | "email" | "signup" });
      } catch {
        /* expired link: the sign-in screen offers a fresh code */
      }
      navigate(link.path);
    };
    let remove: (() => void) | undefined;
    void CapApp.getLaunchUrl().then((l) => l?.url && handleUrl(l.url)).catch(() => undefined);
    void CapApp.addListener("appUrlOpen", (e: URLOpenListenerEvent) => void handleUrl(e.url)).then((s) => {
      remove = () => void s.remove();
    });
    return () => remove?.();
  }, [navigate]);

  useEffect(() => {
    if (!isNativeApp() || !isAuthenticated) return;
    let cleanup: (() => void) | undefined;
    void attachClientPushListeners((path) => navigate(path)).then((c) => (cleanup = c)).catch(() => undefined);
    return () => cleanup?.();
  }, [isAuthenticated, navigate]);

  return (
    <div className="min-h-dvh">
      {network.quality !== "online" && <ConnectionBanner status={network.quality} />}
      <ClientRoutes />
    </div>
  );
}

export default function ClientApp() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ClientShell />
            </BrowserRouter>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
