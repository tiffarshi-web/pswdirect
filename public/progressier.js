// PSW Direct — Progressier service worker.
//
// Progressier's client script registers THIS file (same-origin /progressier.js)
// as the service worker. It must contain Progressier's own worker code, which
// owns the push event handler. Previously this path served an unrelated custom
// worker (or the SPA's index.html), so devices either failed to register or
// registered a worker with no push listener — the send API returned success
// while nothing ever appeared on the caregiver's phone.
//
// Do NOT add caching, fetch handlers or other logic here.
importScripts("https://progressier.app/xXf0UWVAPdw78va7cNFf/sw.js");
