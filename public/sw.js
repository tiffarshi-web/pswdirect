// PSW Direct — kill-switch service worker (Phase 1B).
//
// PURPOSE: For one release cycle, evict any legacy /sw.js registration that
// browsers still have from the previous "nuke & pave" configuration and the
// misrouted `progressierCustomServiceWorker = '/sw.js'` pointer. Progressier's
// own service worker (registered at a different path by their bootstrap
// script) is not touched — Cache Storage is origin-scoped and we only delete
// caches that belong to this worker's own scope.
//
// Once installed, this worker:
//   1. Deletes only legacy app-shell / Workbox-style caches for this scope
//   2. Claims open pages and refreshes them
//   3. Unregisters itself so the browser stops fetching /sw.js entirely
//
// Do NOT add fetch handlers, push handlers, or persistent caching here.
// Push notifications are handled by Progressier's own worker.

function isLegacyAppCacheForThisScope(name) {
  const looksLikeWorkboxOrLegacy =
    /(^|-)precache-v\d+-|(^|-)runtime-|(^|-)googleAnalytics-|^psw-|^psa-/.test(name);
  return looksLikeWorkboxOrLegacy && name.endsWith(self.registration.scope);
}

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const legacy = cacheNames.filter(isLegacyAppCacheForThisScope);
        await Promise.allSettled(legacy.map((name) => caches.delete(name)));
        await self.clients.claim();
        const windowClients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(
          windowClients.map((client) => client.navigate(client.url))
        );
      } finally {
        // Always unregister so the browser stops treating /sw.js as an SW.
        // Progressier's own worker (different path/scope) is unaffected.
        await self.registration.unregister();
      }
    })()
  );
});

// No fetch/push handlers — network fallback for /sw.js; Progressier handles push.
