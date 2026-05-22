import { useCallback, useMemo } from "react";
import { useWorkspaceApi } from "@/hooks/use-workspace-api";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { createDefaultDocsApiSource, type DocsApiSource } from "@/docs-core/src/docs-api-source";
import type { DocsUIData } from "@/docs-core/src/docs-types";

export function useDocsAPI(source?: DocsApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultDocsApiSource(), [source]);
  const placeholderData = useMemo<DocsUIData>(() => ({ document: null }), []);
  const loadBootstrapFromSource = useCallback(
    (apiSource: DocsApiSource) => apiSource.loadBootstrap(),
    [],
  );
  const createOperationsFromSource = useCallback(
    (apiSource: DocsApiSource) => apiSource.createOperations(),
    [],
  );

  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useWorkspaceApi({
      source: resolvedSource,
      createDefaultSource: createDefaultDocsApiSource,
      placeholderData,
      loadBootstrap: loadBootstrapFromSource,
      createOperations: createOperationsFromSource,
      fallbackSession: mockWorkspaceSession,
    });

  return { phase, error, retry, successVersion, listLoading, session, data, operations };
}
