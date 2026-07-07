import { useMemo } from "react";
import {
  Calendar,
  CalendarClock,
  CircleAlert,
  Clock,
  Inbox as InboxIcon,
  List,
  Tag,
} from "lucide-react";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import {
  INBOX_TASK_LIST_ID,
  isInboxTaskList,
  taskListDotColor,
} from "@/tasks-core/src/tasks-task-utils";

type TaskListSidebarEntry = {
  id: string;
  name: string;
  role?: string | null;
  color?: string | null;
};

type UseTasksSidebarModelArgs = {
  labels: TasksUILabels;
  view: string;
  tags: string[];
  taskLists: TaskListSidebarEntry[];
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
  const inboxListId = useMemo(() => {
    const inboxList = taskLists.find(isInboxTaskList);
    return inboxList?.id ?? INBOX_TASK_LIST_ID;
  }, [taskLists]);

  const projectTaskLists = useMemo(
    () => taskLists.filter((list) => !isInboxTaskList(list)),
    [taskLists],
  );

  const inboxSidebarItems = useMemo(
    () => [
      {
        label: labels.sidebarInbox,
        icon: <InboxIcon className="size-3.5" />,
        selected: view === `list:${inboxListId}`,
        onClick: () => selectView(`list:${inboxListId}`),
        ...sidebarDropZoneProps(`list:${inboxListId}`, (ids) => moveToList(ids, inboxListId)),
      },
    ],
    [inboxListId, labels.sidebarInbox, moveToList, selectView, sidebarDropZoneProps, view],
  );

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

  const projectSidebarItems = useMemo(
    () =>
      projectTaskLists.map((list) => ({
        label: list.name,
        icon: (
          <span
            className="tasks-sidebar__project-dot"
            style={{ backgroundColor: taskListDotColor(list) }}
            aria-hidden
          />
        ),
        selected: view === `list:${list.id}`,
        onClick: () => selectView(`list:${list.id}`),
        ...sidebarDropZoneProps(`list:${list.id}`, (ids) => moveToList(ids, list.id)),
      })),
    [moveToList, projectTaskLists, selectView, sidebarDropZoneProps, view],
  );

  return {
    inboxSidebarItems,
    stateSidebarItems,
    tagSidebarItems,
    projectSidebarItems,
  };
}
