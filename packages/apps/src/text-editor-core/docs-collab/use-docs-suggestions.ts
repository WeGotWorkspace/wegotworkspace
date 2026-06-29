import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import "@/text-editor-core/src/text-editor-track-changes-augmentation";
import {
  editorHasTrackChanges,
  getDocsTrackChangeGroups,
  scrollTrackChangeIntoView,
  type DocsTrackChangeGroup,
} from "@/text-editor-core/src/text-editor-track-changes";
import type * as Y from "yjs";
import type { DocsCommentAuthor } from "./docs-comments-types";
import {
  deleteSuggestionThread,
  pruneOrphanSuggestionThreads,
} from "./docs-suggestions/docs-suggestions-map-writes";
import type { DocsSuggestionWithThread } from "./docs-suggestions-types";
import { useDocsSuggestionsActive } from "./use-docs-suggestions-active";
import { useDocsSuggestionsMutations } from "./use-docs-suggestions-mutations";
import { useDocsSuggestionsSync } from "./use-docs-suggestions-sync";

export type UseDocsSuggestionsOptions = {
  ydoc: Y.Doc | null;
  currentUser: DocsCommentAuthor;
};

export type UseDocsSuggestionsResult = {
  suggestions: DocsSuggestionWithThread[];
  activeChangeId: string | null;
  selectSuggestion: (changeId: string) => void;
  clearActiveSuggestion: () => void;
  activateSuggestionFromMark: (changeId: string) => void;
  acceptSuggestion: (changeId: string) => void;
  rejectSuggestion: (changeId: string) => void;
  addReply: (changeId: string, body: string) => void;
  toggleReaction: (changeId: string, emoji: string) => void;
};

function mergeSuggestionWithThread(
  suggestion: DocsTrackChangeGroup,
  threadMap: Map<
    string,
    {
      messages: DocsSuggestionWithThread["messages"];
      reactions?: DocsSuggestionWithThread["reactions"];
    }
  >,
): DocsSuggestionWithThread {
  const thread = threadMap.get(suggestion.changeId);
  return {
    ...suggestion,
    messages: thread?.messages ?? [],
    reactions: thread?.reactions,
  };
}

export function useDocsSuggestions(
  editor: Editor | null,
  options?: UseDocsSuggestionsOptions,
): UseDocsSuggestionsResult {
  const ydoc = options?.ydoc ?? null;
  const currentUser = options?.currentUser ?? { id: "", name: "" };

  const [editorSuggestions, setEditorSuggestions] = useState<DocsTrackChangeGroup[]>([]);
  const { activeChangeId, setActiveChangeId, clearActiveSuggestion } =
    useDocsSuggestionsActive(editor);
  const threads = useDocsSuggestionsSync(ydoc);

  const threadMap = useMemo(() => {
    const map = new Map<
      string,
      {
        messages: DocsSuggestionWithThread["messages"];
        reactions?: DocsSuggestionWithThread["reactions"];
      }
    >();
    for (const thread of threads) {
      map.set(thread.changeId, {
        messages: thread.messages,
        reactions: thread.reactions,
      });
    }
    return map;
  }, [threads]);

  const suggestions = useMemo(
    () => editorSuggestions.map((suggestion) => mergeSuggestionWithThread(suggestion, threadMap)),
    [editorSuggestions, threadMap],
  );

  useEffect(() => {
    if (!editor || !editorHasTrackChanges(editor)) {
      setEditorSuggestions([]);
      return;
    }

    const syncSuggestions = () => {
      const next = getDocsTrackChangeGroups(editor);
      setEditorSuggestions(next);
      setActiveChangeId((current) =>
        current && next.some((item) => item.changeId === current) ? current : null,
      );
    };

    const onTransaction = ({ transaction }: { transaction: { docChanged: boolean } }) => {
      if (!transaction?.docChanged) return;
      syncSuggestions();
    };

    syncSuggestions();
    editor.on("transaction", onTransaction);
    return () => {
      editor.off("transaction", onTransaction);
    };
  }, [editor, setActiveChangeId]);

  useEffect(() => {
    if (!ydoc || !editor || !editorHasTrackChanges(editor)) return;
    // Read change ids from the editor directly — `editorSuggestions` can still be
    // empty on the first render after the editor attaches, which would otherwise
    // prune every persisted thread on load/refresh.
    const activeChangeIds = new Set(getDocsTrackChangeGroups(editor).map((item) => item.changeId));
    pruneOrphanSuggestionThreads(ydoc, activeChangeIds);
  }, [editor, editorSuggestions, ydoc]);

  const selectSuggestion = useCallback(
    (changeId: string) => {
      setActiveChangeId(changeId);
    },
    [setActiveChangeId],
  );

  const activateSuggestionFromMark = useCallback(
    (changeId: string) => {
      setActiveChangeId(changeId);
      if (!editor) return;
      scrollTrackChangeIntoView(editor, changeId);
    },
    [editor, setActiveChangeId],
  );

  const acceptSuggestion = useCallback(
    (changeId: string) => {
      if (!editor) return;
      editor.commands.acceptChange(changeId);
      if (ydoc) deleteSuggestionThread(ydoc, changeId);
      setActiveChangeId((current) => (current === changeId ? null : current));
    },
    [editor, setActiveChangeId, ydoc],
  );

  const rejectSuggestion = useCallback(
    (changeId: string) => {
      if (!editor) return;
      editor.commands.rejectChange(changeId);
      if (ydoc) deleteSuggestionThread(ydoc, changeId);
      setActiveChangeId((current) => (current === changeId ? null : current));
    },
    [editor, setActiveChangeId, ydoc],
  );

  const { addReply, toggleReaction } = useDocsSuggestionsMutations({ ydoc, currentUser });

  return {
    suggestions,
    activeChangeId,
    selectSuggestion,
    clearActiveSuggestion,
    activateSuggestionFromMark,
    acceptSuggestion,
    rejectSuggestion,
    addReply,
    toggleReaction,
  };
}
