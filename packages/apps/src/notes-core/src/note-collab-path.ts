import { wgwApiBaseUrl, wgwEnsureFreshAccessToken } from "@/lib/api/wgw/http";
import { encodeFileRoomId } from "@/lib/rtc/room-id";
import type { DocsCollabUrls } from "@/text-editor-core/docs-collab";

/**
 * Where a note body lives on the shared `wgw_files` tree.
 *
 * - `personal` → `users/{username}/.notes/{notebook}/{id}.md`
 * - `group`    → `groups/{slug}/.notes/{notebook}/{id}.md`
 *
 * Body collab reuses the Docs stack keyed by this virtual path; frontmatter
 * (title/tags/starred/notebook) stays in the Notes metadata domain.
 */
export type NoteCollabScope =
  | { kind: "personal"; username: string }
  | { kind: "group"; slug: string };

export type NoteCollabPathArgs = {
  scope: NoteCollabScope;
  notebook: string;
  noteId: string;
  /** Archived notes live under a `.archive` subtree (mirrors the API NoteStoragePaths). */
  archived?: boolean;
};

function scopeRoot(scope: NoteCollabScope): string {
  return scope.kind === "group" ? `groups/${scope.slug}/.notes` : `users/${scope.username}/.notes`;
}

/** Map a note (scope + notebook + id) to its collab virtual path. */
export function noteCollabPath({ scope, notebook, noteId, archived }: NoteCollabPathArgs): string {
  const root = scopeRoot(scope);
  const notebookDir = archived ? `${root}/.archive/${notebook}` : `${root}/${notebook}`;
  return `${notebookDir}/${noteId}.md`;
}

/** Build the Docs-collab transport/document endpoints for a note virtual path. */
export async function buildNoteCollabUrls(path: string): Promise<DocsCollabUrls> {
  const baseUrl = wgwApiBaseUrl();
  const roomId = encodeFileRoomId(path);
  const pathQuery = encodeURIComponent(path);
  const authToken = (await wgwEnsureFreshAccessToken()) ?? undefined;
  return {
    signalUrl: `${baseUrl}/rooms/${encodeURIComponent(roomId)}/events`,
    collabApiBaseUrl: `${baseUrl}/rooms`,
    collabRtcUrl: `${baseUrl}/rooms/${encodeURIComponent(roomId)}/configuration`,
    authToken,
    documentUrl: `${baseUrl}/files/collaboration?path=${pathQuery}`,
    yjsUrl: `${baseUrl}/files/collaboration?path=${pathQuery}&format=yjs`,
    documentSaveMethod: "PUT",
    room: path,
  };
}
