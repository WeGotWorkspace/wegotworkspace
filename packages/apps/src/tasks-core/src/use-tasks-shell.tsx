import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { mergeTasksLabels, type TasksUILabels } from "@/tasks-core/src/tasks-labels";
import {
  collectTaskTags,
  defaultTaskListId,
  filterTasksBySearch,
  filterTasksByView,
} from "@/tasks-core/src/tasks-task-utils";
import type { Task, TasksAPIOperations, TasksUIData } from "@/tasks-core/src/tasks-types";

export type UseTasksShellArgs = {
  data: TasksUIData;
  labels?: Partial<TasksUILabels>;
  listLoading?: boolean;
  operations?: TasksAPIOperations;
  bootstrapRevision?: number;
  initialView?: string;
  onViewChange?: (view: string) => void;
};

export function useTasksShell({
  data,
  labels,
  listLoading = false,
  operations,
  bootstrapRevision = 0,
  initialView,
  onViewChange,
}: UseTasksShellArgs) {
  const L = useMemo(() => mergeTasksLabels(labels), [labels]);
  const [tasks, setTasks] = useState<Task[]>(() => data.tasks);
  const [taskLists, setTaskLists] = useState(() => data.taskLists);
  const [view, setView] = useState<string>(() => initialView ?? "state:all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia("(max-width: 767px)").matches;
  });

  const { show, showError } = useAppToast();
  const showMutationError = useCallback(
    (fallback = "Could not sync this change. Please try again.") => showError(fallback),
    [showError],
  );

  useEffect(() => {
    setTasks(data.tasks);
    setTaskLists(data.taskLists);
  }, [bootstrapRevision, data]);

  useEffect(() => {
    if (initialView === undefined) return;
    setView(initialView);
  }, [initialView]);

  const tags = useMemo(() => collectTaskTags(tasks), [tasks]);

  const viewLabel = useMemo(() => {
    if (view === "state:all") return L.stateAll;
    if (view === "state:today") return L.stateToday;
    if (view === "state:upcoming") return L.stateUpcoming;
    if (view === "state:overdue") return L.stateOverdue;
    if (view === "state:needs-action") return L.stateNeedsAction;
    if (view.startsWith("tag:")) return L.tagViewTitle(view.slice(4));
    if (view.startsWith("list:")) {
      const listId = view.slice(5);
      return taskLists.find((list) => list.id === listId)?.name ?? listId;
    }
    return L.fallbackViewTitle;
  }, [L, taskLists, view]);

  const selectedListId = view.startsWith("list:") ? view.slice(5) : null;
  const selectedTag = view.startsWith("tag:") ? view.slice(4) : null;
  const canCreateTask = Boolean(operations);

  const selectView = useCallback((nextView: string) => {
    setView(nextView);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  }, []);

  const viewSyncedRef = useRef(false);
  useEffect(() => {
    if (!viewSyncedRef.current) {
      viewSyncedRef.current = true;
      return;
    }
    onViewChange?.(view);
  }, [view, onViewChange]);

  const visibleTasks = useMemo(() => {
    const byView = filterTasksByView(tasks, view);
    return filterTasksBySearch(byView, searchQuery);
  }, [searchQuery, tasks, view]);

  const createListId = useMemo(
    () => selectedListId ?? defaultTaskListId(taskLists),
    [selectedListId, taskLists],
  );

  const queueSaveToast = useCallback(() => {
    show(L.toastSaved, { icon: <Check className="size-4" /> });
  }, [L.toastSaved, show]);

  return {
    L,
    tasks,
    setTasks,
    taskLists,
    tags,
    view,
    viewLabel,
    searchQuery,
    setSearchQuery,
    sidebarOpen,
    setSidebarOpen,
    visibleTasks,
    selectedListId,
    selectedTag,
    canCreateTask,
    selectView,
    listLoading,
    operations,
    createListId,
    showMutationError,
    queueSaveToast,
  };
}

export type TasksShellState = ReturnType<typeof useTasksShell>;
