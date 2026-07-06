import { useCallback } from "react";
import { useWorkspaceListKeyboardShortcuts } from "@/hooks/use-workspace-list-keyboard-shortcuts";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import type { TasksAPIOperations, TasksUIData } from "@/tasks-core/src/tasks-types";
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
  initialTaskId?: string;
  onViewChange?: (view: string) => void;
  onTaskChange?: (taskId: string) => void;
};

export function useTasksController({
  data,
  labels,
  listLoading = false,
  operations,
  bootstrapRevision = 0,
  initialView,
  initialTaskId,
  onViewChange,
  onTaskChange,
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
  const list = useTasksList({ shell, initialTaskId, onTaskChange });

  const selectView = useCallback(
    (nextView: string) => {
      list.setActiveId("");
      shell.selectView(nextView);
    },
    [list, shell],
  );

  const mutations = useTasksMutations({ shell, list });

  useWorkspaceListKeyboardShortcuts({
    searchInputRef: shell.searchInputRef,
    selectedCount: list.selectedIds.length,
    selectionMode: list.selectionMode,
    onRequestDeleteSelection: mutations.requestDeleteSelected,
    onNavigateList: list.navigateListByKeyboard,
    onUndoQueuedAction: list.undoLatest,
  });

  return {
    L: shell.L,
    tasks: shell.tasks,
    taskLists: shell.taskLists,
    tags: shell.tags,
    active: list.active,
    activeId: list.activeId,
    view: shell.view,
    viewLabel: shell.viewLabel,
    selectedIds: list.selectedIds,
    selectionMode: list.selectionMode,
    canCreateTask: shell.canCreateTask,
    selectedListId: shell.selectedListId,
    selectedTag: shell.selectedTag,
    showKanbanToggle: shell.showKanbanToggle,
    kanbanMode: shell.kanbanMode,
    setKanbanMode: shell.setKanbanMode,
    searchQuery: shell.searchQuery,
    searchInputRef: shell.searchInputRef,
    visibleTasks: shell.visibleTasks,
    workspaceLayoutRef: shell.workspaceLayoutRef,
    isTouch: list.isTouch,
    listLoading: shell.listLoading,
    isItemDragging: list.isItemDragging,
    itemDragHandlers: list.itemDragHandlers,
    sidebarDropZoneProps: list.sidebarDropZoneProps,
    selectionBar: mutations.selectionBar,
    selectionBarButtons: mutations.selectionBarButtons,
    confirmDialog: mutations.confirmDialog,
    handleSelect: list.handleSelect,
    enterSelectionFor: list.enterSelectionFor,
    selectView,
    setSearchQuery: shell.setSearchQuery,
    createTask: mutations.createTask,
    updateActiveTask: mutations.updateActiveTask,
    moveToList: mutations.moveToList,
    assignTagToTasks: mutations.assignTagToTasks,
    toggleTaskTag: mutations.toggleTaskTag,
    setAlerts: mutations.setAlerts,
    openDeleteConfirm: mutations.openDeleteConfirm,
    requestDeleteSelected: mutations.requestDeleteSelected,
    dragToKanbanColumn: mutations.dragToKanbanColumn,
  };
}

export type TasksControllerState = ReturnType<typeof useTasksController>;
