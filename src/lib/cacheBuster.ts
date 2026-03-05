// Cache Buster — detects stale PWA bundles and forces a refresh
// This runs on app boot and checks if the Supabase env vars are present.
// If they're missing, the user is running an outdated cached bundle.

const APP_VERSION_KEY = "psa_app_version";
const CACHE_BUST_KEY = "psa_cache_busted";
const CACHE_BUST_COUNT_KEY = "psa_cache_bust_count";
const BUILD_TIMESTAMP_KEY = "psa_build_ts";

// Build-time version stamp (changes every build)
const CURRENT_VERSION = import.meta.env.VITE_SUPABASE_PROJECT_ID || "__missing__";

// Generate a build fingerprint from the bundle (changes every deploy)
declare const __BUILD_TIMESTAMP__: string;
const BUILD_FINGERPRINT = `${CURRENT_VERSION}-${typeof __BUILD_TIMESTAMP__ !== "undefined" ? __BUILD_TIMESTAMP__ : "dev"}`;

// Detect if running as installed PWA (standalone mode)
function isStandaloneMode(): boolean {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}

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

  // PWA-specific: on standalone launch, check if build fingerprint changed
  if (isStandaloneMode()) {
    const storedFingerprint = localStorage.getItem(BUILD_TIMESTAMP_KEY);
    if (storedFingerprint && storedFingerprint !== BUILD_FINGERPRINT) {
      console.warn("[CacheBuster] PWA build fingerprint changed, forcing update");
      return forceRefresh("pwa_stale_build");
    }
    localStorage.setItem(BUILD_TIMESTAMP_KEY, BUILD_FINGERPRINT);

    // Extra safety: proactively update service worker on every PWA launch
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.update().catch(() => {});
        }
      });

      // Listen for new SW and force it to activate immediately
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener("updatefound", () => {
          const newSW = registration.installing;
          if (newSW) {
            newSW.addEventListener("statechange", () => {
              if (newSW.state === "activated") {
                console.log("[CacheBuster] New service worker activated");
              }
            });
          }
        });
      });
    }
  }

  // Store current version
  localStorage.setItem(APP_VERSION_KEY, CURRENT_VERSION);
  localStorage.setItem(BUILD_TIMESTAMP_KEY, BUILD_FINGERPRINT);
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
