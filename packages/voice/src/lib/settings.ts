/**
 * Persistent settings (TURN server, signaling URL, display name)
 * stored in localStorage. No backend.
 */

import { useEffect, useState, useCallback } from "react";

const KEY = "aura-voice-settings-v1";

export interface AuraSettings {
  displayName: string;
  signalingUrl: string;
  turnUrl: string;
  turnUsername: string;
  turnCredential: string;
  forceRelay: boolean;
}

const DEFAULTS: AuraSettings = {
  displayName: "",
  signalingUrl: "",
  turnUrl: "",
  turnUsername: "",
  turnCredential: "",
  forceRelay: false,
};

function read(): AuraSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function loadSettings(): AuraSettings {
  return read();
}

export function useSettings() {
  const [settings, setSettings] = useState<AuraSettings>(DEFAULTS);

  useEffect(() => {
    setSettings(read());
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setSettings(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const save = useCallback((next: AuraSettings) => {
    localStorage.setItem(KEY, JSON.stringify(next));
    setSettings(next);
  }, []);

  return { settings, save };
}
