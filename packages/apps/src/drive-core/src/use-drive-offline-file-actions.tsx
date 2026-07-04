import { useCallback } from "react";
import { CloudOff, HardDriveDownload } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { useConnectivity } from "@/hooks/use-connectivity";
import type { ActionBarAction } from "@/action-bar/src/action-bar";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { readOfflineDeviceContentSettings } from "@/lib/offline/core/offline-device-settings";
import { hasOfflineFileContent } from "@/lib/offline/shared/content-availability";
import {
  makeDriveOfflineAvailable,
  removeDriveOfflineCopy,
} from "@/lib/offline/drive/drive-offline-pin-core";

function parseFileSizeBytes(file: DriveFile): number {
  if (file.kind === "folder") return 0;
  const raw = file.size?.replace(/[^\d.]/g, "");
  if (!raw) return 0;
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  if (file.size?.includes("GB")) return Math.round(value * 1024 * 1024 * 1024);
  if (file.size?.includes("MB")) return Math.round(value * 1024 * 1024);
  if (file.size?.includes("KB")) return Math.round(value * 1024);
  return Math.round(value);
}

export function useDriveOfflineFileActions(
  username: string | null | undefined,
  onChanged?: () => void,
): (file: DriveFile) => ActionBarAction[] {
  const { online } = useConnectivity();
  const { showError, show } = useAppToast();

  return useCallback(
    (file: DriveFile) => {
      if (!username || file.kind === "folder" || !file.apiPath) return [];

      const settings = readOfflineDeviceContentSettings();
      const sizeBytes = parseFileSizeBytes(file);
      const overLimit = sizeBytes > settings.maxFileSizeBytes;
      const actions: ActionBarAction[] = [];

      if (online && overLimit && settings.contentSyncEnabled) {
        actions.push({
          label: "Make available offline",
          icon: <HardDriveDownload className="size-4" aria-hidden />,
          onClick: () => {
            void (async () => {
              try {
                await makeDriveOfflineAvailable(username, file.apiPath!);
                show("File saved for offline use");
                onChanged?.();
              } catch (error) {
                showError(error instanceof Error ? error.message : String(error));
              }
            })();
          },
        });
      }

      actions.push({
        label: "Remove offline copy",
        icon: <CloudOff className="size-4" aria-hidden />,
        onClick: () => {
          void (async () => {
            try {
              const hasContent = await hasOfflineFileContent(username, file.apiPath!);
              if (!hasContent) {
                showError("No offline copy for this file.");
                return;
              }
              await removeDriveOfflineCopy(username, file.apiPath!);
              show("Offline copy removed");
              onChanged?.();
            } catch (error) {
              showError(error instanceof Error ? error.message : String(error));
            }
          })();
        },
      });

      return actions;
    },
    [onChanged, online, show, showError, username],
  );
}
