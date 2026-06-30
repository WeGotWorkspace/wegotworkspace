import { useCallback, useState } from "react";
import {
  makeDocsOfflineAvailable,
  removeDocsOfflineCopy,
} from "@/lib/offline/docs/docs-offline-pin-core";

export function useDocsOfflinePin(username: string) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const makeAvailableOffline = useCallback(
    async (apiPath: string, location: string) => {
      setLoadingId(apiPath);
      try {
        await makeDocsOfflineAvailable(username, apiPath, location);
      } finally {
        setLoadingId(null);
      }
    },
    [username],
  );

  const removeOfflineCopy = useCallback(
    async (apiPath: string) => {
      setLoadingId(apiPath);
      try {
        await removeDocsOfflineCopy(username, apiPath);
      } finally {
        setLoadingId(null);
      }
    },
    [username],
  );

  return {
    loadingId,
    makeAvailableOffline,
    removeOfflineCopy,
    isPinning: loadingId !== null,
  };
}
