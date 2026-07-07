import { useSidebarListDrag } from "@/hooks/use-sidebar-list-drag";
import type { TasksShellState } from "@/tasks-core/src/use-tasks-shell";

export type UseTasksListArgs = {
  shell: TasksShellState;
};

export function useTasksList(_args: UseTasksListArgs) {
  const { isItemDragging, itemDragHandlers, sidebarDropZoneProps } = useSidebarListDrag([]);

  return {
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
  };
}

export type TasksListState = ReturnType<typeof useTasksList>;
