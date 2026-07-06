import { useEffect, useRef, useState } from "react";
import { blurWorkspaceDetailEditor } from "@/hooks/blur-workspace-detail-editor";
import { useIsTouch } from "@/hooks/use-is-touch";
import { useSelectionResetOnKeyChange } from "@/hooks/use-selection-reset-on-key-change";
import { useWorkspaceListController } from "@/hooks/use-workspace-list-controller";
import type { Task } from "@/tasks-core/src/tasks-types";
import type { TasksShellState } from "@/tasks-core/src/use-tasks-shell";

const WRITE_QUEUE_DELAY_MS = 2500;

export type UseTasksListArgs = {
  shell: TasksShellState;
  initialTaskId?: string;
  onTaskChange?: (taskId: string) => void;
};

export function useTasksList({ shell, initialTaskId, onTaskChange }: UseTasksListArgs) {
  const { tasks, setTasks, view, workspaceLayoutRef, showMutationError, visibleTasks } = shell;

  const [activeId, setActiveId] = useState<string>(() => initialTaskId ?? "");
  const isTouch = useIsTouch();

  useEffect(() => {
    if (initialTaskId === undefined) return;
    setActiveId(initialTaskId);
  }, [initialTaskId]);

  useEffect(() => {
    if (!initialTaskId) return;
    workspaceLayoutRef.current?.openMobileDetail();
  }, [initialTaskId, workspaceLayoutRef]);

  const taskSyncedRef = useRef(false);
  useEffect(() => {
    if (!taskSyncedRef.current) {
      taskSyncedRef.current = true;
      return;
    }
    onTaskChange?.(activeId);
  }, [activeId, onTaskChange]);

  const {
    selectedIds,
    setSelectedIds,
    selectionMode,
    setSelectionMode,
    handleSelect,
    enterSelectionFor,
    exitSelection,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    queueMutation,
    undoLatest,
    navigateListByKeyboard,
  } = useWorkspaceListController<Task>({
    items: tasks,
    setItems: setTasks,
    visibleIds: visibleTasks.map((task) => task.id),
    activeId,
    setActiveId,
    onPrimarySelect: (id) => {
      blurWorkspaceDetailEditor();
      setActiveId(id);
      workspaceLayoutRef.current?.openMobileDetail();
    },
    onNavigateToId: () => {
      blurWorkspaceDetailEditor();
      workspaceLayoutRef.current?.openMobileDetail();
    },
    onMutationError: showMutationError,
    queueDelayMs: WRITE_QUEUE_DELAY_MS,
  });

  useSelectionResetOnKeyChange({
    resetKey: view,
    setSelectedIds,
    setSelectionMode,
  });

  const active = tasks.find((task) => task.id === activeId) ?? null;

  return {
    active,
    activeId,
    setActiveId,
    selectedIds,
    selectionMode,
    handleSelect,
    enterSelectionFor,
    exitSelection,
    isTouch,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    queueMutation,
    undoLatest,
    navigateListByKeyboard,
  };
}

export type TasksListState = ReturnType<typeof useTasksList>;
