import { useCallback, useMemo } from "react";
import { HardDrive } from "lucide-react";
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

  const extraFileActions = useCallback(
    (file: DriveFile): ActionBarAction[] => {
      const apiPath = file.apiPath?.trim();
      if (!apiPath || !isDocsCollabEditablePath(apiPath)) return [];
      const pinned = pinnedApiPaths.has(normalizeDocsAvailabilityPath(apiPath));
      const loading = pin.loadingId === apiPath;
      if (pinned) return [];
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
    [labels.makeAvailableOffline, onMakeAvailableOffline, pin.loadingId, pinnedApiPaths],
  );

  return useMemo(
    () => ({
      extraFileActions,
      onMakeAvailableOffline,
      pinLoadingId: pin.loadingId,
    }),
    [extraFileActions, onMakeAvailableOffline, pin.loadingId],
  );
}

export async function isDocsPinnedOffline(username: string, apiPath: string): Promise<boolean> {
  const row = await readDocsAvailability(username, apiPath);
  return Boolean(row);
}
