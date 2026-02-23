// Cache Buster — detects stale PWA bundles and forces a refresh
// This runs on app boot and checks if the Supabase env vars are present.
// If they're missing, the user is running an outdated cached bundle.

const APP_VERSION_KEY = "psa_app_version";
const CACHE_BUST_KEY = "psa_cache_busted";
const CACHE_BUST_COUNT_KEY = "psa_cache_bust_count";

// Build-time version stamp (changes every build)
const CURRENT_VERSION = import.meta.env.VITE_SUPABASE_PROJECT_ID || "__missing__";

// Returns true if cache bust was triggered (app will reload)
export function checkAndBustStaleCache(): boolean {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Critical: if env vars are missing, the bundle is stale
  if (!supabaseUrl || !supabaseKey) {
    console.error("[CacheBuster] Missing Supabase env vars — stale bundle detected");
    return forceRefresh("missing_env");
  }

  // Version check: if the stored version differs, clear caches
  const storedVersion = localStorage.getItem(APP_VERSION_KEY);
  if (storedVersion && storedVersion !== CURRENT_VERSION) {
    console.warn("[CacheBuster] App version changed, clearing caches");
    return forceRefresh("version_mismatch");
  }

  // Store current version
  localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
  // Reset bust counter on successful load
  localStorage.removeItem(CACHE_BUST_COUNT_KEY);
  return false;
}

// Returns true if env vars are present and valid
export function hasValidSupabaseConfig(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  return !!(url && key && url.startsWith("https://") && key.length > 20);
}

function forceRefresh(reason: string): boolean {
  // Track how many times we've busted in this browser
  const bustCount = parseInt(localStorage.getItem(CACHE_BUST_COUNT_KEY) || "0", 10);
  
  // Prevent infinite refresh loops — max 3 attempts
  if (bustCount >= 3) {
    console.error("[CacheBuster] Max retry limit reached. Stale bundle cannot be resolved automatically.");
    return false;
  }

  // Also check session-level flag
  const alreadyBusted = sessionStorage.getItem(CACHE_BUST_KEY);
  if (alreadyBusted) {
    console.warn("[CacheBuster] Already attempted cache bust this session, skipping");
    return false;
  }
  
  sessionStorage.setItem(CACHE_BUST_KEY, "true");
  localStorage.setItem(CACHE_BUST_COUNT_KEY, String(bustCount + 1));

  console.log(`[CacheBuster] Force refresh triggered (reason: ${reason}, attempt: ${bustCount + 1})`);

  // Synchronously unregister service workers and clear caches, then reload
  (async () => {
    try {
      if ("serviceWorker" in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const reg of registrations) {
          await reg.unregister();
          console.log("[CacheBuster] Unregistered service worker:", reg.scope);
        }
      }

      if ("caches" in window) {
        const cacheNames = await caches.keys();
        for (const name of cacheNames) {
          await caches.delete(name);
          console.log("[CacheBuster] Deleted cache:", name);
        }
      }

      localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
    } catch (err) {
      console.error("[CacheBuster] Error during cache bust:", err);
    } finally {
      // Hard reload bypassing cache
      window.location.reload();
    }
  })();

  return true; // Signal that we're reloading
}
