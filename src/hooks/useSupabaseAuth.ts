import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface ClientProfile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  phone: string | null;
  default_address: string | null;
  default_postal_code: string | null;
}

export const useSupabaseAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [clientProfile, setClientProfile] = useState<ClientProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST — this provides refreshed sessions
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        // onAuthStateChange provides a refreshed token, so this is safe
        if (session?.user) {
          setTimeout(() => {
            fetchClientProfile(session.user.id, session.user.email || "");
          }, 0);
        } else {
          setClientProfile(null);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session — only for initial loading state
    // Do NOT call fetchClientProfile here; getSession() returns cached tokens
    // that may be expired. Let onAuthStateChange handle data fetching.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        // No session at all — mark loading done immediately
        setIsLoading(false);
      }
      // If session exists, onAuthStateChange INITIAL_SESSION event will fire
      // and handle setting user + fetching profile with a refreshed token
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchClientProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist yet — do NOT auto-create.
        // Client profiles are created only after a completed booking.
        setClientProfile(null);
      } else if (error) {
        // Auth errors (401/403) or other failures — suppress gracefully
        // This prevents console noise from stale tokens during session transitions
        if (error.message?.includes("JWT") || error.code === "PGRST301" || error.message?.includes("401")) {
          console.debug("[useSupabaseAuth] Auth token issue during client_profiles fetch, will retry on next session event");
        } else {
          console.warn("[useSupabaseAuth] client_profiles fetch error:", error.code, error.message);
        }
        setClientProfile(null);
      } else if (data) {
        setClientProfile(data);
      }
    } catch (err) {
      // Network errors or unexpected failures — don't block the app
      console.debug("[useSupabaseAuth] client_profiles fetch exception:", err);
      setClientProfile(null);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setClientProfile(null);
  };

  const updateClientProfile = async (updates: Partial<ClientProfile>) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from("client_profiles")
      .update(updates)
      .eq("user_id", user.id)
      .select()
      .single();

    if (!error && data) {
      setClientProfile(data);
      return data;
    }
    return null;
  };

  return {
    user,
    session,
    clientProfile,
    isLoading,
    isAuthenticated: !!session,
    signOut,
    updateClientProfile,
  };
};