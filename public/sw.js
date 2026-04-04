// PSW Direct — Nuke & Pave Service Worker v4
// This version immediately unregisters itself and clears all caches.
// Deploy this to force all users onto fresh bundles.

const NUKE_VERSION = "psw-nuke-v4";

self.addEventListener("install", (event) => {
  console.log("[SW] Nuke worker installing — will clear all caches");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Nuke worker activating — purging everything");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => {
        console.log("[SW] Deleting cache:", k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim()).then(() => {
      // Tell all clients to reload
      self.clients.matchAll({ type: "window" }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: "SW_CACHE_CLEARED" }));
      });
      // Unregister self — no more SW needed
      self.registration.unregister().then(() => {
        console.log("[SW] Self-unregistered successfully");
      });
    })
  );
});

// No fetch handler — let everything go to network
