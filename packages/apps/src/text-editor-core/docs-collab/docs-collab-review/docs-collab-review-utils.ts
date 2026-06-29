import type { Editor } from "@tiptap/react";
import type { DocsCommentThread } from "../docs-comments-types";
import { resolveThreadDocumentPosition } from "../docs-comments/docs-comments-mark-visibility";
import type { DocsSuggestionWithThread } from "../docs-suggestions-types";

export type DocsCollabReviewCommentItem = {
  type: "comment";
  thread: DocsCommentThread;
};

export type DocsCollabReviewSuggestionItem = {
  type: "suggestion";
  suggestion: DocsSuggestionWithThread;
};

export type DocsCollabReviewItem = DocsCollabReviewCommentItem | DocsCollabReviewSuggestionItem;

function resolveReviewItemDocumentPosition(
  editor: Editor | null,
  item: DocsCollabReviewItem,
): number {
  if (item.type === "comment") {
    if (editor) return resolveThreadDocumentPosition(editor, item.thread);
    if (typeof item.thread.anchorFrom === "number") return item.thread.anchorFrom;
    return Number.MAX_SAFE_INTEGER;
  }

  return item.suggestion.from;
}

function compareReviewItems(
  editor: Editor | null,
  left: DocsCollabReviewItem,
  right: DocsCollabReviewItem,
): number {
  const leftPos = resolveReviewItemDocumentPosition(editor, left);
  const rightPos = resolveReviewItemDocumentPosition(editor, right);
  if (leftPos !== rightPos) return leftPos - rightPos;

  if (left.type !== right.type) {
    return left.type === "comment" ? -1 : 1;
  }

  const leftId = left.type === "comment" ? left.thread.id : left.suggestion.changeId;
  const rightId = right.type === "comment" ? right.thread.id : right.suggestion.changeId;
  return leftId.localeCompare(rightId);
}

/** Merge comments and suggestions into one list ordered by document position. */
export function sortReviewItemsByDocumentOrder(
  editor: Editor | null,
  threads: DocsCommentThread[],
  suggestions: DocsSuggestionWithThread[],
): DocsCollabReviewItem[] {
  const items: DocsCollabReviewItem[] = [
    ...threads.map((thread): DocsCollabReviewCommentItem => ({ type: "comment", thread })),
    ...suggestions.map(
      (suggestion): DocsCollabReviewSuggestionItem => ({ type: "suggestion", suggestion }),
    ),
  ];

  return items.sort((left, right) => compareReviewItems(editor, left, right));
}
