import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { updateLastActivity, clearSessionOnTimeout } from "@/lib/securityStore";

export type UserRole = "admin" | "psw" | "client";

type PSWStatus = "pending" | "active" | "flagged" | "removed";

interface User {
  id: string;
  name: string;
  firstName: string;
  email: string;
  role: UserRole;
  status?: PSWStatus;
}

interface PSWProfileData {
  id: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (role: UserRole, email: string, pswProfile?: PSWProfileData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount and listen for changes
  useEffect(() => {
    let mounted = true;
    let loadingFallbackTimer: number | undefined;

    const initializeAuth = async () => {
      try {
        // Fail-safe: never allow auth loading spinner to block routing forever
        loadingFallbackTimer = window.setTimeout(() => {
          if (mounted) {
            console.warn("[Auth] Initialization timeout reached, continuing without blocking UI");
            setIsLoading(false);
          }
        }, 6000);

        // Only check if a session exists — do NOT call handleSupabaseUser here.
        // getSession() returns cached tokens that may be expired.
        // Let onAuthStateChange handle user resolution with refreshed tokens.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session && mounted) {
          // No session at all — loading done
          if (loadingFallbackTimer) window.clearTimeout(loadingFallbackTimer);
          setIsLoading(false);
        }
        // If session exists, onAuthStateChange INITIAL_SESSION will fire
      } catch (error) {
        console.error("Error initializing auth:", error);
        if (loadingFallbackTimer) window.clearTimeout(loadingFallbackTimer);
        if (mounted) setIsLoading(false);
      }
    };

    // Set up auth state listener — provides refreshed tokens
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;

        // Important: defer async Supabase calls outside auth callback to avoid lock/deadlock
        window.setTimeout(async () => {
          if (!mounted) return;

          // Clear fallback timer since auth resolved
          if (loadingFallbackTimer) {
            window.clearTimeout(loadingFallbackTimer);
            loadingFallbackTimer = undefined;
          }

          if (event === "PASSWORD_RECOVERY") {
            console.log("[Auth] PASSWORD_RECOVERY event — skipping auto-login");
            setIsLoading(false);
            return;
          }

          if (event === "SIGNED_IN" && window.location.hash.includes("type=recovery")) {
            console.log("[Auth] SIGNED_IN during recovery — skipping auto-login");
            setIsLoading(false);
            return;
          }

          if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
            await handleSupabaseUser(session.user.id, session.user.email || "");
            setIsLoading(false);
          } else if (event === "SIGNED_OUT") {
            setUser(null);
            setIsLoading(false);
          } else if (event === "INITIAL_SESSION" && !session) {
            setIsLoading(false);
          }
        }, 0);
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      if (loadingFallbackTimer) {
        window.clearTimeout(loadingFallbackTimer);
      }
      subscription.unsubscribe();
    };
  }, []);

  // Handle Supabase user - check role and populate context
  // PRIORITY ORDER: Master admin bypass → user_roles admin check → PSW → Client
  const handleSupabaseUser = async (userId: string, email: string) => {
    try {
      // Check user_roles table for admin role
      // NOTE: a user can have multiple roles; never use `.single()` here.
      const { data: adminRoleRow, error: adminRoleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .eq("role", "admin")
        .maybeSingle();

      if (!adminRoleError && adminRoleRow) {
        setUser({
          id: userId,
          name: "Admin",
          firstName: "Admin",
          email: email,
          role: "admin",
        });
        updateLastActivity();
        return;
      }

      // Check for PSW profile
      const { data: pswProfile, error: pswError } = await supabase
        .from("psw_profiles")
        .select("id, first_name, last_name, vetting_status")
        .eq("email", email)
        .single();

      if (!pswError && pswProfile) {
        // Map DB vetting_status to app PSWStatus
        const statusMap: Record<string, PSWStatus> = {
          approved: "active",
          pending: "pending",
          flagged: "flagged",
          rejected: "pending",
          rejected_needs_update: "pending",
          rejected_final: "removed",
          deactivated: "removed",
        };
        const mappedStatus = statusMap[pswProfile.vetting_status || "pending"] || "pending";

        setUser({
          id: pswProfile.id,
          name: `${pswProfile.first_name} ${pswProfile.last_name}`,
          firstName: pswProfile.first_name,
          email: email,
          role: "psw",
          status: mappedStatus,
        });
        updateLastActivity();
        return;
      }

      // Check for client profile
      const { data: clientProfile, error: clientError } = await supabase
        .from("client_profiles")
        .select("id, first_name, full_name")
        .eq("user_id", userId)
        .single();

      if (!clientError && clientProfile) {
        setUser({
          id: clientProfile.id,
          name: clientProfile.full_name || clientProfile.first_name || email.split("@")[0],
          firstName: clientProfile.first_name || email.split("@")[0],
          email: email,
          role: "client",
        });
        updateLastActivity();
        return;
      }

      // Default: no specific role found, user remains null
      console.log("No role found for user:", email);
    } catch (error) {
      console.error("Error handling Supabase user:", error);
    }
  };

  const login = (role: UserRole, email: string, pswProfile?: PSWProfileData) => {
    // Clear any stale timeout data and set fresh activity timestamp
    updateLastActivity();
    
    // For PSW role with profile data, use actual profile instead of mock
    if (role === "psw" && pswProfile) {
      setUser({
        id: pswProfile.id,
        name: `${pswProfile.firstName} ${pswProfile.lastName}`,
        firstName: pswProfile.firstName,
        email,
        role: "psw",
        status: "active",
      });
    } else if (role === "admin") {
      // For admin, set directly (Supabase session should already be established)
      setUser({
        id: "admin-session",
        name: "Admin User",
        firstName: "Admin",
        email,
        role: "admin",
      });
    } else {
      // For client role
      setUser({
        id: "client-session",
        name: email.split("@")[0],
        firstName: email.split("@")[0],
        email,
        role: "client",
      });
    }
  };

  const logout = async () => {
    clearSessionOnTimeout();
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
