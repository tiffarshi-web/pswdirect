import React from "react";
import { createRoot } from "react-dom/client";
import WorkerApp from "./WorkerApp";
import "../index.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Worker application root element was not found");
}

createRoot(root).render(
  <React.StrictMode>
    <WorkerApp />
  </React.StrictMode>,
);
