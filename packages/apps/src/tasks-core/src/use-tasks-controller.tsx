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
  const mutations = useTasksMutations({ shell });

  const selectView = shell.selectView;

  return {
    L: shell.L,
    taskLists: shell.taskLists,
    tags: shell.tags,
    view: shell.view,
    viewLabel: shell.viewLabel,
    canCreateTask: shell.canCreateTask,
    searchQuery: shell.searchQuery,
    visibleTasks: shell.visibleTasks,
    sidebarOpen: shell.sidebarOpen,
    setSidebarOpen: shell.setSidebarOpen,
    listLoading: shell.listLoading,
    createListId: shell.createListId,
    isItemDragging: list.isItemDragging,
    itemDragHandlers: list.itemDragHandlers,
    sidebarDropZoneProps: list.sidebarDropZoneProps,
    confirmDialog: mutations.confirmDialog,
    selectView,
    setSearchQuery: shell.setSearchQuery,
    createTaskFromForm: mutations.createTaskFromForm,
    toggleTaskComplete: mutations.toggleTaskComplete,
    editTask: mutations.editTask,
    requestDeleteTask: mutations.requestDeleteTask,
    moveToList: mutations.moveToList,
    assignTagToTasks: mutations.assignTagToTasks,
  };
}

export type TasksControllerState = ReturnType<typeof useTasksController>;
