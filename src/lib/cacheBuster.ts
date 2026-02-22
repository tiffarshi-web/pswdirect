// Cache Buster — detects stale PWA bundles and forces a refresh
// This runs on app boot and checks if the Supabase env vars are present.
// If they're missing, the user is running an outdated cached bundle.

const APP_VERSION_KEY = "psa_app_version";
const CACHE_BUST_KEY = "psa_cache_busted";

// Build-time version stamp (changes every build)
const CURRENT_VERSION = import.meta.env.VITE_SUPABASE_PROJECT_ID || "__missing__";

export function checkAndBustStaleCache() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  // Critical: if env vars are missing, the bundle is stale
  if (!supabaseUrl || !supabaseKey) {
    console.error("[CacheBuster] Missing Supabase env vars — stale bundle detected");
    forceRefresh("missing_env");
    return;
  }

  // Version check: if the stored version differs, clear caches
  const storedVersion = localStorage.getItem(APP_VERSION_KEY);
  if (storedVersion && storedVersion !== CURRENT_VERSION) {
    console.warn("[CacheBuster] App version changed, clearing caches");
    forceRefresh("version_mismatch");
    return;
  }

  // Store current version
  localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
}

async function forceRefresh(reason: string) {
  // Prevent infinite refresh loops
  const alreadyBusted = sessionStorage.getItem(CACHE_BUST_KEY);
  if (alreadyBusted) {
    console.warn("[CacheBuster] Already attempted cache bust this session, skipping");
    return;
  }
  sessionStorage.setItem(CACHE_BUST_KEY, "true");

  console.log(`[CacheBuster] Force refresh triggered (reason: ${reason})`);

  try {
    // Unregister all service workers
    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const reg of registrations) {
        await reg.unregister();
        console.log("[CacheBuster] Unregistered service worker:", reg.scope);
      }
    }

    // Clear all caches
    if ("caches" in window) {
      const cacheNames = await caches.keys();
      for (const name of cacheNames) {
        await caches.delete(name);
        console.log("[CacheBuster] Deleted cache:", name);
      }
    }

    // Update stored version
    localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);

    // Hard reload to fetch fresh bundle
    window.location.reload();
  } catch (err) {
    console.error("[CacheBuster] Error during cache bust:", err);
    // Last resort: just reload
    window.location.reload();
  }
}
