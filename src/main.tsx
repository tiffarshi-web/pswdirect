import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { killDevModeOnProduction } from "./lib/devConfig";

// KILL DEV: Clear dev mode keys on production domain immediately
killDevModeOnProduction();

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
