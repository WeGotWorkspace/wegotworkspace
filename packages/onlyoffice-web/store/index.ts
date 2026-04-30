import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useSyncExternalStore } from "react";
import { EditorServer } from "@/utils/editor/server";
import { type OfficeTheme } from "@/utils/editor/types";

type Locale = string;
type Language = Locale | "auto";

const AUTO_LANGUAGE: Language = "auto";

function normalizeLocale(input: string): Locale {
  const normalized = input.trim().replace("_", "-");
  return normalized || "en";
}

/**
 * Resolves the language setting to an actual locale code.
 * If the language is set to "auto", it detects the browser's preferred language.
 */
function resolveLanguage(language: Language): Locale {
  if (language === AUTO_LANGUAGE) {
    const browserLang =
      typeof navigator !== "undefined"
        ? (navigator as Navigator & { userLanguage?: string }).language ||
          (navigator as Navigator & { userLanguage?: string }).userLanguage
        : "en";
    return normalizeLocale(browserLang || "en");
  }
  return normalizeLocale(language);
}

interface AppState {
  // Document State
  server: EditorServer;

  // Settings State
  language: Language;
  theme: OfficeTheme;

  // Actions
  setState: (state: Partial<Pick<AppState, "language" | "theme">>) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Document Initial State
      server: new EditorServer(),

      // Settings Initial State
      language: AUTO_LANGUAGE,
      theme: "theme-white",

      // Settings Actions
      setState: (newState) => set((state) => ({ ...state, ...newState })),
    }),
    {
      name: "office-state",
      // Only persist settings, skip server instance
      partialize: (state) => ({
        language: state.language,
        theme: state.theme,
      }),
    },
  ),
);

/**
 * Hook to check if persist rehydration has completed.
 * Returns false during SSR and before localStorage state is loaded,
 * then true once the persisted state has been applied.
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    (callback) => {
      const unsub = useAppStore.persist.onFinishHydration(callback);
      return unsub;
    },
    () => useAppStore.persist.hasHydrated(),
    () => false, // SSR: always false
  );
}

/**
 * Hook to get the resolved language (reactive).
 * When language setting is "auto", returns the detected browser language.
 * Re-renders automatically when language setting changes.
 */
export function useResolvedLanguage(): Locale {
  return useAppStore((state) => resolveLanguage(state.language));
}
