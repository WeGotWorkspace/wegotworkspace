/**
 * Path-based tasks routing utilities.
 *
 * URL structure:
 *   /tasks/state/all
 *   /tasks/state/all/:taskId
 *   /tasks/state/today
 *   /tasks/tags/:tagSlug
 *   /tasks/lists/:listId
 */

export type TasksRouteParams = {
  stateSlug?: string;
  tagSlug?: string;
  listId?: string;
  taskId?: string;
};

export function tasksViewFromLocation(pathname: string, params: TasksRouteParams): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "tasks") return "state:all";

  const segment = parts[1] ? decodeURIComponent(parts[1]) : "state";
  if (segment === "state" && params.stateSlug) {
    return `state:${decodeURIComponent(params.stateSlug)}`;
  }
  if (segment === "tags" && params.tagSlug) {
    return `tag:${decodeURIComponent(params.tagSlug)}`;
  }
  if (segment === "lists" && params.listId) {
    return `list:${decodeURIComponent(params.listId)}`;
  }
  return "state:all";
}

export function tasksTaskFromParams(params: TasksRouteParams): string {
  return params.taskId ?? "";
}

export type TasksNavigateTarget = {
  to:
    | "/tasks/state/all"
    | "/tasks/state/all/$taskId"
    | "/tasks/state/$stateSlug"
    | "/tasks/state/$stateSlug/$taskId"
    | "/tasks/tags/$tagSlug"
    | "/tasks/tags/$tagSlug/$taskId"
    | "/tasks/lists/$listId"
    | "/tasks/lists/$listId/$taskId";
  params: Record<string, string>;
};

export function tasksNavigateTarget(view: string, taskId = ""): TasksNavigateTarget {
  if (view.startsWith("state:")) {
    const stateSlug = encodeURIComponent(view.slice(6));
    if (stateSlug === "all") {
      return taskId
        ? { to: "/tasks/state/all/$taskId", params: { taskId } }
        : { to: "/tasks/state/all", params: {} };
    }
    return taskId
      ? { to: "/tasks/state/$stateSlug/$taskId", params: { stateSlug, taskId } }
      : { to: "/tasks/state/$stateSlug", params: { stateSlug } };
  }
  if (view.startsWith("tag:")) {
    const tagSlug = encodeURIComponent(view.slice(4));
    return taskId
      ? { to: "/tasks/tags/$tagSlug/$taskId", params: { tagSlug, taskId } }
      : { to: "/tasks/tags/$tagSlug", params: { tagSlug } };
  }
  if (view.startsWith("list:")) {
    const listId = encodeURIComponent(view.slice(5));
    return taskId
      ? { to: "/tasks/lists/$listId/$taskId", params: { listId, taskId } }
      : { to: "/tasks/lists/$listId", params: { listId } };
  }
  return { to: "/tasks/state/all", params: {} };
}
