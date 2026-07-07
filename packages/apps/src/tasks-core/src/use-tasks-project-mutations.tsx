import { useCallback, useMemo, useState } from "react";
import { Tag } from "lucide-react";
import { isProtectedTaskList } from "@/tasks-core/src/tasks-task-utils";
import type { TasksShellState } from "@/tasks-core/src/use-tasks-shell";

export type ProjectRenameDialogState = null | { listId: string; name: string };

type UseTasksProjectMutationsArgs = {
  shell: TasksShellState;
};

export function useTasksProjectMutations({ shell }: UseTasksProjectMutationsArgs) {
  const {
    L,
    operations,
    taskLists,
    setTaskLists,
    selectedListId,
    selectView,
    show,
    showMutationError,
  } = shell;
  const [createProjectDialog, setCreateProjectDialog] = useState(false);
  const [projectRenameDialog, setProjectRenameDialog] = useState<ProjectRenameDialogState>(null);

  const canManageProjects = Boolean(operations?.createTaskList && operations.patchTaskList);

  const selectedList = useMemo(
    () => (selectedListId ? taskLists.find((list) => list.id === selectedListId) : undefined),
    [selectedListId, taskLists],
  );

  const canRenameProject = useMemo(() => {
    if (!canManageProjects || !selectedList) return false;
    return !isProtectedTaskList(selectedList);
  }, [canManageProjects, selectedList]);

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
        setCreateProjectDialog(false);
      } catch {
        showMutationError(L.toastProjectSaveFailed);
      }
    },
    [L, operations, selectView, setTaskLists, show, showMutationError],
  );

  const renameProject = useCallback(
    async (listId: string, name: string) => {
      if (!operations?.patchTaskList) return;
      const trimmed = name.trim();
      const list = taskLists.find((entry) => entry.id === listId);
      if (!trimmed || !list || trimmed === list.name || isProtectedTaskList(list)) return;

      try {
        const updated = await operations.patchTaskList(listId, { name: trimmed });
        setTaskLists((prev) => prev.map((entry) => (entry.id === listId ? updated : entry)));
        show(L.toastProjectRenamed(trimmed), { icon: <Tag className="size-4" /> });
        setProjectRenameDialog(null);
      } catch {
        showMutationError(L.toastProjectSaveFailed);
      }
    },
    [L, operations, setTaskLists, show, showMutationError, taskLists],
  );

  return {
    canManageProjects,
    canRenameProject,
    selectedList,
    createProjectDialog,
    setCreateProjectDialog,
    projectRenameDialog,
    setProjectRenameDialog,
    createProject,
    renameProject,
  };
}
