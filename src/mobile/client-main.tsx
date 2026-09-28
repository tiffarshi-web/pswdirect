import React from "react";
import { createRoot } from "react-dom/client";
import ClientApp from "./ClientApp";
import "../index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Client application root element was not found");

createRoot(root).render(
  <React.StrictMode>
    <ClientApp />
  </React.StrictMode>,
);
