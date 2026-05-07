import { useMemo } from "react";
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
  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useWorkspaceApi({
      source: resolvedSource,
      createDefaultSource: createDefaultNotesApiSource,
      placeholderData,
      loadBootstrap: (apiSource) => apiSource.loadBootstrap(),
      createOperations: (apiSource) => apiSource.createOperations(),
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
