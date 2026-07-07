import { useCallback, useState } from "react";
import type { TaskList, TaskListPatch } from "@/tasks-core/src/tasks-types";
import { isProtectedTaskList } from "@/tasks-core/src/tasks-task-utils";
import type { TasksShellState } from "@/tasks-core/src/use-tasks-shell";

export type TaskProjectDialogState = null | { mode: "create" } | { mode: "edit"; list: TaskList };

type UseTasksProjectMutationsArgs = {
  shell: TasksShellState;
};

export function useTasksProjectMutations({ shell }: UseTasksProjectMutationsArgs) {
  const { L, operations, setTaskLists, selectView, show, showMutationError } = shell;
  const [projectDialog, setProjectDialog] = useState<TaskProjectDialogState>(null);

  const canManageProjects = Boolean(
    operations?.createTaskList && operations.patchTaskList && operations.deleteTaskList,
  );

  const createProject = useCallback(
    async (name: string, color?: string | null) => {
      if (!operations?.createTaskList) return;
      const trimmed = name.trim();
      if (!trimmed) return;

      try {
        const created = await operations.createTaskList({
          name: trimmed,
          ...(color?.trim() ? { color: color.trim() } : {}),
        });
        setTaskLists((prev) => [...prev, created]);
        selectView(`list:${created.id}`);
        show(L.toastProjectCreated);
        setProjectDialog(null);
      } catch {
        showMutationError(L.toastProjectSaveFailed);
      }
    },
    [L, operations, selectView, setTaskLists, show, showMutationError],
  );

  const updateProject = useCallback(
    async (listId: string, patch: TaskListPatch) => {
      if (!operations?.patchTaskList) return;

      try {
        const updated = await operations.patchTaskList(listId, patch);
        setTaskLists((prev) => prev.map((list) => (list.id === listId ? updated : list)));
        show(L.toastProjectUpdated);
        setProjectDialog(null);
      } catch {
        showMutationError(L.toastProjectSaveFailed);
      }
    },
    [L, operations, setTaskLists, show, showMutationError],
  );

  const deleteProject = useCallback(
    async (list: TaskList, removeContents = false) => {
      if (!operations?.deleteTaskList || isProtectedTaskList(list)) return;

      try {
        await operations.deleteTaskList(list.id, { onDestroyRemoveContents: removeContents });
        setTaskLists((prev) => prev.filter((entry) => entry.id !== list.id));
        show(L.toastProjectDeleted);
      } catch {
        showMutationError(L.toastProjectDeleteFailed);
      }
    },
    [L, operations, setTaskLists, show, showMutationError],
  );

  return {
    canManageProjects,
    projectDialog,
    setProjectDialog,
    createProject,
    updateProject,
    deleteProject,
  };
}
