import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WeGotWorkspaceApp } from "@/wegotworkspace/src/wegotworkspace-app";
import "@/styles.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW({ immediate: true });
  });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <WeGotWorkspaceApp />
  </StrictMode>,
);
