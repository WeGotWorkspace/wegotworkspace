import { useMemo } from "react";
import { Calendar, CalendarClock, CircleAlert, Clock, List, Tag } from "lucide-react";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";

type UseTasksSidebarModelArgs = {
  labels: TasksUILabels;
  view: string;
  tags: string[];
  taskLists: { id: string; name: string }[];
  selectView: (view: string) => void;
  sidebarDropZoneProps: (
    target: string,
    onDrop: (ids: string[]) => void,
  ) => Record<string, unknown>;
  moveToList: (ids: string[], listId: string) => void;
  assignTagToTasks: (ids: string[], tag: string) => void;
};

export function useTasksSidebarModel({
  labels,
  view,
  tags,
  taskLists,
  selectView,
  sidebarDropZoneProps,
  moveToList,
  assignTagToTasks,
}: UseTasksSidebarModelArgs) {
  const stateSidebarItems = useMemo(
    () => [
      {
        label: labels.stateAll,
        icon: <List className="size-3.5" />,
        selected: view === "state:all",
        onClick: () => selectView("state:all"),
      },
      {
        label: labels.stateToday,
        icon: <Calendar className="size-3.5" />,
        selected: view === "state:today",
        onClick: () => selectView("state:today"),
      },
      {
        label: labels.stateUpcoming,
        icon: <CalendarClock className="size-3.5" />,
        selected: view === "state:upcoming",
        onClick: () => selectView("state:upcoming"),
      },
      {
        label: labels.stateOverdue,
        icon: <CircleAlert className="size-3.5" />,
        selected: view === "state:overdue",
        onClick: () => selectView("state:overdue"),
      },
      {
        label: labels.stateNeedsAction,
        icon: <Clock className="size-3.5" />,
        selected: view === "state:needs-action",
        onClick: () => selectView("state:needs-action"),
      },
    ],
    [labels, selectView, view],
  );

  const tagSidebarItems = useMemo(
    () =>
      tags.map((tag) => ({
        label: tag,
        icon: <Tag className="size-3.5" />,
        selected: view === `tag:${tag}`,
        onClick: () => selectView(`tag:${tag}`),
        ...sidebarDropZoneProps(`tag:${tag}`, (ids) => assignTagToTasks(ids, tag)),
      })),
    [assignTagToTasks, selectView, sidebarDropZoneProps, tags, view],
  );

  const listSidebarItems = useMemo(
    () =>
      taskLists.map((list) => ({
        label: list.name,
        icon: <List className="size-3.5" />,
        selected: view === `list:${list.id}`,
        onClick: () => selectView(`list:${list.id}`),
        ...sidebarDropZoneProps(`list:${list.id}`, (ids) => moveToList(ids, list.id)),
      })),
    [moveToList, selectView, sidebarDropZoneProps, taskLists, view],
  );

  return {
    stateSidebarItems,
    tagSidebarItems,
    listSidebarItems,
  };
}
