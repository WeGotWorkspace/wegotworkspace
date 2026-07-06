import { useCallback, useState } from "react";
import { DRIVE_VIEW_MODE_STORAGE_KEY } from "@/hooks/persisted-view-mode";
import {
  readDriveViewMode,
  writeDriveViewMode,
  type DriveViewMode,
} from "@/drive-core/src/drive-view-mode";

export function usePersistedDriveViewMode(defaultMode: DriveViewMode = "grid") {
  const [viewMode, setViewModeState] = useState<DriveViewMode>(() =>
    readDriveViewMode(DRIVE_VIEW_MODE_STORAGE_KEY, defaultMode),
  );

  const setViewMode = useCallback((mode: DriveViewMode) => {
    setViewModeState(mode);
    writeDriveViewMode(DRIVE_VIEW_MODE_STORAGE_KEY, mode);
  }, []);

  return [viewMode, setViewMode] as const;
}
