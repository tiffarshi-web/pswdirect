import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { killDevModeOnProduction } from "./lib/devConfig";
import { checkAndBustStaleCache, hasValidSupabaseConfig } from "./lib/cacheBuster";

// KILL DEV: Clear dev mode keys on production domain immediately
killDevModeOnProduction();

// Domain redirect: pswdirect.ca → pswdirect.ca (permanent 301-style)
if (
  window.location.hostname === "pswdirect.ca" ||
  window.location.hostname === "www.pswdirect.ca"
) {
  window.location.replace(
    "https://pswdirect.ca" + window.location.pathname + window.location.search + window.location.hash
  );
}

// Global handler: catch chunk/asset loading failures and show recovery
window.addEventListener("error", (e) => {
  const msg = e.message || "";
  if (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Loading chunk") ||
    msg.includes("Loading CSS chunk")
  ) {
    console.error("[AssetError] Chunk load failure detected — triggering recovery");
    const root = document.getElementById("root");
    if (root && root.children.length === 0) {
      root.innerHTML = `
        <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:2rem;text-align:center;background:#f8f9fa">
          <div style="max-width:380px">
            <div style="font-size:2.5rem;margin-bottom:1rem">⚠️</div>
            <h1 style="font-size:1.25rem;margin-bottom:.5rem;color:#111">App Update Available</h1>
            <p style="color:#666;margin-bottom:1.5rem;font-size:.875rem">A newer version is available. Tap below to update.</p>
            <button onclick="localStorage.clear();sessionStorage.clear();if(window.caches){caches.keys().then(function(k){k.forEach(function(n){caches.delete(n)})})}if(navigator.serviceWorker){navigator.serviceWorker.getRegistrations().then(function(r){r.forEach(function(s){s.unregister()})})}setTimeout(function(){location.reload()},300)"
              style="background:#2563eb;color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:.95rem;cursor:pointer;width:100%">Refresh App</button>
          </div>
        </div>`;
    }
  }
});

// Cache buster: detect stale PWA bundles and force refresh
const isReloading = checkAndBustStaleCache();

// Only render the app if we're not in the middle of a cache-bust reload
if (!isReloading) {
  const root = document.getElementById("root")!;
  
  if (!hasValidSupabaseConfig()) {
    // Show a clear error instead of silently making 401 requests
    root.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;padding:2rem;text-align:center;background:#f8f9fa">
        <div style="max-width:400px">
          <h1 style="font-size:1.5rem;margin-bottom:1rem;color:#dc2626">App Update Required</h1>
          <p style="color:#666;margin-bottom:1.5rem">This app is running an outdated version. Please clear your browser cache and reload.</p>
          <button onclick="localStorage.clear();sessionStorage.clear();caches&&caches.keys().then(k=>Promise.all(k.map(n=>caches.delete(n)))).then(()=>location.reload())" 
            style="background:#2563eb;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:1rem;cursor:pointer">
            Clear Cache & Reload
          </button>
        </div>
      </div>
    `;
  } else {
    createRoot(root).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}
