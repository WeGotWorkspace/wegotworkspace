import { useCallback, useEffect, useMemo, useState } from "react";
import { useOnReconnect } from "@/hooks/use-connectivity";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { useHybridBootstrap } from "@/lib/live/use-hybrid-bootstrap";
import {
  createHybridNotesOperations,
  getNotesSyncRunner,
} from "@/lib/offline/notes-hybrid-operations";
import { readNotesBootstrapFromCache } from "@/lib/offline/notes-offline-store";
import {
  readOfflineNotesUsername,
  resolveNotesOfflineUsername,
} from "@/lib/offline/offline-session";
import { setNotesSyncConflictListener } from "@/lib/offline/notes-sync-conflicts";
import type { NotesUIData } from "@/notes-core/src/notes-types";
import { createDefaultNotesApiSource, type NotesApiSource } from "./notes-api-source";

export type UseNotesAPIOptions = {
  onSyncConflict?: (noteIds: string[]) => void;
};

export function useNotesAPI(source?: NotesApiSource, options?: UseNotesAPIOptions) {
  const resolvedSource = useMemo(() => source ?? createDefaultNotesApiSource(), [source]);
  const placeholderData = useMemo<NotesUIData>(
    () => ({
      notes: [],
      notebooks: [],
      tags: [],
    }),
    [],
  );

  const runBootstrap = useCallback(() => resolvedSource.loadBootstrap(), [resolvedSource]);
  const readCache = useCallback(async () => {
    const username = readOfflineNotesUsername();
    if (!username) return null;
    return readNotesBootstrapFromCache(username);
  }, []);

  const { phase, error, data, load, successVersion, patchBootstrap } = useHybridBootstrap({
    load: runBootstrap,
    readCache,
  });

  const operations = useMemo(() => {
    const fromSource = resolvedSource.createOperations(data ?? undefined);
    if (fromSource) return fromSource;
    const username = resolveNotesOfflineUsername(data?.session.user.username);
    if (!username) return undefined;
    return createHybridNotesOperations(username);
  }, [resolvedSource, data]);

  const offlineUsername = useMemo(
    () => resolveNotesOfflineUsername(data?.session.user.username),
    [data?.session.user.username],
  );

  const onSyncConflict = options?.onSyncConflict;

  useEffect(() => {
    setNotesSyncConflictListener(onSyncConflict);
    return () => setNotesSyncConflictListener(undefined);
  }, [onSyncConflict]);

  useOnReconnect(
    useCallback(() => {
      if (!offlineUsername) return;
      void (async () => {
        await getNotesSyncRunner(offlineUsername).flush();
        const cached = await readNotesBootstrapFromCache(offlineUsername);
        if (cached) patchBootstrap(() => cached);
      })();
    }, [offlineUsername, patchBootstrap]),
  );

  const [listRefreshing, setListRefreshing] = useState(false);

  const refreshList = useCallback(() => {
    if (listRefreshing) return;
    setListRefreshing(true);
    void resolvedSource
      .loadBootstrap()
      .then((next) => {
        patchBootstrap(() => next);
      })
      .finally(() => {
        setListRefreshing(false);
      });
  }, [listRefreshing, patchBootstrap, resolvedSource]);

  return {
    phase,
    error,
    retry: load,
    successVersion,
    listLoading: phase === "loading" || listRefreshing,
    refreshList,
    session: data?.session ?? mockWorkspaceSession,
    data: data?.data ?? placeholderData,
    operations,
  };
}
