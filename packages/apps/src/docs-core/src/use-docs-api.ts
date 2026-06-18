import { useCallback, useEffect, useMemo } from "react";
import { useOnReconnect } from "@/hooks/use-connectivity";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { useHybridBootstrap } from "@/lib/live/use-hybrid-bootstrap";
import {
  createHybridDocsOperations,
  getDocsSyncRunner,
} from "@/lib/offline/docs/docs-hybrid-operations";
import { readDocsBootstrapFromCache } from "@/lib/offline/docs/docs-offline-store";
import { readOfflineDocsUsername, resolveDocsOfflineUsername } from "@/lib/offline/offline-session";
import { setDocsSyncConflictListener } from "@/lib/offline/docs/docs-sync-conflicts";
import type { DocsUIData } from "@/docs-core/src/docs-types";
import { createDefaultDocsApiSource, type DocsApiSource } from "@/docs-core/src/docs-api-source";

export type UseDocsAPIOptions = {
  onSyncConflict?: (apiPaths: string[]) => void;
};

export function useDocsAPI(source?: DocsApiSource, options?: UseDocsAPIOptions) {
  const resolvedSource = useMemo(() => source ?? createDefaultDocsApiSource(), [source]);
  const placeholderData = useMemo<DocsUIData>(() => ({ document: null }), []);

  const runBootstrap = useCallback(() => resolvedSource.loadBootstrap(), [resolvedSource]);
  const readCache = useCallback(async () => {
    const username = readOfflineDocsUsername();
    if (!username) return null;
    return readDocsBootstrapFromCache(username);
  }, []);

  const { phase, error, data, load, successVersion, patchBootstrap } = useHybridBootstrap({
    load: runBootstrap,
    readCache,
  });

  const hybridOperations = useMemo(() => {
    const username = resolveDocsOfflineUsername(data?.session.user.username);
    if (!username) return undefined;
    return createHybridDocsOperations(username);
  }, [data?.session.user.username]);

  const networkOperations = useMemo(
    () => resolvedSource.createNetworkOperations(),
    [resolvedSource],
  );

  const offlineUsername = useMemo(
    () => resolveDocsOfflineUsername(data?.session.user.username),
    [data?.session.user.username],
  );

  const onSyncConflict = options?.onSyncConflict;

  useEffect(() => {
    setDocsSyncConflictListener(onSyncConflict);
    return () => setDocsSyncConflictListener(undefined);
  }, [onSyncConflict]);

  useOnReconnect(
    useCallback(() => {
      if (!offlineUsername) return;
      void (async () => {
        await getDocsSyncRunner(offlineUsername).flush();
        const cached = await readDocsBootstrapFromCache(offlineUsername);
        if (cached) patchBootstrap(() => cached);
      })();
    }, [offlineUsername, patchBootstrap]),
  );

  return {
    phase,
    error,
    retry: load,
    successVersion,
    listLoading: phase === "loading",
    session: data?.session ?? mockWorkspaceSession,
    data: data?.data ?? placeholderData,
    hybridOperations,
    networkOperations,
  };
}
