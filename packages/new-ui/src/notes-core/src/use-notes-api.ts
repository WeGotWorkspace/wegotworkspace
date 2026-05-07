import { useCallback, useMemo } from "react";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { useLiveBootstrap } from "@/lib/live/use-live-bootstrap";
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
  const loadBootstrap = useCallback(() => resolvedSource.loadBootstrap(), [resolvedSource]);
  const { phase, error, data, load, successVersion } = useLiveBootstrap(loadBootstrap);
  const operations = useMemo(() => resolvedSource.createOperations(), [resolvedSource]);

  return {
    phase,
    error,
    retry: load,
    successVersion,
    listLoading: phase === "loading",
    session: data?.session ?? mockWorkspaceSession,
    data: data?.data ?? placeholderData,
    operations,
  };
}
