import { useCallback, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import { useWorkspaceSelectionPresentation } from "@/hooks/use-workspace-list-controller";
import type { Task, TaskPatch } from "@/tasks-core/src/tasks-types";
import { normalizeTag } from "@/tasks-core/src/tasks-task-utils";
import type { TasksShellState } from "@/tasks-core/src/use-tasks-shell";
import type { TasksListState } from "@/tasks-core/src/use-tasks-list";

type UseTasksMutationsArgs = {
  shell: TasksShellState;
  list: TasksListState;
};

function mergeTaskPatch(task: Task, patch: TaskPatch): Task {
  return {
    ...task,
    ...patch,
    categories: patch.categories ?? task.categories,
    alerts: patch.alerts ?? task.alerts,
  };
}

export function useTasksMutations({ shell, list }: UseTasksMutationsArgs) {
  const { L, tasks, setTasks, operations, createListId, showMutationError, queueSaveToast } = shell;
  const { active, activeId, setActiveId, selectedIds, exitSelection } = list;

  const { confirmDialog, requestConfirm } = useConfirmDialog();

  const patchTask = useCallback(
    async (taskId: string, patch: TaskPatch) => {
      if (!operations) return;
      const existing = tasks.find((task) => task.id === taskId);
      const etag = (existing as Task & { etag?: string })?.etag;
      const updated = await operations.patchTask(taskId, patch, { ifMatch: etag });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
      queueSaveToast();
    },
    [operations, queueSaveToast, setTasks, tasks],
  );

  const createTask = useCallback(async () => {
    if (!operations) return;
    const created = await operations.createTask({
      title: L.createTaskTitle,
      taskListIds: { [createListId]: true },
    });
    setTasks((prev) => [created, ...prev]);
    setActiveId(created.id);
    queueSaveToast();
  }, [L.createTaskTitle, createListId, operations, queueSaveToast, setActiveId, setTasks]);

  const updateActiveTask = useCallback(
    (patch: TaskPatch) => {
      if (!activeId || !operations) return;
      const taskId = activeId;
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? mergeTaskPatch(task, patch) : task)),
      );
      void patchTask(taskId, patch).catch(() => showMutationError());
    },
    [activeId, operations, patchTask, setTasks, showMutationError],
  );

  const moveToList = useCallback(
    (ids: string[], listId: string) => {
      if (!operations) return;
      for (const taskId of ids) {
        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? { ...task, taskListId: listId } : task)),
        );
        void operations.moveTaskToList(taskId, listId).catch(() => showMutationError());
      }
      queueSaveToast();
    },
    [operations, queueSaveToast, setTasks, showMutationError],
  );

  const assignTagToTasks = useCallback(
    (ids: string[], tag: string) => {
      const normalized = normalizeTag(tag);
      if (!normalized) return;
      for (const taskId of ids) {
        const task = tasks.find((item) => item.id === taskId);
        if (!task) continue;
        const categories = [...new Set([...(task.categories ?? []), normalized])];
        setTasks((prev) =>
          prev.map((item) => (item.id === taskId ? { ...item, categories } : item)),
        );
        void patchTask(taskId, { categories }).catch(() => showMutationError());
      }
      queueSaveToast();
    },
    [patchTask, queueSaveToast, setTasks, showMutationError, tasks],
  );

  const toggleTaskTag = useCallback(
    (tag: string) => {
      if (!active) return;
      const normalized = normalizeTag(tag);
      const has = (active.categories ?? []).some((item) => normalizeTag(item) === normalized);
      const categories = has
        ? (active.categories ?? []).filter((item) => normalizeTag(item) !== normalized)
        : [...(active.categories ?? []), normalized];
      updateActiveTask({ categories });
    },
    [active, updateActiveTask],
  );

  const setAlerts = useCallback(
    (alerts: Task["alerts"] | undefined) => {
      updateActiveTask({ alerts });
    },
    [updateActiveTask],
  );

  const deleteTasks = useCallback(
    async (ids: string[]) => {
      if (!operations) return;
      for (const taskId of ids) {
        await operations.deleteTask(taskId);
      }
      setTasks((prev) => prev.filter((task) => !ids.includes(task.id)));
      if (ids.includes(activeId)) {
        setActiveId("");
      }
      queueSaveToast();
    },
    [activeId, operations, queueSaveToast, setActiveId, setTasks],
  );

  const openDeleteConfirm = useCallback(() => {
    const ids = activeId ? [activeId] : [];
    if (ids.length === 0) return;
    requestConfirm({
      title: L.deleteConfirmTitle,
      description: L.deleteConfirmBody,
      confirmLabel: L.delete,
      cancelLabel: L.cancel,
      variant: "destructive",
      onConfirm: () => {
        void deleteTasks(ids).catch(() => showMutationError());
      },
    });
  }, [
    L.cancel,
    L.delete,
    L.deleteConfirmBody,
    L.deleteConfirmTitle,
    activeId,
    deleteTasks,
    requestConfirm,
    showMutationError,
  ]);

  const requestDeleteSelected = useCallback(() => {
    const ids = selectedIds.length > 0 ? selectedIds : activeId ? [activeId] : [];
    if (ids.length === 0) return;
    requestConfirm({
      title: L.deleteConfirmTitle,
      description: L.deleteConfirmBody,
      confirmLabel: L.delete,
      cancelLabel: L.cancel,
      variant: "destructive",
      onConfirm: () => {
        void deleteTasks(ids).catch(() => showMutationError());
      },
    });
  }, [
    L.cancel,
    L.delete,
    L.deleteConfirmBody,
    L.deleteConfirmTitle,
    activeId,
    deleteTasks,
    requestConfirm,
    selectedIds,
    showMutationError,
  ]);

  const selectionActionButtons = useMemo(
    () => [
      {
        label: L.delete,
        icon: <Trash2 className="size-4" />,
        onClick: requestDeleteSelected,
      },
    ],
    [L.delete, requestDeleteSelected],
  );

  const { selectionBarButtons, selectionBar } = useWorkspaceSelectionPresentation({
    selectedIds,
    selectionMode: list.selectionMode,
    activeId,
    exitSelection,
    actionButtons: selectionActionButtons,
    doneLabel: L.cancel,
  });

  const dragToKanbanColumn = useCallback(
    (taskId: string, status: string) => {
      setTasks((prev) =>
        prev.map((task) => (task.id === taskId ? { ...task, workflowStatus: status } : task)),
      );
      void patchTask(taskId, { workflowStatus: status }).catch(() => showMutationError());
    },
    [patchTask, setTasks, showMutationError],
  );

  return {
    createTask,
    updateActiveTask,
    moveToList,
    assignTagToTasks,
    toggleTaskTag,
    setAlerts,
    openDeleteConfirm,
    requestDeleteSelected,
    confirmDialog,
    selectionBar,
    selectionBarButtons,
    dragToKanbanColumn,
    patchTask,
  };
}

export type TasksMutationsState = ReturnType<typeof useTasksMutations>;
