import { useMemo } from "react";
import {
  Calendar,
  CalendarClock,
  CheckCircle2,
  CircleAlert,
  CircleDot,
  CircleX,
  Clock,
  Inbox as InboxIcon,
  List,
} from "lucide-react";
import type { TasksUILabels } from "@/tasks-core/src/tasks-labels";
import { TaskListDot } from "@/tasks-core/src/tasks-list-dot";
import { INBOX_TASK_LIST_ID, isInboxTaskList } from "@/tasks-core/src/tasks-task-utils";
import {
  PRIORITY_FILTER_SLUGS,
  priorityFilterIcon,
  priorityFilterLabel,
} from "@/tasks-core/src/tasks-priority";

type TaskListSidebarEntry = {
  id: string;
  name: string;
  role?: string | null;
  color?: string | null;
};

type UseTasksSidebarModelArgs = {
  labels: TasksUILabels;
  view: string;
  taskLists: TaskListSidebarEntry[];
  selectView: (view: string) => void;
  sidebarDropZoneProps: (
    target: string,
    onDrop: (ids: string[]) => void,
  ) => Record<string, unknown>;
  moveToList: (ids: string[], listId: string) => void;
};

export function useTasksSidebarModel({
  labels,
  view,
  taskLists,
  selectView,
  sidebarDropZoneProps,
  moveToList,
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

  const timeSidebarItems = useMemo(
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
    ],
    [labels, selectView, view],
  );

  const statusSidebarItems = useMemo(
    () => [
      {
        label: labels.stateNeedsAction,
        icon: <Clock className="size-3.5" />,
        selected: view === "state:needs-action",
        onClick: () => selectView("state:needs-action"),
      },
      {
        label: labels.stateInProcess,
        icon: <CircleDot className="size-3.5" />,
        selected: view === "state:in-process",
        onClick: () => selectView("state:in-process"),
      },
      {
        label: labels.stateCompleted,
        icon: <CheckCircle2 className="size-3.5" />,
        selected: view === "state:completed",
        onClick: () => selectView("state:completed"),
      },
      {
        label: labels.stateCancelled,
        icon: <CircleX className="size-3.5" />,
        selected: view === "state:cancelled",
        onClick: () => selectView("state:cancelled"),
      },
    ],
    [labels, selectView, view],
  );

  const prioritySidebarItems = useMemo(
    () =>
      PRIORITY_FILTER_SLUGS.map((slug) => ({
        label: priorityFilterLabel(slug, labels),
        icon: priorityFilterIcon(slug),
        selected: view === `priority:${slug}`,
        onClick: () => selectView(`priority:${slug}`),
      })),
    [labels, selectView, view],
  );

  const projectSidebarItems = useMemo(
    () =>
      projectTaskLists.map((list) => ({
        label: list.name,
        icon: <TaskListDot list={list} />,
        selected: view === `list:${list.id}`,
        onClick: () => selectView(`list:${list.id}`),
        ...sidebarDropZoneProps(`list:${list.id}`, (ids) => moveToList(ids, list.id)),
      })),
    [moveToList, projectTaskLists, selectView, sidebarDropZoneProps, view],
  );

  return {
    inboxSidebarItems,
    timeSidebarItems,
    statusSidebarItems,
    prioritySidebarItems,
    projectSidebarItems,
  };
}
