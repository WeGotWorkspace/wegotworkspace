import { useCallback, useEffect, useMemo, useRef } from "react";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import {
  tasksNavigateTarget,
  tasksViewFromLocation,
  type TasksRouteParams,
} from "@/tasks-core/src/tasks-route-search";

/** Sync tasks workspace view with path-based `/tasks/...` routes. */
export function useTasksRouteSync() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams({ strict: false }) as TasksRouteParams;

  const initialView = useMemo(
    () => tasksViewFromLocation(location.pathname, params),
    [location.pathname, params],
  );

  const currentViewRef = useRef<string>(initialView);

  useEffect(() => {
    currentViewRef.current = initialView;
  }, [initialView]);

  const handleViewChange = useCallback(
    (view: string) => {
      const routeView = tasksViewFromLocation(location.pathname, params);
      if (view === routeView) {
        currentViewRef.current = view;
        return;
      }
      currentViewRef.current = view;
      const target = tasksNavigateTarget(view);
      void navigate({ ...target, replace: true });
    },
    [location.pathname, navigate, params],
  );

  return {
    initialView,
    handleViewChange,
  };
}
