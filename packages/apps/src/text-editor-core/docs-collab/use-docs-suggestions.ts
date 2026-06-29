import { useCallback, useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import "@/text-editor-core/src/text-editor-track-changes-augmentation";
import {
  editorHasTrackChanges,
  getDocsTrackChangeGroups,
  type DocsTrackChangeGroup,
} from "@/text-editor-core/src/text-editor-track-changes";

export type UseDocsSuggestionsResult = {
  suggestions: DocsTrackChangeGroup[];
  activeChangeId: string | null;
  selectSuggestion: (changeId: string) => void;
  clearActiveSuggestion: () => void;
  activateSuggestionFromMark: (changeId: string) => void;
  acceptSuggestion: (changeId: string) => void;
  rejectSuggestion: (changeId: string) => void;
  acceptAll: () => void;
  rejectAll: () => void;
};

export function useDocsSuggestions(editor: Editor | null): UseDocsSuggestionsResult {
  const [suggestions, setSuggestions] = useState<DocsTrackChangeGroup[]>([]);
  const [activeChangeId, setActiveChangeId] = useState<string | null>(null);

  useEffect(() => {
    if (!editor || !editorHasTrackChanges(editor)) {
      setSuggestions([]);
      return;
    }

    const refresh = () => {
      const next = getDocsTrackChangeGroups(editor);
      setSuggestions(next);
      setActiveChangeId((current) => {
        if (current && next.some((item) => item.changeId === current)) return current;
        return null;
      });
    };

    refresh();
    editor.on("transaction", refresh);
    return () => {
      editor.off("transaction", refresh);
    };
  }, [editor]);

  const focusSuggestion = useCallback(
    (changeId: string) => {
      if (!editor) return;
      const suggestion = getDocsTrackChangeGroups(editor).find(
        (item) => item.changeId === changeId,
      );
      if (!suggestion) return;
      const anchor = Math.min(suggestion.from, suggestion.to);
      editor.chain().focus().setTextSelection({ from: anchor, to: anchor }).run();
    },
    [editor],
  );

  const selectSuggestion = useCallback(
    (changeId: string) => {
      setActiveChangeId(changeId);
      focusSuggestion(changeId);
    },
    [focusSuggestion],
  );

  const clearActiveSuggestion = useCallback(() => {
    setActiveChangeId(null);
  }, []);

  const activateSuggestionFromMark = useCallback(
    (changeId: string) => {
      setActiveChangeId(changeId);
      focusSuggestion(changeId);
    },
    [focusSuggestion],
  );

  const acceptSuggestion = useCallback(
    (changeId: string) => {
      if (!editor) return;
      editor.commands.acceptChange(changeId);
      setActiveChangeId((current) => (current === changeId ? null : current));
    },
    [editor],
  );

  const rejectSuggestion = useCallback(
    (changeId: string) => {
      if (!editor) return;
      editor.commands.rejectChange(changeId);
      setActiveChangeId((current) => (current === changeId ? null : current));
    },
    [editor],
  );

  const acceptAll = useCallback(() => {
    if (!editor) return;
    editor.commands.acceptAll();
    setActiveChangeId(null);
  }, [editor]);

  const rejectAll = useCallback(() => {
    if (!editor) return;
    editor.commands.rejectAll();
    setActiveChangeId(null);
  }, [editor]);

  return {
    suggestions,
    activeChangeId,
    selectSuggestion,
    clearActiveSuggestion,
    activateSuggestionFromMark,
    acceptSuggestion,
    rejectSuggestion,
    acceptAll,
    rejectAll,
  };
}
