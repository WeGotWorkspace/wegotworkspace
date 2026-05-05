import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MailApp } from "@/MailApp";
import "./styles.css";

declare global {
  interface Window {
    __SABRE_MAIL_CONFIG__?: {
      logoutUrl?: string;
    };
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MailApp />
  </StrictMode>,
);
