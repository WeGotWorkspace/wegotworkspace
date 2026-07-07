import { useCallback, useMemo, useState } from "react";
import { Tag } from "lucide-react";
import type { TaskProjectDialogConfirmInput } from "@/tasks-core/src/task-project-dialog";
import type { TaskProjectDialogState } from "@/tasks-core/src/task-project-dialog";
import { isProtectedTaskList } from "@/tasks-core/src/tasks-task-utils";
import type { TasksShellState } from "@/tasks-core/src/use-tasks-shell";

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
  const [projectDialog, setProjectDialog] = useState<TaskProjectDialogState>(null);

  const canManageProjects = Boolean(operations?.createTaskList && operations?.patchTaskList);

  const selectedList = useMemo(
    () => (selectedListId ? taskLists.find((list) => list.id === selectedListId) : undefined),
    [selectedListId, taskLists],
  );

  const canRenameProject = useMemo(() => {
    if (!canManageProjects || !selectedList) return false;
    if (isProtectedTaskList(selectedList) || selectedList.role === "group") return false;
    return true;
  }, [canManageProjects, selectedList]);

  const createProject = useCallback(
    async ({ name, color, groupSlug }: TaskProjectDialogConfirmInput) => {
      if (!operations?.createTaskList) return;
      const trimmed = name.trim();
      if (!trimmed) return;

      try {
        const created = await operations.createTaskList({
          name: trimmed,
          ...(color?.trim() ? { color: color.trim() } : {}),
          ...(groupSlug?.trim() ? { groupSlug: groupSlug.trim() } : {}),
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
    async (listId: string, { name, color }: TaskProjectDialogConfirmInput) => {
      if (!operations?.patchTaskList) return;
      const trimmed = name.trim();
      const list = taskLists.find((entry) => entry.id === listId);
      if (!trimmed || !list || isProtectedTaskList(list) || list.role === "group") return;

      const patch: { name?: string; color?: string | null } = {};
      if (trimmed !== list.name) patch.name = trimmed;
      const normalizedColor = color?.trim() || null;
      const currentColor = list.color?.trim() || null;
      if (normalizedColor !== currentColor) patch.color = normalizedColor;

      if (Object.keys(patch).length === 0) {
        setProjectDialog(null);
        return;
      }

      try {
        const updated = await operations.patchTaskList(listId, patch);
        setTaskLists((prev) => prev.map((entry) => (entry.id === listId ? updated : entry)));
        show(L.toastProjectRenamed(trimmed), { icon: <Tag className="size-4" /> });
        setProjectDialog(null);
      } catch {
        showMutationError(L.toastProjectSaveFailed);
      }
    },
    [L, operations, setTaskLists, show, showMutationError, taskLists],
  );

  const openCreateProjectDialog = useCallback(() => {
    setProjectDialog({ mode: "create" });
  }, []);

  const openEditProjectDialog = useCallback(
    (listId: string) => {
      const list = taskLists.find((entry) => entry.id === listId);
      if (!list || isProtectedTaskList(list) || list.role === "group") return;
      setProjectDialog({
        mode: "edit",
        listId: list.id,
        name: list.name,
        color: list.color ?? null,
        scope: list.scope === "group" ? "group" : "personal",
        groupSlug: list.groupSlug ?? null,
      });
    },
    [taskLists],
  );

  return {
    canManageProjects,
    canRenameProject,
    selectedList,
    projectDialog,
    setProjectDialog,
    openCreateProjectDialog,
    openEditProjectDialog,
    createProject,
    updateProject,
  };
}
