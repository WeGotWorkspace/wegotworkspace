import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { getRouter } from "./router";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Missing #root container for admin UI.");
}

const router = getRouter();

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
