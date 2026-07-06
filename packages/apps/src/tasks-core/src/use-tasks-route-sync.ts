import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import {
  tasksNavigateTarget,
  tasksTaskFromParams,
  tasksViewFromLocation,
  type TasksRouteParams,
} from "@/tasks-core/src/tasks-route-search";

/** Sync tasks workspace view/selection with path-based `/tasks/...` routes. */
export function useTasksRouteSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams({ strict: false }) as TasksRouteParams;

  const initialView = useMemo(
    () => tasksViewFromLocation(location.pathname, params),
    [location.pathname, params],
  );
  const initialTaskId = useMemo(() => tasksTaskFromParams(params), [params]);

  const currentViewRef = useRef<string>(initialView);
  const currentTaskRef = useRef<string>(initialTaskId);

  useEffect(() => {
    currentViewRef.current = initialView;
  }, [initialView]);

  useEffect(() => {
    currentTaskRef.current = initialTaskId;
  }, [initialTaskId]);

  const handleViewChange = useCallback(
    (view: string) => {
      currentViewRef.current = view;
      currentTaskRef.current = "";
      const target = tasksNavigateTarget(view);
      void navigate({ ...target, replace: true });
    },
    [navigate],
  );

  const handleTaskChange = useCallback(
    (taskId: string) => {
      currentTaskRef.current = taskId;
      const view = currentViewRef.current;
      const target = tasksNavigateTarget(view, taskId);
      void navigate({ ...target, replace: true });
    },
    [navigate],
  );

  return {
    initialView,
    initialTaskId,
    handleViewChange,
    handleTaskChange,
  };
}
