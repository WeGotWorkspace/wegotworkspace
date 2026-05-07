import { useCallback, useMemo } from "react";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { useLiveBootstrap } from "@/lib/live/use-live-bootstrap";

type WorkspaceBootstrap<TData, TExtra extends object = object> = {
  data: TData;
  session: WorkspaceSession;
} & TExtra;

type UseWorkspaceApiArgs<TSource, TData, TOperations, TExtra extends object> = {
  source?: TSource;
  createDefaultSource: () => TSource;
  placeholderData: TData;
  loadBootstrap: (source: TSource) => Promise<WorkspaceBootstrap<TData, TExtra>>;
  createOperations: (
    source: TSource,
    bootstrap?: WorkspaceBootstrap<TData, TExtra>,
  ) => TOperations | undefined;
  fallbackSession: WorkspaceSession;
};

export function useWorkspaceApi<TSource, TData, TOperations, TExtra extends object = object>({
  source,
  createDefaultSource,
  placeholderData,
  loadBootstrap,
  createOperations,
  fallbackSession,
}: UseWorkspaceApiArgs<TSource, TData, TOperations, TExtra>) {
  const resolvedSource = useMemo(
    () => source ?? createDefaultSource(),
    [source, createDefaultSource],
  );
  const runBootstrap = useCallback(
    () => loadBootstrap(resolvedSource),
    [loadBootstrap, resolvedSource],
  );
  const { phase, error, data, load, successVersion } = useLiveBootstrap(runBootstrap);
  const operations = useMemo(
    () => createOperations(resolvedSource, data),
    [createOperations, resolvedSource, data],
  );

  return {
    phase,
    error,
    retry: load,
    successVersion,
    listLoading: phase === "loading",
    session: data?.session ?? fallbackSession,
    data: data?.data ?? placeholderData,
    operations,
    bootstrap: data,
    source: resolvedSource,
  };
}
