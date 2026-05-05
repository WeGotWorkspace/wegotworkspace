import "@/styles.css";

import { CallApp } from "@/components/call/CallApp";
import { parseRoomCodeFromGuestPath } from "@/lib/sabreJoinUrl";
import { Toaster } from "@wgw/ui";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const SETTINGS_KEY = "aura-voice-settings-v1";

declare global {
  interface Window {
    __SABRE_VOICE_CONFIG__?: {
      signalingUrl?: string;
      displayName?: string;
      logoutUrl?: string;
      /** When false, the UI only allows joining with a room code (Sabre sign-in required to create). */
      canCreateRoom?: boolean;
      /** Pathname prefix for guest links, e.g. {@code /voice/join/} (must match {@code location.pathname}). */
      guestJoinPath?: string;
      /** Server-driven ICE (Admin → Settings); merged into saved Voice settings on load. */
      turnUrl?: string;
      turnUsername?: string;
      turnCredential?: string;
      forceRelay?: boolean;
    };
  }
}

function applySabreVoiceDefaults(): void {
  const cfg = window.__SABRE_VOICE_CONFIG__;
  if (!cfg) {
    return;
  }
  const defaults = {
    displayName: "",
    signalingUrl: "",
    turnUrl: "",
    turnUsername: "",
    turnCredential: "",
    forceRelay: false,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const cur = raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    let dirty = false;
    const sig = cfg.signalingUrl != null ? String(cfg.signalingUrl).trim() : "";
    if (sig !== "" && cur.signalingUrl !== sig) {
      cur.signalingUrl = sig;
      dirty = true;
    }
    if ("turnUrl" in cfg) {
      const v = String(cfg.turnUrl ?? "");
      if (cur.turnUrl !== v) {
        cur.turnUrl = v;
        dirty = true;
      }
    }
    if ("turnUsername" in cfg) {
      const v = String(cfg.turnUsername ?? "");
      if (cur.turnUsername !== v) {
        cur.turnUsername = v;
        dirty = true;
      }
    }
    if ("turnCredential" in cfg) {
      const v = String(cfg.turnCredential ?? "");
      if (cur.turnCredential !== v) {
        cur.turnCredential = v;
        dirty = true;
      }
    }
    if ("forceRelay" in cfg) {
      const v = !!cfg.forceRelay;
      if (cur.forceRelay !== v) {
        cur.forceRelay = v;
        dirty = true;
      }
    }
    const dn = cfg.displayName != null ? String(cfg.displayName).trim() : "";
    if (dn !== "" && !String(cur.displayName ?? "").trim()) {
      cur.displayName = dn;
      dirty = true;
    }
    if (dirty) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(cur));
    }
  } catch {
    /* ignore corrupt localStorage */
  }
}

applySabreVoiceDefaults();

const initialAutoJoinRoom = typeof window !== "undefined" ? parseRoomCodeFromGuestPath() : null;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <>
      <CallApp initialAutoJoinRoom={initialAutoJoinRoom} />
      <Toaster />
    </>
  </StrictMode>,
);
