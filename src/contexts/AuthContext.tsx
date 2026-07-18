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
  /** Progressive loading message: escalates on slow networks. */
  loadingMessage: string;
  /** True once the 6s "still signing you in…" threshold is reached. */
  isSlowLoad: boolean;
  login: (role: UserRole, email: string, pswProfile?: PSWProfileData) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState("Signing you in…");
  const [isSlowLoad, setIsSlowLoad] = useState(false);

  // Check for existing session on mount and listen for changes
  useEffect(() => {
    let mounted = true;
    let slowTimer: number | undefined;
    let retryTimer: number | undefined;
    let hardReleaseTimer: number | undefined;
    let roleResolved = false;
    let lastResolvedUser: { id: string; email: string } | null = null;

    const clearTimers = () => {
      if (slowTimer) { window.clearTimeout(slowTimer); slowTimer = undefined; }
      if (retryTimer) { window.clearTimeout(retryTimer); retryTimer = undefined; }
      if (hardReleaseTimer) { window.clearTimeout(hardReleaseTimer); hardReleaseTimer = undefined; }
    };

    const startLoadingWatchdogs = () => {
      // 6s — soften the message so weak mobile connections don't feel frozen.
      slowTimer = window.setTimeout(() => {
        if (mounted && !roleResolved) {
          setIsSlowLoad(true);
          setLoadingMessage("Still signing you in…");
        }
      }, 6000);

      // 10s — retry role resolution ONCE if we already know the auth user.
      retryTimer = window.setTimeout(() => {
        if (!mounted || roleResolved) return;
        if (lastResolvedUser) {
          console.warn("[Auth] Slow role resolution — retrying once at 10s.");
          setLoadingMessage("Still signing you in… (retrying)");
          handleSupabaseUser(lastResolvedUser.id, lastResolvedUser.email)
            .catch((e) => console.warn("[Auth] retry failed:", e))
            .finally(() => {
              if (mounted && !roleResolved) {
                // If the retry succeeded, handleSupabaseUser set the user;
                // clear the loading flag now.
                roleResolved = true;
                clearTimers();
                setIsLoading(false);
              }
            });
        }
      }, 10000);

      // 15s — hard release so the UI never looks frozen.
      hardReleaseTimer = window.setTimeout(() => {
        if (mounted && !roleResolved) {
          console.warn("[Auth] Role-resolution timeout (15s) — releasing UI");
          roleResolved = true;
          setIsLoading(false);
        }
      }, 15000);
    };

    const initializeAuth = async () => {
      try {
        startLoadingWatchdogs();

        const { data: { session } } = await supabase.auth.getSession();

        if (!session && mounted) {
          roleResolved = true;
          clearTimers();
          setIsLoading(false);
          return;
        }

        // Revalidate the cached session against the auth server. If the JWT
        // signing key was rotated (or the token was otherwise invalidated),
        // getUser() returns an error like "bad_jwt" / "token signature is
        // invalid" / "user not found". In that case the cached session is
        // dead — every PostgREST call will 401 forever — so we must clear it
        // locally and let the user sign in fresh. This is what unwedges
        // installed PWAs whose refresh tokens outlived a key rotation.
        try {
          const { data: userData, error: userErr } = await supabase.auth.getUser();
          const invalid =
            !!userErr ||
            !userData?.user ||
            /bad[_ ]jwt|signature|invalid|expired|not.?found/i.test(userErr?.message || "");
          if (invalid && mounted) {
            console.warn("[Auth] Cached session rejected by auth server — clearing locally.");
            try {
              await supabase.auth.signOut({ scope: "local" } as any);
            } catch (e) {
              console.warn("[Auth] local signOut failed (ignored):", e);
            }
            roleResolved = true;
            clearTimers();
            setUser(null);
            setIsLoading(false);
          }
        } catch (e) {
          console.warn("[Auth] getUser revalidation threw:", e);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
        roleResolved = true;
        clearTimers();
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

          if (event === "PASSWORD_RECOVERY") {
            console.log("[Auth] PASSWORD_RECOVERY event — skipping auto-login");
            roleResolved = true;
            clearTimers();
            setIsLoading(false);
            return;
          }

          if (event === "SIGNED_IN" && window.location.hash.includes("type=recovery")) {
            console.log("[Auth] SIGNED_IN during recovery — skipping auto-login");
            roleResolved = true;
            clearTimers();
            setIsLoading(false);
            return;
          }

          if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
            lastResolvedUser = { id: session.user.id, email: session.user.email || "" };
            try {
              await handleSupabaseUser(session.user.id, session.user.email || "");
            } finally {
              roleResolved = true;
              clearTimers();
              if (mounted) setIsLoading(false);
            }
          } else if (event === "SIGNED_OUT") {
            roleResolved = true;
            clearTimers();
            setUser(null);
            setIsSlowLoad(false);
            setLoadingMessage("Signing you in…");
            setIsLoading(false);
          } else if (event === "INITIAL_SESSION" && !session) {
            roleResolved = true;
            clearTimers();
            setIsLoading(false);
          }
        }, 0);
      }
    );

    initializeAuth();

    return () => {
      mounted = false;
      clearTimers();
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
        .ilike("email", email.trim().toLowerCase())
        .maybeSingle();

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
    // Clear the user first so protected routes redirect on the next tick
    // (before the async signOut resolves). This prevents the brief
    // "Signing you in…" flash between navigation and the SIGNED_OUT event.
    setUser(null);
    setIsLoading(false);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn("[Auth] signOut error (ignored):", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        loadingMessage,
        isSlowLoad,
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
