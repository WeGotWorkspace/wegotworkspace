import { useCallback, useMemo, useState } from "react";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { useHybridBootstrap } from "@/lib/live/use-hybrid-bootstrap";
import type { TasksUIData } from "@/tasks-core/src/tasks-types";
import {
  createDefaultTasksApiSource,
  type TasksApiSource,
} from "@/tasks-core/src/tasks-api-source";

export function useTasksAPI(source?: TasksApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultTasksApiSource(), [source]);
  const placeholderData = useMemo<TasksUIData>(
    () => ({
      taskLists: [],
      tasks: [],
    }),
    [],
  );

  const runBootstrap = useCallback(() => resolvedSource.loadBootstrap(), [resolvedSource]);
  const readCache = useCallback(async () => null, []);

  const { phase, error, data, load, successVersion, patchBootstrap } = useHybridBootstrap({
    load: runBootstrap,
    readCache,
  });

  const [listRefreshing, setListRefreshing] = useState(false);
  const [bootstrapRevision, setBootstrapRevision] = useState(0);

  const operations = useMemo(
    () => resolvedSource.createOperations(data ?? undefined),
    [resolvedSource, data],
  );

  const refreshList = useCallback(() => {
    if (listRefreshing) return;
    setListRefreshing(true);
    void resolvedSource
      .loadBootstrap()
      .then((next) => {
        patchBootstrap(() => next);
        setBootstrapRevision((revision) => revision + 1);
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
    bootstrapRevision,
    listLoading: phase === "loading" || listRefreshing,
    refreshList,
    session: data?.session ?? mockWorkspaceSession,
    data: data?.data ?? placeholderData,
    operations,
  };
}
