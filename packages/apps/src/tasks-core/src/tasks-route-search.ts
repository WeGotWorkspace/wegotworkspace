/**
 * Path-based tasks routing utilities.
 *
 * URL structure:
 *   /tasks/state/all
 *   /tasks/state/today
 *   /tasks/lists/:listId
 */

import { INBOX_TASK_LIST_ID, isInboxTaskList } from "@/tasks-core/src/tasks-task-utils";

export type TasksRouteParams = {
  stateSlug?: string;
  listId?: string;
};

type TaskListRouteEntry = {
  id: string;
  role?: string | null;
  name?: string | null;
};

/** Derive the controller `view` string from the matched path and params. */
export function tasksViewFromLocation(pathname: string, params: TasksRouteParams): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "tasks") return "state:all";

  const segment = parts[1] ? decodeURIComponent(parts[1]) : "state";
  const slugFromPath = parts[2] ? decodeURIComponent(parts[2]) : undefined;

  if (segment === "state") {
    const stateSlug = slugFromPath ?? params.stateSlug;
    if (stateSlug) {
      return `state:${decodeURIComponent(stateSlug)}`;
    }
    return "state:all";
  }
  if (segment === "tags") {
    return "state:all";
  }
  if (segment === "lists") {
    const listId = slugFromPath ?? params.listId;
    if (listId) {
      return `list:${decodeURIComponent(listId)}`;
    }
  }
  return "state:all";
}

/** Map inbox aliases (e.g. legacy `inbox` slug) to the canonical list id from bootstrap. */
export function normalizeTasksView(view: string, taskLists: TaskListRouteEntry[]): string {
  if (view.startsWith("tag:")) return "state:all";
  if (!view.startsWith("list:")) return view;

  const listId = view.slice(5);
  const matchedList = taskLists.find((list) => list.id === listId);
  if (matchedList && isInboxTaskList(matchedList)) {
    return `list:${matchedList.id}`;
  }

  if (listId === INBOX_TASK_LIST_ID) {
    const inbox = taskLists.find(isInboxTaskList);
    if (inbox) return `list:${inbox.id}`;
  }

  return view;
}

export type TasksNavigateTarget = {
  to: "/tasks/state/all" | "/tasks/state/$stateSlug" | "/tasks/lists/$listId";
  params: Record<string, string>;
};

export function tasksNavigateTarget(view: string): TasksNavigateTarget {
  if (view.startsWith("tag:")) {
    return { to: "/tasks/state/all", params: {} };
  }
  if (view.startsWith("state:")) {
    const stateSlug = encodeURIComponent(view.slice(6));
    if (stateSlug === "all") {
      return { to: "/tasks/state/all", params: {} };
    }
    return { to: "/tasks/state/$stateSlug", params: { stateSlug } };
  }
  if (view.startsWith("list:")) {
    const listId = encodeURIComponent(view.slice(5));
    return { to: "/tasks/lists/$listId", params: { listId } };
  }
  return { to: "/tasks/state/all", params: {} };
}
