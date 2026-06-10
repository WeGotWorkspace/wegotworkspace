import { useCallback, useMemo } from "react";
import { useWorkspaceApi } from "@/hooks/use-workspace-api";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import {
  createDefaultInstallApiSource,
  type InstallApiSource,
} from "@/install-core/src/install-api-source";
import type { InstallUIData } from "@/install-core/src/install-types";

export function useInstallAPI(source?: InstallApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultInstallApiSource(), [source]);
  const placeholderData = useMemo<InstallUIData>(() => ({ state: null }), []);
  const loadBootstrapFromSource = useCallback(
    (apiSource: InstallApiSource) => apiSource.loadBootstrap(),
    [],
  );
  const createOperationsFromSource = useCallback(
    (apiSource: InstallApiSource, bootstrap: Parameters<InstallApiSource["createOperations"]>[1]) =>
      apiSource.createOperations(apiSource, bootstrap),
    [],
  );

  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useWorkspaceApi({
      source: resolvedSource,
      createDefaultSource: createDefaultInstallApiSource,
      placeholderData,
      loadBootstrap: loadBootstrapFromSource,
      createOperations: createOperationsFromSource,
      fallbackSession: mockWorkspaceSession,
    });

  return { phase, error, retry, successVersion, listLoading, session, data, operations };
}
