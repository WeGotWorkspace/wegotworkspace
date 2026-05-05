import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Drive } from "@/components/drive/Drive";
import "./styles.css";

declare global {
  interface Window {
    __SABRE_DRIVE_CONFIG__?: {
      logoutUrl?: string;
      apiBaseUrl?: string;
      authSessionUrl?: string;
      authRefreshUrl?: string;
    };
  }
}

const client = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={client}>
      <Drive />
    </QueryClientProvider>
  </StrictMode>,
);
