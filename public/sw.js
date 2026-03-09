// PSW Direct — Resilient Service Worker
// Ensures new deployments never cause blank screens

const CACHE_VERSION = "psw-v3";
const RUNTIME_CACHE = `runtime-${CACHE_VERSION}`;

// Essential files to pre-cache for offline/standalone launch
const PRECACHE_URLS = ["/", "/index.html", "/favicon.png", "/logo-192.png"];

// 1. Install: skipWaiting + pre-cache essentials
self.addEventListener("install", (event) => {
  console.log("[SW] Installing", CACHE_VERSION);
  event.waitUntil(
    caches
      .open(RUNTIME_CACHE)
      .then((cache) => {
        return cache.addAll(PRECACHE_URLS).catch(() => {
          console.warn("[SW] Pre-cache failed — continuing anyway");
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

// 3. Fetch handler
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET, cross-origin, and Supabase/API requests
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/rest/") ||
    url.pathname.startsWith("/auth/") ||
    url.pathname.startsWith("/functions/")
  ) {
    return;
  }

  // Navigation: network-first, fallback to cached index.html
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache the fresh index.html
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put("/index.html", clone));
          return response;
        })
        .catch(() => caches.match("/index.html"))
    );
    return;
  }

  // Assets (JS/CSS/images): network-first with cache fallback
  // For hashed assets, cache on success; on failure, try cache then fallback to index.html for JS
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then((cached) => {
          if (cached) return cached;
          // If a JS chunk is missing (new deploy invalidated old chunks),
          // return index.html so the app can re-bootstrap
          if (url.pathname.endsWith(".js") || url.pathname.endsWith(".css")) {
            return caches.match("/index.html");
          }
          return new Response("", { status: 408 });
        })
      )
  );
});
