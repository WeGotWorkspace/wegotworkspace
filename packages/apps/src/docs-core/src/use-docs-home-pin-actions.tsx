import { useCallback, useMemo } from "react";
import { Download, HardDrive, HardDriveDownload } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { isDocsCollabEditablePath } from "@/docs-core/src/docs-collab-text-files";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { ActionBarAction } from "@/action-bar/src/action-bar";
import {
  normalizeDocsAvailabilityPath,
  readDocsAvailability,
} from "@/lib/offline/docs/docs-availability-store";
import { useDocsOfflinePin } from "@/docs-core/src/use-docs-offline-pin";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";

type UseDocsHomePinActionsArgs = {
  username: string;
  labels: DocsUILabels;
  pinnedApiPaths: ReadonlySet<string>;
  onAvailabilityChanged: () => void;
};

export function useDocsHomePinActions({
  username,
  labels,
  pinnedApiPaths,
  onAvailabilityChanged,
}: UseDocsHomePinActionsArgs) {
  const { show, showError } = useAppToast();
  const pin = useDocsOfflinePin(username);

  const onMakeAvailableOffline = useCallback(
    async (file: DriveFile) => {
      if (!file.apiPath) return;
      try {
        await pin.makeAvailableOffline(file.apiPath, file.location ?? "");
        show(labels.offlineAvailable, { icon: <HardDrive className="size-4" /> });
        onAvailabilityChanged();
      } catch (error) {
        showError(error instanceof Error ? error.message : labels.homeLoadError);
      }
    },
    [labels.homeLoadError, labels.offlineAvailable, onAvailabilityChanged, pin, show, showError],
  );

  const onRemoveOfflineCopy = useCallback(
    async (file: DriveFile) => {
      if (!file.apiPath) return;
      try {
        await pin.removeOfflineCopy(file.apiPath);
        show(labels.removeOfflineCopy, { icon: <Download className="size-4" /> });
        onAvailabilityChanged();
      } catch (error) {
        showError(error instanceof Error ? error.message : labels.homeLoadError);
      }
    },
    [labels.homeLoadError, labels.removeOfflineCopy, onAvailabilityChanged, pin, show, showError],
  );

  const extraFileActions = useCallback(
    (file: DriveFile): ActionBarAction[] => {
      const apiPath = file.apiPath?.trim();
      if (!apiPath || !isDocsCollabEditablePath(apiPath)) return [];
      const pinned = pinnedApiPaths.has(normalizeDocsAvailabilityPath(apiPath));
      const loading = pin.loadingId === apiPath;
      if (pinned) {
        return [
          {
            id: "remove-offline",
            label: labels.removeOfflineCopy,
            onClick: () => void onRemoveOfflineCopy(file),
            disabled: loading,
            icon: <HardDriveDownload />,
          },
        ];
      }
      return [
        {
          id: "make-offline",
          label: labels.makeAvailableOffline,
          onClick: () => void onMakeAvailableOffline(file),
          disabled: loading,
          icon: <HardDrive />,
        },
      ];
    },
    [
      labels.makeAvailableOffline,
      labels.removeOfflineCopy,
      onMakeAvailableOffline,
      onRemoveOfflineCopy,
      pin.loadingId,
      pinnedApiPaths,
    ],
  );

  return useMemo(
    () => ({
      extraFileActions,
      onMakeAvailableOffline,
      onRemoveOfflineCopy,
      pinLoadingId: pin.loadingId,
    }),
    [extraFileActions, onMakeAvailableOffline, onRemoveOfflineCopy, pin.loadingId],
  );
}

export async function isDocsPinnedOffline(username: string, apiPath: string): Promise<boolean> {
  const row = await readDocsAvailability(username, apiPath);
  return Boolean(row);
}
