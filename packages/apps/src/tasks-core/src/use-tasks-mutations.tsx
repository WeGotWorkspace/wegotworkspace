import { useCallback } from "react";
import { Check, CheckCircle2, Circle, Plus, Tag, Trash2 } from "lucide-react";
import { useConfirmDialog } from "@/hooks/use-confirm-dialog";
import type { Task, TaskPatch } from "@/tasks-core/src/tasks-types";
import {
  isTaskCompleted,
  normalizeTag,
  shouldHideCompletedTaskAfterExit,
  taskListName,
} from "@/tasks-core/src/tasks-task-utils";
import {
  tasksCompleteToastMessage,
  tasksMoveToastMessage,
  tasksTagToastMessage,
} from "@/tasks-core/src/tasks-toast-messages";
import type { TasksCreateInput } from "@/tasks-core/src/tasks-main-view";
import type { TasksShellState } from "@/tasks-core/src/use-tasks-shell";
import type { TasksExitAnimationState } from "@/tasks-core/src/use-tasks-exit-animation";
import type { TasksListState } from "@/tasks-core/src/use-tasks-list";

type UseTasksMutationsArgs = {
  shell: TasksShellState;
  list: TasksListState;
  exitAnimation: TasksExitAnimationState;
};

export function useTasksMutations({ shell, list, exitAnimation }: UseTasksMutationsArgs) {
  const { L, tasks, setTasks, taskLists, operations, showMutationError, view } = shell;
  const { queueMutation } = list;
  const { beginTaskExit, cancelTaskExit } = exitAnimation;

  const { confirmDialog, requestConfirm } = useConfirmDialog();

  const patchTask = useCallback(
    async (taskId: string, patch: TaskPatch, opts?: { signal?: AbortSignal }) => {
      if (!operations) return undefined;
      const existing = tasks.find((task) => task.id === taskId);
      const etag = (existing as Task & { etag?: string })?.etag;
      const updated = await operations.patchTask(taskId, patch, {
        ifMatch: etag,
        signal: opts?.signal,
      });
      setTasks((prev) => prev.map((task) => (task.id === taskId ? updated : task)));
      return updated;
    },
    [operations, setTasks, tasks],
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
      setTasks((prev) => [...prev, created]);
      shell.show(L.toastTaskAdded, { icon: <Plus className="size-4" /> });
    },
    [L.toastTaskAdded, operations, setTasks, shell],
  );

  const toggleTaskComplete = useCallback(
    (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task || !operations) return;

      const beforeStatus = task.workflowStatus ?? "needs-action";
      const completing = !isTaskCompleted(task);
      const nextStatus = completing ? "completed" : "needs-action";
      const toastMessage = tasksCompleteToastMessage(completing, L);

      if (completing) {
        beginTaskExit(taskId);
      } else {
        cancelTaskExit(taskId);
      }

      setTasks((prev) =>
        prev.map((item) => (item.id === taskId ? { ...item, workflowStatus: nextStatus } : item)),
      );

      const rollback = () => {
        cancelTaskExit(taskId);
        setTasks((prev) =>
          prev.map((item) =>
            item.id === taskId ? { ...item, workflowStatus: beforeStatus } : item,
          ),
        );
      };

      queueMutation({
        key: `tasks:complete:${taskId}`,
        toastMessage,
        icon: completing ? <CheckCircle2 className="size-4" /> : <Circle className="size-4" />,
        execute: async (signal) => {
          await patchTask(taskId, { workflowStatus: nextStatus }, { signal });
        },
        undo: rollback,
        onError: rollback,
        undoToastMessage: L.toastCompleteUndone,
        executeImmediately: true,
      });
    },
    [L, beginTaskExit, cancelTaskExit, operations, patchTask, queueMutation, setTasks, tasks],
  );

  const editTask = useCallback(
    (taskId: string) => {
      const task = tasks.find((item) => item.id === taskId);
      const next = window.prompt(L.editTaskPrompt, task?.title ?? "");
      if (!next?.trim()) return;
      const trimmed = next.trim();
      const beforeTitle = task?.title ?? "";
      setTasks((prev) =>
        prev.map((item) => (item.id === taskId ? { ...item, title: trimmed } : item)),
      );
      shell.show(L.toastTaskUpdated, { icon: <Check className="size-4" /> });
      void patchTask(taskId, { title: trimmed }).catch(() => {
        setTasks((prev) =>
          prev.map((item) => (item.id === taskId ? { ...item, title: beforeTitle } : item)),
        );
        showMutationError();
      });
    },
    [L.editTaskPrompt, L.toastTaskUpdated, patchTask, setTasks, shell, showMutationError, tasks],
  );

  const deleteTasks = useCallback(
    (ids: string[]) => {
      if (!operations || ids.length === 0) return;
      const removed = tasks.filter((task) => ids.includes(task.id));
      if (removed.length === 0) return;

      setTasks((prev) => prev.filter((task) => !ids.includes(task.id)));
      for (const taskId of ids) {
        cancelTaskExit(taskId);
      }

      const rollback = () => {
        setTasks((prev) => {
          const merged = new Map(prev.map((task) => [task.id, task] as const));
          for (const task of removed) merged.set(task.id, task);
          return Array.from(merged.values());
        });
      };

      queueMutation({
        key: `tasks:delete:${ids.slice().sort().join(",")}`,
        toastMessage: L.toastDeleted,
        icon: <Trash2 className="size-4" />,
        execute: async (signal) => {
          for (const taskId of ids) {
            await operations.deleteTask(taskId, { signal });
          }
        },
        undo: rollback,
        onError: rollback,
        undoToastMessage: L.toastDeleteUndone,
      });
    },
    [
      L.toastDeleteUndone,
      L.toastDeleted,
      cancelTaskExit,
      operations,
      queueMutation,
      setTasks,
      tasks,
    ],
  );

  const requestDeleteTask = useCallback(
    (taskId: string) => {
      requestConfirm({
        title: L.deleteConfirmTitle,
        description: L.deleteConfirmBody,
        confirmLabel: L.delete,
        cancelLabel: L.cancel,
        variant: "destructive",
        onConfirm: () => deleteTasks([taskId]),
      });
    },
    [L.cancel, L.delete, L.deleteConfirmBody, L.deleteConfirmTitle, deleteTasks, requestConfirm],
  );

  const moveToList = useCallback(
    (ids: string[], listId: string) => {
      if (!operations) return;
      const listName = taskListName(listId, taskLists);
      const before = tasks.filter((task) => ids.includes(task.id));
      if (before.length === 0) return;

      for (const taskId of ids) {
        setTasks((prev) =>
          prev.map((task) => (task.id === taskId ? { ...task, taskListId: listId } : task)),
        );
      }

      const toastMessage = tasksMoveToastMessage(before.length, listName, L);
      const rollback = () => {
        setTasks((prev) => {
          const snapshot = new Map(before.map((task) => [task.id, task.taskListId] as const));
          return prev.map((task) =>
            snapshot.has(task.id) ? { ...task, taskListId: snapshot.get(task.id)! } : task,
          );
        });
      };

      queueMutation({
        key: `tasks:move:${listId}:${ids.slice().sort().join(",")}`,
        toastMessage,
        execute: async (signal) => {
          for (const taskId of ids) {
            await operations.moveTaskToList(taskId, listId, { signal });
          }
        },
        undo: rollback,
        onError: rollback,
        undoToastMessage: L.toastMoveUndone,
      });
    },
    [L, operations, queueMutation, setTasks, taskLists, tasks],
  );

  const assignTagToTasks = useCallback(
    (ids: string[], tag: string) => {
      const normalized = normalizeTag(tag);
      if (!normalized) return;
      const before = tasks.filter((task) => ids.includes(task.id));
      if (before.length === 0) return;

      for (const taskId of ids) {
        const task = tasks.find((item) => item.id === taskId);
        if (!task) continue;
        const categories = [...new Set([...(task.categories ?? []), normalized])];
        setTasks((prev) =>
          prev.map((item) => (item.id === taskId ? { ...item, categories } : item)),
        );
      }

      const toastMessage = tasksTagToastMessage(before.length, normalized, L);
      const rollback = () => {
        setTasks((prev) => {
          const snapshot = new Map(before.map((task) => [task.id, task.categories ?? []] as const));
          return prev.map((task) =>
            snapshot.has(task.id) ? { ...task, categories: snapshot.get(task.id)! } : task,
          );
        });
      };

      queueMutation({
        key: `tasks:tag:${normalized}:${ids.slice().sort().join(",")}`,
        toastMessage,
        icon: <Tag className="size-4" />,
        execute: async (signal) => {
          for (const task of before) {
            const categories = [...new Set([...(task.categories ?? []), normalized])];
            await patchTask(task.id, { categories }, { signal });
          }
        },
        undo: rollback,
        onError: rollback,
        undoToastMessage: L.toastTagUndone,
      });
    },
    [L, patchTask, queueMutation, setTasks, tasks],
  );

  const handleTaskExitAnimationEnd = useCallback(
    (taskId: string) => {
      exitAnimation.finishTaskExit(taskId, shouldHideCompletedTaskAfterExit(view));
    },
    [exitAnimation, view],
  );

  return {
    createTaskFromForm,
    toggleTaskComplete,
    editTask,
    requestDeleteTask,
    moveToList,
    assignTagToTasks,
    confirmDialog,
    handleTaskExitAnimationEnd,
  };
}

export type TasksMutationsState = ReturnType<typeof useTasksMutations>;
