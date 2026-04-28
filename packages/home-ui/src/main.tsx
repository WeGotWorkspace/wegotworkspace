import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HomeApp } from "@/HomeApp";
import "./styles.css";

declare global {
  interface Window {
    __SABRE_HOME_CONFIG__?: {
      title?: string;
      realm?: string;
      username?: string;
      apps?: {
        admin?: string;
        settings?: string;
        drive?: string;
        mail?: string;
        voice?: string;
        notes?: string;
        office?: string;
        officeDoc?: string;
        officeSheet?: string;
        officeSlides?: string;
      };
      logoutUrl?: string;
      availability?: {
        filesEnabled?: boolean;
        drive?: boolean;
        mail?: boolean;
        voice?: boolean;
        notes?: boolean;
        office?: boolean;
      };
    };
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HomeApp />
  </StrictMode>,
);
