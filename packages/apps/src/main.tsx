import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WeGotWorkspaceApp } from "@/wegotworkspace/src/wegotworkspace-app";
import "@/styles.css";

const isLocalPreviewHost =
  window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
const allowServiceWorkerOnLocalPreview = import.meta.env.VITE_ENABLE_SW_ON_LOCALHOST === "true";

if (
  import.meta.env.PROD &&
  "serviceWorker" in navigator &&
  (!isLocalPreviewHost || allowServiceWorkerOnLocalPreview)
) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    registerSW();
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
