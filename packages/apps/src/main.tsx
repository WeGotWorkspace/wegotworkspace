import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WeGotWorkspaceApp } from "@/wegotworkspace/src/wegotworkspace-app";
import "@/styles.css";

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  void import("virtual:pwa-register").then(({ registerSW }) => {
    const isLocalPreview = location.hostname === "localhost" || location.hostname === "127.0.0.1";

    registerSW({
      immediate: true,
      /** Local preview: never auto-reload when a new worker activates (avoids reload loops). */
      onNeedReload() {
        if (!isLocalPreview) {
          window.location.reload();
        }
      },
      /** Local preview: leave waiting workers idle until all tabs close. */
      onNeedRefresh() {
        if (!isLocalPreview) {
          window.location.reload();
        }
      },
    });
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
