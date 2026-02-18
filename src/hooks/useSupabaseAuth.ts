// ═══════════════════════════════════════════════════════════════════════════
// Client Supabase Auth Hook
// ═══════════════════════════════════════════════════════════════════════════
//
// CRITICAL DATABASE ARCHITECTURE:
// ─────────────────────────────────────────────────────────────────────────────
//   TABLES (writable):
//     • public.client_profiles → INSERT/UPDATE Client users HERE
//     • public.psw_profiles   → INSERT/UPDATE PSW users (in pswDatabaseStore)
//   
//   VIEW (read-only):
//     • public.profiles → UNION of client_profiles + psw_profiles
//     ⚠️ NEVER INSERT INTO THIS VIEW - it will fail!
//
// When creating a Client account:
//   1. supabase.auth.signUp/signInWithOtp() → creates auth.users entry
//   2. fetchClientProfile() → checks client_profiles, creates if missing
// ═══════════════════════════════════════════════════════════════════════════

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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer profile fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchClientProfile(session.user.id, session.user.email || "");
          }, 0);
        } else {
          setClientProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchClientProfile(session.user.id, session.user.email || "");
      }
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // IMPORTANT: This inserts into client_profiles TABLE, NOT the profiles VIEW
  const fetchClientProfile = async (userId: string, email: string) => {
    try {
      console.log("[Client Auth] Fetching profile for user:", userId);
      
      const { data, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist, create one in client_profiles TABLE
        console.log("[Client Auth] No profile found, creating in client_profiles table...");
        
        const { data: newProfile, error: createError } = await supabase
          .from("client_profiles")
          .insert({
            user_id: userId,
            email: email,
            first_name: email.split("@")[0], // Default name from email
          })
          .select()
          .single();

        if (createError) {
          // Detailed error logging - DO NOT hide database errors
          console.error("[Client Auth] Failed to insert into client_profiles table:", {
            tableName: "client_profiles",
            errorCode: createError.code,
            errorMessage: createError.message,
            errorDetails: createError.details,
            errorHint: createError.hint,
            userId,
            email,
          });
        } else if (newProfile) {
          console.log("[Client Auth] Successfully created client profile:", newProfile.id);
          setClientProfile(newProfile);
        }
      } else if (error) {
        console.error("[Client Auth] Error fetching client profile:", {
          errorCode: error.code,
          errorMessage: error.message,
        });
      } else if (data) {
        console.log("[Client Auth] Found existing profile:", data.id);
        setClientProfile(data);
      }
    } catch (err) {
      console.error("[Client Auth] Exception in fetchClientProfile:", err);
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