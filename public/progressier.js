// PSW Direct — Resilient Service Worker Wrapper
// Ensures new deployments never cause blank screens

const CACHE_VERSION = "psw-v1";
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// 1. Install: skipWaiting + complete even if network fails
self.addEventListener("install", (event) => {
  console.log("[SW] Installing", CACHE_VERSION);
  // Don't let a failed cache.addAll block activation
  event.waitUntil(
    caches
      .open(RUNTIME_CACHE)
      .then((cache) => {
        // Pre-cache only the shell — failures are OK
        return cache.addAll(["/", "/index.html"]).catch(() => {
          console.warn("[SW] Pre-cache failed (offline install?) — continuing anyway");
        });
      })
      .then(() => self.skipWaiting())
  );
});

// 2. Activate: claim clients + purge old caches
self.addEventListener("activate", (event) => {
  console.log("[SW] Activating", CACHE_VERSION);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k !== RUNTIME_CACHE)
            .map((k) => {
              console.log("[SW] Deleting stale cache:", k);
              return caches.delete(k);
            })
        )
      )
      .then(() => self.clients.claim())
  );
});

// 3. Fetch: network-first for navigations, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Navigation requests — always go to network first
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  // For other requests, try network then fall back to cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful GET responses
        if (request.method === "GET" && response.status === 200) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() => caches.match(request))
  );
});

// 4. Import Progressier (adds push notifications etc.)
// Placed AFTER our listeners so ours take priority
try {
  importScripts("https://progressier.app/xXf0UWVAPdw78va7cNFf/sw.js");
} catch (e) {
  console.warn("[SW] Progressier script failed to load:", e);
}
