/**
 * Path-based tasks routing utilities.
 *
 * URL structure:
 *   /tasks/state/all
 *   /tasks/state/today
 *   /tasks/tags/:tagSlug
 *   /tasks/lists/:listId
 */

export type TasksRouteParams = {
  stateSlug?: string;
  tagSlug?: string;
  listId?: string;
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

export type TasksNavigateTarget = {
  to:
    | "/tasks/state/all"
    | "/tasks/state/$stateSlug"
    | "/tasks/tags/$tagSlug"
    | "/tasks/lists/$listId";
  params: Record<string, string>;
};

export function tasksNavigateTarget(view: string): TasksNavigateTarget {
  if (view.startsWith("state:")) {
    const stateSlug = encodeURIComponent(view.slice(6));
    if (stateSlug === "all") {
      return { to: "/tasks/state/all", params: {} };
    }
    return { to: "/tasks/state/$stateSlug", params: { stateSlug } };
  }
  if (view.startsWith("tag:")) {
    const tagSlug = encodeURIComponent(view.slice(4));
    return { to: "/tasks/tags/$tagSlug", params: { tagSlug } };
  }
  if (view.startsWith("list:")) {
    const listId = encodeURIComponent(view.slice(5));
    return { to: "/tasks/lists/$listId", params: { listId } };
  }
  return { to: "/tasks/state/all", params: {} };
}
