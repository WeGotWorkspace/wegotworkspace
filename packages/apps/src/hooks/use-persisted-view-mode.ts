import { useCallback, useState } from "react";
import type { ViewMode } from "@/view-mode-toggle/src/view-mode-toggle";
import { readPersistedViewMode, writePersistedViewMode } from "@/hooks/persisted-view-mode";

export type UsePersistedViewModeArgs = {
  storageKey: string;
  defaultMode: ViewMode;
};

export function usePersistedViewMode({ storageKey, defaultMode }: UsePersistedViewModeArgs) {
  const [viewMode, setViewModeState] = useState<ViewMode>(() =>
    readPersistedViewMode(storageKey, defaultMode),
  );

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      setViewModeState(mode);
      writePersistedViewMode(storageKey, mode);
    },
    [storageKey],
  );

  return [viewMode, setViewMode] as const;
}
