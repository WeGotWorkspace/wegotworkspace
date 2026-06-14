import { useCallback, useMemo } from "react";
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
  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useWorkspaceApi({
      source: resolvedSource,
      createDefaultSource: createDefaultContactsApiSource,
      placeholderData,
      loadBootstrap: loadBootstrapFromSource,
      createOperations: createOperationsFromSource,
      fallbackSession: mockWorkspaceSession,
    });

  return {
    phase,
    error,
    retry,
    successVersion,
    listLoading,
    session,
    data,
    operations,
  };
}
