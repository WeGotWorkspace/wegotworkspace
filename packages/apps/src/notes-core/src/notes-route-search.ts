/**
 * Path-based notes routing utilities.
 *
 * URL structure:
 *   /notes/all
 *   /notes/all/:noteId
 *   /notes/starred
 *   /notes/starred/:noteId
 *   /notes/archive
 *   /notes/archive/:noteId
 *   /notes/tags/:tagSlug
 *   /notes/tags/:tagSlug/:noteId
 *   /notes/:notebookSlug
 *   /notes/:notebookSlug/:noteId
 */

export type NotesRouteParams = {
  tagSlug?: string;
  notebookSlug?: string;
  noteId?: string;
};

/** Derive the controller `view` string from the matched path and params. */
export function notesViewFromLocation(pathname: string, params: NotesRouteParams): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "notes") return "all";

  const segment = parts[1] ? decodeURIComponent(parts[1]) : "all";
  if (segment === "all" || segment === "starred" || segment === "archive") {
    return segment;
  }
  if (segment === "tags" && params.tagSlug) {
    return `tag:${decodeURIComponent(params.tagSlug)}`;
  }
  if (params.notebookSlug) {
    return `nb:${decodeURIComponent(params.notebookSlug)}`;
  }
  return "all";
}

/** Active note id from path params; empty string when absent. */
export function notesNoteFromParams(params: NotesRouteParams): string {
  return params.noteId ?? "";
}

export type NotesNavigateTarget = {
  to:
    | "/notes/all"
    | "/notes/all/$noteId"
    | "/notes/starred"
    | "/notes/starred/$noteId"
    | "/notes/archive"
    | "/notes/archive/$noteId"
    | "/notes/tags/$tagSlug"
    | "/notes/tags/$tagSlug/$noteId"
    | "/notes/$notebookSlug"
    | "/notes/$notebookSlug/$noteId";
  params: Record<string, string>;
};

/** Build a router navigation target from controller view + optional note id. */
export function notesNavigateTarget(view: string, noteId = ""): NotesNavigateTarget {
  if (view === "all") {
    return noteId
      ? { to: "/notes/all/$noteId", params: { noteId } }
      : { to: "/notes/all", params: {} };
  }
  if (view === "starred") {
    return noteId
      ? { to: "/notes/starred/$noteId", params: { noteId } }
      : { to: "/notes/starred", params: {} };
  }
  if (view === "archive") {
    return noteId
      ? { to: "/notes/archive/$noteId", params: { noteId } }
      : { to: "/notes/archive", params: {} };
  }
  if (view.startsWith("tag:")) {
    const tagSlug = encodeURIComponent(view.slice(4));
    return noteId
      ? { to: "/notes/tags/$tagSlug/$noteId", params: { tagSlug, noteId } }
      : { to: "/notes/tags/$tagSlug", params: { tagSlug } };
  }
  if (view.startsWith("nb:")) {
    const notebookSlug = encodeURIComponent(view.slice(3));
    return noteId
      ? { to: "/notes/$notebookSlug/$noteId", params: { notebookSlug, noteId } }
      : { to: "/notes/$notebookSlug", params: { notebookSlug } };
  }
  return { to: "/notes/all", params: {} };
}
