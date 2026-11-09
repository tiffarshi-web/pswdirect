import { supabase } from "@/integrations/supabase/client";
import { clearLocalWorkerData, restoreSession } from "./nativeSession";

export interface BasicWorkerSignIn {
  firstName: string;
  email: string;
  status: string;
}

async function workerProfile(email: string | undefined): Promise<BasicWorkerSignIn> {
  if (!email) throw new Error("Please sign in with your caregiver email address.");
  const { data, error } = await supabase
    .from("psw_profiles")
    .select("first_name, vetting_status")
    .ilike("email", email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw new Error("Could not check your caregiver account. Please try again.");
  if (!data) throw new Error("No caregiver profile was found for this account. Please contact the office.");

  return {
    firstName: data.first_name || "Caregiver",
    email,
    status: data.vetting_status || "pending",
  };
}

export async function restoreWorkerSignIn(): Promise<BasicWorkerSignIn | null> {
  await restoreSession();
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error("Could not restore your sign-in. You can sign in again below.");
  return data.session ? workerProfile(data.session.user.email) : null;
}

export async function signInWorker(email: string, password: string): Promise<BasicWorkerSignIn> {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    if (error?.message.includes("Invalid login credentials")) {
      throw new Error("Your email or password is incorrect. Please try again.");
    }
    throw new Error("Could not sign in. Check your connection and try again.");
  }
  return workerProfile(data.user.email);
}

export async function signOutWorker(): Promise<void> {
  await clearLocalWorkerData();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("Could not finish signing out. Please try again.");
}
