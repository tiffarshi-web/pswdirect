import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { createSecureAuthStorage, purgeWebTokenCopies } from "./secureAuthStorage";

/**
 * Backend client for the packaged Client and Worker apps only.
 * vite.client.config.ts / vite.worker.config.ts alias
 * "@/integrations/supabase/client" to this file, so every import in the native
 * bundles gets secure (Keychain/Keystore) session storage. The website and the
 * Lovable preview keep the generated client unchanged.
 */
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Supabase's first startup read goes through the adapter, which moves any
// older plaintext copy into secure storage and deletes it before use.
const storage = createSecureAuthStorage();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { purgeWebTokenCopies };
