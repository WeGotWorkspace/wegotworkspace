import type { DocsTrackChangeGroup } from "@/text-editor-core/src/text-editor-track-changes";
import type { DocsCommentMessage, DocsCommentReaction } from "./docs-comments-types";

export type DocsSuggestionThread = {
  changeId: string;
  messages: DocsCommentMessage[];
  reactions?: DocsCommentReaction[];
};

/** Editor track-change group merged with optional Yjs thread sidecar data. */
export type DocsSuggestionWithThread = DocsTrackChangeGroup & {
  messages: DocsCommentMessage[];
  reactions?: DocsCommentReaction[];
};

export const DOCS_SUGGESTION_THREADS_MAP_KEY = "suggestionThreads";
