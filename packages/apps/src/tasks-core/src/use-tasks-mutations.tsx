import { useCallback } from "react";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import type { Task, TaskPatch } from "@/tasks-core/src/tasks-types";
import { isTaskCompleted, normalizeTag } from "@/tasks-core/src/tasks-task-utils";
import type { TasksCreateInput } from "@/tasks-core/src/tasks-main-view";
import type { TasksShellState } from "@/tasks-core/src/use-tasks-shell";

type UseTasksMutationsArgs = {
  shell: TasksShellState;
};

export function useTasksMutations({ shell }: UseTasksMutationsArgs) {
  const { L, tasks, setTasks, operations, showMutationError, queueSaveToast } = shell;

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

  const createTaskFromForm = useCallback(
    async ({ title, description, listId, tag }: TasksCreateInput) => {
      if (!operations || !title.trim()) return;
      const normalizedTag = normalizeTag(tag);
      const created = await operations.createTask({
        title: title.trim(),
        description: description.trim() || null,
        taskListIds: { [listId]: true },
        ...(normalizedTag ? { categories: [normalizedTag] } : {}),
      });
      setTasks((prev) => [created, ...prev]);
      queueSaveToast();
    },
    [operations, queueSaveToast, setTasks],
  );

  const toggleTaskComplete = useCallback(
    (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task || !operations) return;
      const nextStatus = isTaskCompleted(task) ? "needs-action" : "completed";
      setTasks((prev) =>
        prev.map((item) => (item.id === taskId ? { ...item, workflowStatus: nextStatus } : item)),
      );
      void patchTask(taskId, { workflowStatus: nextStatus }).catch(() => showMutationError());
    },
    [operations, patchTask, setTasks, showMutationError, tasks],
  );

  const editTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      const next = window.prompt(L.editTaskPrompt, task?.title ?? "");
      if (!next?.trim()) return;
      setTasks((prev) =>
        prev.map((item) => (item.id === taskId ? { ...item, title: next.trim() } : item)),
      );
      void patchTask(taskId, { title: next.trim() }).catch(() => showMutationError());
    },
    [L.editTaskPrompt, patchTask, setTasks, showMutationError, tasks],
  );

  const deleteTasks = useCallback(
    async (ids: string[]) => {
      if (!operations) return;
      for (const taskId of ids) {
        await operations.deleteTask(taskId);
      }
      setTasks((prev) => prev.filter((task) => !ids.includes(task.id)));
      queueSaveToast();
    },
    [operations, queueSaveToast, setTasks],
  );

  const requestDeleteTask = useCallback(
    (taskId: string) => {
      requestConfirm({
        title: L.deleteConfirmTitle,
        description: L.deleteConfirmBody,
        confirmLabel: L.delete,
        cancelLabel: L.cancel,
        variant: "destructive",
        onConfirm: () => {
          void deleteTasks([taskId]).catch(() => showMutationError());
        },
      });
    },
    [
      L.cancel,
      L.delete,
      L.deleteConfirmBody,
      L.deleteConfirmTitle,
      deleteTasks,
      requestConfirm,
      showMutationError,
    ],
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

  return {
    createTaskFromForm,
    toggleTaskComplete,
    editTask,
    requestDeleteTask,
    moveToList,
    assignTagToTasks,
    confirmDialog,
  };
}

export type TasksMutationsState = ReturnType<typeof useTasksMutations>;
