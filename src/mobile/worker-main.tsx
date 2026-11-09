import React from "react";
import { createRoot } from "react-dom/client";
import { checkWorkerBackendUrl } from "./native/backendGuard";
import "../index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Worker application root element was not found");
}

function startupFailed(code = "UNKNOWN") {
  window.dispatchEvent(new CustomEvent("psw-worker-startup-error", { detail: code }));
}

class WorkerErrorBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    startupFailed();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// Validate before importing the app: nativeClient creates its Supabase
// instance at module scope and throws if the build configuration is missing.
const backend = checkWorkerBackendUrl(import.meta.env.VITE_SUPABASE_URL);
if (!backend.ok || !import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  startupFailed("BACKEND_CONFIG");
} else {
  void import("./WorkerBasicApp")
    .then(({ default: WorkerBasicApp }) => {
      createRoot(root).render(
        <React.StrictMode>
          <WorkerErrorBoundary>
            <WorkerBasicApp />
          </WorkerErrorBoundary>
        </React.StrictMode>,
      );
    })
    .catch(() => startupFailed());
}
