import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import type * as Y from "yjs";
import { syncPersistedCommentMarks } from "@/text-editor-core/src/text-editor-comment-commands";
import { getDocsCommentsMap, readDocsCommentThreadsFromMap } from "./docs-comments-map";
import type { DocsCommentThread } from "./docs-comments-types";

export function useDocsCommentsSync(
  ydoc: Y.Doc | null,
  editor: Editor | null,
): DocsCommentThread[] {
  const [threads, setThreads] = useState<DocsCommentThread[]>([]);

  useEffect(() => {
    if (!ydoc) {
      setThreads([]);
      return;
    }

    const map = getDocsCommentsMap(ydoc);
    const sync = () => setThreads(readDocsCommentThreadsFromMap(map));
    map.observeDeep(sync);
    sync();
    return () => map.unobserveDeep(sync);
  }, [ydoc]);

  useEffect(() => {
    if (!editor || !ydoc) return;

    const map = getDocsCommentsMap(ydoc);
    const syncMarks = () => {
      syncPersistedCommentMarks(editor, readDocsCommentThreadsFromMap(map));
    };

    syncMarks();
    editor.on("update", syncMarks);
    map.observeDeep(syncMarks);
    return () => {
      editor.off("update", syncMarks);
      map.unobserveDeep(syncMarks);
    };
  }, [editor, ydoc]);

  return threads;
}
