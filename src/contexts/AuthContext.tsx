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

// Master admin email for bypass
const MASTER_ADMIN_EMAIL = "tiffarshi@gmail.com";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing Supabase session on mount and listen for changes
  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Get existing session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          await handleSupabaseUser(session.user.id, session.user.email || "");
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;

        if (event === "SIGNED_IN" && session?.user) {
          await handleSupabaseUser(session.user.id, session.user.email || "");
        } else if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  // Handle Supabase user - check role and populate context
  const handleSupabaseUser = async (userId: string, email: string) => {
    try {
      // Master admin bypass
      if (email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
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
        setUser({
          id: pswProfile.id,
          name: `${pswProfile.first_name} ${pswProfile.last_name}`,
          firstName: pswProfile.first_name,
          email: email,
          role: "psw",
          status: pswProfile.vetting_status as PSWStatus,
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
