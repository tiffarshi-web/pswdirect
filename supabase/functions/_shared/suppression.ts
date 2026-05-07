import { createClient } from "npm:@supabase/supabase-js@2";

export async function isEmailSuppressed(
  supabase: ReturnType<typeof createClient>,
  email: string
): Promise<boolean> {
  if (!email) return false;
  const { data } = await supabase
    .from("suppressed_emails")
    .select("email")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();
  return !!data;
}
