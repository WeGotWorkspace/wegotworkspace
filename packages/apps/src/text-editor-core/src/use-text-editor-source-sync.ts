import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import {
  getTextEditorContent,
  setTextEditorContent,
  type TextEditorContentFormat,
} from "@/text-editor-core/src/text-editor-content";

export type UseTextEditorSourceSyncOptions = {
  editor: Editor | null;
  format: TextEditorContentFormat;
  viewSource: boolean;
  onUpdate?: (payload: { editor: Editor; content: string }) => void;
};

export function useTextEditorSourceSync({
  editor,
  format,
  viewSource,
  onUpdate,
}: UseTextEditorSourceSyncOptions) {
  const [sourceValue, setSourceValue] = useState("");
  const sourceFocusedRef = useRef(false);
  const applyingFromSourceRef = useRef(false);

  const readFromEditor = useCallback(() => {
    if (!editor) return "";
    return getTextEditorContent(editor, format);
  }, [editor, format]);

  useEffect(() => {
    if (!viewSource || !editor) return;
    setSourceValue(readFromEditor());
  }, [viewSource, editor, readFromEditor]);

  useEffect(() => {
    if (!editor || !viewSource) return;

    const handleEditorUpdate = () => {
      if (sourceFocusedRef.current || applyingFromSourceRef.current) return;
      setSourceValue(readFromEditor());
    };

    editor.on("update", handleEditorUpdate);
    return () => {
      editor.off("update", handleEditorUpdate);
    };
  }, [editor, viewSource, readFromEditor]);

  const handleSourceChange = useCallback(
    (value: string) => {
      setSourceValue(value);
      if (!editor) return;

      applyingFromSourceRef.current = true;
      setTextEditorContent(editor, value, format);
      applyingFromSourceRef.current = false;
      onUpdate?.({ editor, content: value });
    },
    [editor, onUpdate],
  );

  const handleSourceFocus = useCallback(() => {
    sourceFocusedRef.current = true;
  }, []);

  const handleSourceBlur = useCallback(() => {
    sourceFocusedRef.current = false;
    if (editor) setSourceValue(readFromEditor());
  }, [editor, readFromEditor]);

  return {
    sourceValue,
    onSourceChange: handleSourceChange,
    onSourceFocus: handleSourceFocus,
    onSourceBlur: handleSourceBlur,
  };
}
