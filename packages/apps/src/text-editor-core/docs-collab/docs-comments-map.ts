import type * as Y from "yjs";
import { parseDocsCommentThread } from "./docs-comments/docs-comments-schema";
import { DOCS_COMMENTS_MAP_KEY, type DocsCommentThread } from "./docs-comments-types";

function createRandomSuffix(length = 7): string {
  const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += alphabet[values[i]! % alphabet.length];
  }
  return out;
}

export function createDocsCommentId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `comment-${Date.now()}-${createRandomSuffix()}`;
}

export { parseDocsCommentThread } from "./docs-comments/docs-comments-schema";

export function readDocsCommentThreadsFromMap(map: Y.Map<unknown>): DocsCommentThread[] {
  const threads: DocsCommentThread[] = [];
  map.forEach((value, key) => {
    const thread = parseDocsCommentThread(value, key);
    if (thread) threads.push(thread);
  });
  return threads.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function getDocsCommentsMap(ydoc: Y.Doc): Y.Map<unknown> {
  return ydoc.getMap(DOCS_COMMENTS_MAP_KEY);
}

export function isPersistedOpenThread(thread: DocsCommentThread): boolean {
  return !thread.resolved && thread.messages.length > 0;
}
