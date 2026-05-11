import { useCallback, useMemo } from "react";
import { useWorkspaceApi } from "@/hooks/use-workspace-api";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { NotesUIData } from "@/notes-core/src/notes-types";
import { createDefaultNotesApiSource, type NotesApiSource } from "./notes-api-source";

export function useNotesAPI(source?: NotesApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultNotesApiSource(), [source]);
  const placeholderData = useMemo<NotesUIData>(
    () => ({
      notes: [],
      notebooks: [],
      tags: [],
    }),
    [],
  );
  const loadBootstrapFromSource = useCallback(
    (apiSource: NotesApiSource) => apiSource.loadBootstrap(),
    [],
  );
  const createOperationsFromSource = useCallback(
    (apiSource: NotesApiSource) => apiSource.createOperations(),
    [],
  );
  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useWorkspaceApi({
      source: resolvedSource,
      createDefaultSource: createDefaultNotesApiSource,
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
