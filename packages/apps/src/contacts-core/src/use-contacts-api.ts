import { useCallback, useMemo, useState } from "react";
import { useOnReconnect } from "@/hooks/use-connectivity";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { useHybridBootstrap } from "@/lib/live/use-hybrid-bootstrap";
import {
  createHybridContactsOperations,
  getContactsSyncRunner,
} from "@/lib/offline/contacts-hybrid-operations";
import { readContactsBootstrapFromCache } from "@/lib/offline/contacts-offline-store";
import {
  readOfflineContactsUsername,
  resolveContactsOfflineUsername,
} from "@/lib/offline/offline-session";
import type { ContactsUIData } from "@/contacts-core/src/contacts-types";
import { createDefaultContactsApiSource, type ContactsApiSource } from "./contacts-api-source";

export function useContactsAPI(source?: ContactsApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultContactsApiSource(), [source]);
  const placeholderData = useMemo<ContactsUIData>(
    () => ({
      addressBooks: [],
      cards: [],
    }),
    [],
  );

  const runBootstrap = useCallback(() => resolvedSource.loadBootstrap(), [resolvedSource]);
  const readCache = useCallback(async () => {
    const username = readOfflineContactsUsername();
    if (!username) return null;
    return readContactsBootstrapFromCache(username);
  }, []);

  const { phase, error, data, load, successVersion, patchBootstrap } = useHybridBootstrap({
    load: runBootstrap,
    readCache,
  });

  const operations = useMemo(() => {
    const fromSource = resolvedSource.createOperations(data ?? undefined);
    if (fromSource) return fromSource;
    const username = resolveContactsOfflineUsername(data?.session.user.username);
    if (!username) return undefined;
    return createHybridContactsOperations(username);
  }, [resolvedSource, data]);

  const offlineUsername = useMemo(
    () => resolveContactsOfflineUsername(data?.session.user.username),
    [data?.session.user.username],
  );

  useOnReconnect(
    useCallback(() => {
      if (!offlineUsername) return;
      void (async () => {
        await getContactsSyncRunner(offlineUsername).flush();
        const cached = await readContactsBootstrapFromCache(offlineUsername);
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
