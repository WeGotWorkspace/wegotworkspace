import { useCallback, useMemo, useState } from "react";
import { useWorkspaceApi } from "@/hooks/use-workspace-api";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
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
  const loadBootstrapFromSource = useCallback(
    (apiSource: ContactsApiSource) => apiSource.loadBootstrap(),
    [],
  );
  const createOperationsFromSource = useCallback(
    (apiSource: ContactsApiSource) => apiSource.createOperations(),
    [],
  );
  const {
    phase,
    error,
    retry,
    successVersion,
    listLoading: bootstrapLoading,
    session,
    data,
    operations,
    patchBootstrap,
  } = useWorkspaceApi({
    source: resolvedSource,
    createDefaultSource: createDefaultContactsApiSource,
    placeholderData,
    loadBootstrap: loadBootstrapFromSource,
    createOperations: createOperationsFromSource,
    fallbackSession: mockWorkspaceSession,
  });
  const [listRefreshing, setListRefreshing] = useState(false);

  const refreshList = useCallback(() => {
    if (listRefreshing) return;
    setListRefreshing(true);
    void loadBootstrapFromSource(resolvedSource)
      .then((next) => {
        patchBootstrap(() => next);
      })
      .finally(() => {
        setListRefreshing(false);
      });
  }, [listRefreshing, loadBootstrapFromSource, patchBootstrap, resolvedSource]);

  return {
    phase,
    error,
    retry,
    successVersion,
    listLoading: bootstrapLoading || listRefreshing,
    refreshList,
    session,
    data,
    operations,
  };
}
