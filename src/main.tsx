import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { killDevModeOnProduction } from "./lib/devConfig";
import { checkAndBustStaleCache, hasValidSupabaseConfig } from "./lib/cacheBuster";

// KILL DEV: Clear dev mode keys on production domain immediately
killDevModeOnProduction();

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
