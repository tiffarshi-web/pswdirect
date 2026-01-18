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

  const fetchClientProfile = async (userId: string, email: string) => {
    try {
      const { data, error } = await supabase
        .from("client_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (error && error.code === "PGRST116") {
        // Profile doesn't exist, create one
        const { data: newProfile, error: createError } = await supabase
          .from("client_profiles")
          .insert({
            user_id: userId,
            email: email,
            first_name: email.split("@")[0], // Default name from email
          })
          .select()
          .single();

        if (!createError && newProfile) {
          setClientProfile(newProfile);
        }
      } else if (!error && data) {
        setClientProfile(data);
      }
    } catch (err) {
      console.error("Error fetching client profile:", err);
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