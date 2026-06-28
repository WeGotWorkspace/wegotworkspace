import type { Editor } from "@tiptap/react";
import type { MutableRefObject, Dispatch, SetStateAction } from "react";
import {
  findCommentMarkIdInSelection,
  syncPersistedCommentMarks,
} from "@/text-editor-core/src/text-editor-comment-commands";
import type { DocsCommentThread } from "../docs-comments-types";

export function markCommentThreadActive(
  threadId: string,
  activeThreadIdRef: MutableRefObject<string | null>,
  dismissedSelectionRef: MutableRefObject<{ from: number; to: number } | null>,
  setActiveThreadId: Dispatch<SetStateAction<string | null>>,
): void {
  dismissedSelectionRef.current = null;
  activeThreadIdRef.current = threadId;
  setActiveThreadId(threadId);
}

export function activateCommentThreadInEditor(
  editor: Editor,
  threadId: string,
  openThreads: DocsCommentThread[],
  clickPos?: number,
): void {
  syncPersistedCommentMarks(editor, openThreads);

  if (clickPos != null) {
    editor.commands.selectComment(threadId, { caretPos: clickPos });
    return;
  }

  const { empty, $anchor } = editor.state.selection;
  if (!empty) {
    editor.commands.selectComment(threadId, { caretPos: $anchor.pos });
    return;
  }

  editor.commands.selectComment(threadId);
}

export function selectCommentThreadInEditor(
  editor: Editor,
  threadId: string,
  openThreads: DocsCommentThread[],
  openThreadIds: Set<string>,
): void {
  syncPersistedCommentMarks(editor, openThreads);

  const { empty, $anchor } = editor.state.selection;
  const selectedMarkId = findCommentMarkIdInSelection(editor, { allowedIds: openThreadIds });

  if (selectedMarkId === threadId) {
    if (empty) {
      editor.commands.selectComment(threadId, { preserveSelection: true });
    } else {
      editor.commands.selectComment(threadId, { caretPos: $anchor.pos });
    }
    return;
  }

  editor.commands.selectComment(threadId, { caretAt: "start" });
}
