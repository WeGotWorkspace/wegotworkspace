import { useCallback, useState } from "react";

export function useTasksExitAnimation() {
  const [exitingTaskIds, setExitingTaskIds] = useState(() => new Set<string>());
  const [hiddenTaskIds, setHiddenTaskIds] = useState(() => new Set<string>());

  const beginTaskExit = useCallback((taskId: string) => {
    setExitingTaskIds((prev) => new Set(prev).add(taskId));
  }, []);

  const finishTaskExit = useCallback((taskId: string, hideAfterExit: boolean) => {
    setExitingTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    if (hideAfterExit) {
      setHiddenTaskIds((prev) => new Set(prev).add(taskId));
    }
  }, []);

  const cancelTaskExit = useCallback((taskId: string) => {
    setExitingTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
    setHiddenTaskIds((prev) => {
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  const clearHiddenTasks = useCallback(() => {
    setHiddenTaskIds(new Set());
  }, []);

  return {
    exitingTaskIds,
    hiddenTaskIds,
    beginTaskExit,
    finishTaskExit,
    cancelTaskExit,
    clearHiddenTasks,
  };
}

export type TasksExitAnimationState = ReturnType<typeof useTasksExitAnimation>;
