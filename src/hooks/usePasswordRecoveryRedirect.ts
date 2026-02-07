/**
 * Password Recovery Redirect Hook
 * 
 * Handles automatic role-based routing after a user successfully updates
 * their password via a recovery link.
 * 
 * RULES:
 * 1. CEO Rule: tiffarshi@gmail.com → /admin
 * 2. Admin role → /admin
 * 3. PSW role → /psw
 * 4. Client role → /client
 * 5. Safety Net: No role found → / (homepage) with message
 */

import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const MASTER_ADMIN_EMAIL = "tiffarshi@gmail.com";
const PRIMARY_DOMAIN = "https://psadirect.ca";

interface RecoveryState {
  isRecoveryMode: boolean;
  isProcessing: boolean;
  userEmail: string | null;
}

export const usePasswordRecoveryRedirect = () => {
  const navigate = useNavigate();
  const [state, setState] = useState<RecoveryState>({
    isRecoveryMode: false,
    isProcessing: false,
    userEmail: null,
  });

  /**
   * Determine the correct redirect URL based on user role
   */
  const getRedirectUrl = useCallback(async (email: string, userId: string): Promise<string> => {
    const normalizedEmail = email.toLowerCase();

    // ═══════════════════════════════════════════════════════════════════════
    // RULE 1: CEO RULE - Master admin always goes to /admin
    // ═══════════════════════════════════════════════════════════════════════
    if (normalizedEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
      console.log("[Recovery] CEO rule applied - redirecting to /admin");
      return "/admin";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RULE 2: Check user_roles table for admin role
    // ═══════════════════════════════════════════════════════════════════════
    const { data: adminRole, error: adminError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!adminError && adminRole) {
      console.log("[Recovery] Admin role found - redirecting to /admin");
      return "/admin";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RULE 3: Check for PSW profile
    // ═══════════════════════════════════════════════════════════════════════
    const { data: pswProfile, error: pswError } = await supabase
      .from("psw_profiles")
      .select("id, vetting_status")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!pswError && pswProfile) {
      // Check vetting status to determine correct PSW destination
      if (pswProfile.vetting_status === "approved") {
        console.log("[Recovery] PSW profile (approved) found - redirecting to /psw");
        return "/psw";
      } else if (pswProfile.vetting_status === "pending") {
        console.log("[Recovery] PSW profile (pending) found - redirecting to /psw-pending");
        return "/psw-pending";
      } else {
        // Flagged or other status - send to login
        console.log("[Recovery] PSW profile (restricted) - redirecting to login");
        return "/psw-login";
      }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RULE 4: Check for Client profile
    // ═══════════════════════════════════════════════════════════════════════
    const { data: clientProfile, error: clientError } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (!clientError && clientProfile) {
      console.log("[Recovery] Client profile found - redirecting to /client");
      return "/client";
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RULE 5: SAFETY NET - No role found
    // ═══════════════════════════════════════════════════════════════════════
    console.log("[Recovery] No role found - redirecting to homepage");
    return "/";
  }, []);

  /**
   * Handle successful password update and automatic redirect
   */
  const handlePasswordUpdateSuccess = useCallback(async () => {
    setState(prev => ({ ...prev, isProcessing: true }));

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        // No session - user needs to log in manually
        toast.info("Password updated! Please log in to your respective portal.", {
          duration: 5000,
        });
        navigate("/");
        return;
      }

      const email = session.user.email || "";
      const userId = session.user.id;

      // Get the appropriate redirect path
      const redirectPath = await getRedirectUrl(email, userId);
      
      // Show success message
      const roleMessages: Record<string, string> = {
        "/admin": "Password updated! Welcome back, Admin.",
        "/psw": "Password updated! Welcome back to your PSW dashboard.",
        "/psw-pending": "Password updated! Your application is under review.",
        "/client": "Password updated! Welcome back to your client portal.",
        "/": "Password updated! Please log in to your respective portal.",
      };

      toast.success(roleMessages[redirectPath] || "Password updated successfully!", {
        duration: 4000,
      });

      // Navigate to the appropriate dashboard
      navigate(redirectPath, { replace: true });

    } catch (error) {
      console.error("[Recovery] Error during redirect:", error);
      toast.error("Password updated, but we couldn't determine your role.", {
        description: "Please log in to your respective portal.",
        duration: 5000,
      });
      navigate("/");
    } finally {
      setState(prev => ({ ...prev, isProcessing: false, isRecoveryMode: false }));
    }
  }, [navigate, getRedirectUrl]);

  /**
   * Check for recovery mode on mount (URL hash contains type=recovery)
   */
  useEffect(() => {
    const checkRecoveryMode = async () => {
      const hash = window.location.hash;
      
      // Check for recovery token in URL hash
      if (hash && hash.includes("type=recovery")) {
        console.log("[Recovery] Recovery mode detected from URL hash");
        setState(prev => ({ ...prev, isRecoveryMode: true }));
        
        // Clear the hash from URL for cleaner appearance
        window.history.replaceState(null, "", window.location.pathname);
      }
    };

    checkRecoveryMode();

    // Listen for PASSWORD_RECOVERY auth events
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("[Recovery] PASSWORD_RECOVERY event received");
        setState(prev => ({ 
          ...prev, 
          isRecoveryMode: true,
          userEmail: session?.user?.email || null,
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Get the correct redirectTo URL for password reset emails based on role detection
   * This is used when sending the reset email
   */
  const getResetEmailRedirectUrl = useCallback((email: string): string => {
    const normalizedEmail = email.toLowerCase();
    
    // CEO always redirects to office-login which handles admin setup
    if (normalizedEmail === MASTER_ADMIN_EMAIL.toLowerCase()) {
      return `${PRIMARY_DOMAIN}/office-login`;
    }
    
    // For all other users, we redirect to a unified recovery handler
    // The actual role-based routing happens AFTER password update
    return `${PRIMARY_DOMAIN}/office-login`;
  }, []);

  return {
    isRecoveryMode: state.isRecoveryMode,
    isProcessing: state.isProcessing,
    userEmail: state.userEmail,
    handlePasswordUpdateSuccess,
    getResetEmailRedirectUrl,
    getRedirectUrl,
  };
};
