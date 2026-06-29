import { useCallback } from "react";
import type * as Y from "yjs";
import type { DocsCommentAuthor } from "./docs-comments-types";
import {
  appendSuggestionReply,
  createCommentMessage,
  toggleSuggestionThreadReaction,
} from "./docs-suggestions/docs-suggestions-map-writes";

type UseDocsSuggestionsMutationsOptions = {
  ydoc: Y.Doc | null;
  currentUser: DocsCommentAuthor;
};

export function useDocsSuggestionsMutations({
  ydoc,
  currentUser,
}: UseDocsSuggestionsMutationsOptions) {
  const addReply = useCallback(
    (changeId: string, body: string) => {
      if (!ydoc) return;

      const message = createCommentMessage(body, currentUser);
      if (!message) return;

      appendSuggestionReply(ydoc, changeId, message);
    },
    [currentUser, ydoc],
  );

  const toggleReaction = useCallback(
    (changeId: string, emoji: string) => {
      if (!ydoc) return;
      toggleSuggestionThreadReaction(ydoc, changeId, currentUser.id, emoji);
    },
    [currentUser.id, ydoc],
  );

  return { addReply, toggleReaction };
}
