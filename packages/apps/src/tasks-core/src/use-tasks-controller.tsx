import { useCallback, useEffect, useMemo, useRef } from "react";
import { useWorkspaceListKeyboardShortcuts } from "@/hooks/use-workspace-list-keyboard-shortcuts";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import type { TasksAPIOperations, TasksUIData } from "@/tasks-core/src/tasks-types";
import { buildDisplayTasks } from "@/tasks-core/src/tasks-task-utils";
import { useTasksExitAnimation } from "@/tasks-core/src/use-tasks-exit-animation";
import { useTasksList } from "@/tasks-core/src/use-tasks-list";
import { useTasksMutations } from "@/tasks-core/src/use-tasks-mutations";
import { useTasksShell } from "@/tasks-core/src/use-tasks-shell";

type UseTasksControllerArgs = {
  data: TasksUIData;
  labels?: Partial<TasksUILabels>;
  listLoading?: boolean;
  operations?: TasksAPIOperations;
  bootstrapRevision?: number;
  initialView?: string;
  onViewChange?: (view: string) => void;
};

export function useTasksController({
  data,
  labels,
  listLoading = false,
  operations,
  bootstrapRevision = 0,
  initialView,
  onViewChange,
}: UseTasksControllerArgs) {
  const shell = useTasksShell({
    data,
    labels,
    listLoading,
    operations,
    bootstrapRevision,
    initialView,
    onViewChange,
  });
  const list = useTasksList({ shell });
  const exitAnimation = useTasksExitAnimation();
  const mutations = useTasksMutations({ shell, list, exitAnimation });
  const { clearHiddenTasks } = exitAnimation;

  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useWorkspaceListKeyboardShortcuts({
    searchInputRef,
    selectedCount: 0,
    onRequestDeleteSelection: () => {},
    onUndoQueuedAction: list.undoLatest,
    listNavigationEnabled: false,
  });

  useEffect(() => {
    clearHiddenTasks();
  }, [clearHiddenTasks, shell.view]);

  const displayTasks = useMemo(
    () =>
      buildDisplayTasks(
        shell.tasks,
        shell.visibleTasks,
        exitAnimation.exitingTaskIds,
        exitAnimation.hiddenTaskIds,
      ),
    [exitAnimation.exitingTaskIds, exitAnimation.hiddenTaskIds, shell.tasks, shell.visibleTasks],
  );

  const selectView = useCallback(
    (nextView: string) => {
      shell.selectView(nextView);
    },
    [shell],
  );

  return {
    L: shell.L,
    taskLists: shell.taskLists,
    tags: shell.tags,
    view: shell.view,
    viewLabel: shell.viewLabel,
    canCreateTask: shell.canCreateTask,
    visibleTasks: shell.visibleTasks,
    displayTasks,
    sidebarOpen: shell.sidebarOpen,
    setSidebarOpen: shell.setSidebarOpen,
    listLoading: shell.listLoading,
    createListId: shell.createListId,
    exitingTaskIds: exitAnimation.exitingTaskIds,
    isItemDragging: list.isItemDragging,
    itemDragHandlers: list.itemDragHandlers,
    sidebarDropZoneProps: list.sidebarDropZoneProps,
    confirmDialog: mutations.confirmDialog,
    selectView,
    createTaskFromForm: mutations.createTaskFromForm,
    toggleTaskComplete: mutations.toggleTaskComplete,
    editTask: mutations.editTask,
    requestDeleteTask: mutations.requestDeleteTask,
    moveToList: mutations.moveToList,
    assignTagToTasks: mutations.assignTagToTasks,
    handleTaskExitAnimationEnd: mutations.handleTaskExitAnimationEnd,
  };
}

export type TasksControllerState = ReturnType<typeof useTasksController>;
