import { useCallback, useState } from "react";
import { makeDocsOfflineAvailable } from "@/lib/offline/docs/docs-offline-pin-core";

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

  return {
    loadingId,
    makeAvailableOffline,
    isPinning: loadingId !== null,
  };
}
