import { useQueuedMutation } from "@/hooks/use-queued-mutation";
import { useSidebarListDrag } from "@/hooks/use-sidebar-list-drag";
import type { TasksShellState } from "@/tasks-core/src/use-tasks-shell";

export type UseTasksListArgs = {
  shell: TasksShellState;
};

export function useTasksList({ shell }: UseTasksListArgs) {
  const { showMutationError } = shell;
  const { queueMutation, undoLatest } = useQueuedMutation({
    onMutationError: showMutationError,
  });
  const { isItemDragging, itemDragHandlers, sidebarDropZoneProps } = useSidebarListDrag([]);

  return {
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    queueMutation,
    undoLatest,
  };
}

export type TasksListState = ReturnType<typeof useTasksList>;
