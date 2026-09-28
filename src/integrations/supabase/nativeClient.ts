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

// Drop any plaintext copy synchronously before the client starts; the secure
// adapter migrates a readable copy on its first read (see migrateOnce).
// Order: getItem migrates → then purges, so we purge again after first read.
const storage = createSecureAuthStorage();

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage,
    persistSession: true,
    autoRefreshToken: true,
  },
});

export { purgeWebTokenCopies };
