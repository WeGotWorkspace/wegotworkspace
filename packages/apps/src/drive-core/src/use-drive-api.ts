import { useCallback, useMemo } from "react";
import { useWorkspaceApi } from "@/hooks/use-workspace-api";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import {
  createDefaultDriveApiSource,
  type DriveApiSource,
} from "@/drive-core/src/drive-api-source";
import type { DriveUIData } from "@/drive-core/src/drive-types";

export function useDriveAPI(source?: DriveApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultDriveApiSource(), [source]);
  const placeholderData = useMemo<DriveUIData>(
    () => ({
      user: {
        username: "",
        name: "",
        role: "user",
        roots: ["/users"],
      },
      cwd: "/",
      directory: {
        location: "/",
        files: [],
      },
    }),
    [],
  );
  const loadBootstrapFromSource = useCallback(
    (apiSource: DriveApiSource) => apiSource.loadBootstrap(),
    [],
  );
  const createOperationsFromSource = useCallback(
    (apiSource: DriveApiSource, bootstrap?: Awaited<ReturnType<DriveApiSource["loadBootstrap"]>>) =>
      apiSource.createOperations(bootstrap),
    [],
  );

  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useWorkspaceApi({
      source: resolvedSource,
      createDefaultSource: createDefaultDriveApiSource,
      placeholderData,
      loadBootstrap: loadBootstrapFromSource,
      createOperations: createOperationsFromSource,
      fallbackSession: mockWorkspaceSession,
    });

  return { phase, error, retry, successVersion, listLoading, session, data, operations };
}
