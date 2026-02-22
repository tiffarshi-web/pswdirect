import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { killDevModeOnProduction } from "./lib/devConfig";
import { checkAndBustStaleCache } from "./lib/cacheBuster";

// KILL DEV: Clear dev mode keys on production domain immediately
killDevModeOnProduction();

// Cache buster: detect stale PWA bundles and force refresh
checkAndBustStaleCache();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
