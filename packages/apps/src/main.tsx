import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { WeGotWorkspaceApp } from "@/wegotworkspace/src/wegotworkspace-app";
import "@/styles.css";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("Missing #root element");
}

createRoot(rootElement).render(
  <StrictMode>
    <WeGotWorkspaceApp />
  </StrictMode>,
);
