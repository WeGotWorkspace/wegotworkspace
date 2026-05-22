import { useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";

export type TextEditorFormatBarState = {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  code: boolean;
  highlight: boolean;
  headingLevel: number;
  bulletList: boolean;
  orderedList: boolean;
  taskList: boolean;
  blockquote: boolean;
  link: boolean;
  canUndo: boolean;
  canRedo: boolean;
  currentHref: string;
};

function readFormatBarState(editor: Editor): TextEditorFormatBarState {
  return {
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    code: editor.isActive("code"),
    highlight: editor.isActive("highlight"),
    headingLevel:
      ([1, 2, 3, 4, 5, 6] as const).find((level) => editor.isActive("heading", { level })) ?? 0,
    bulletList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    taskList: editor.isActive("taskList"),
    blockquote: editor.isActive("blockquote"),
    link: editor.isActive("link"),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    currentHref: (editor.getAttributes("link") as { href?: string }).href ?? "",
  };
}

/**
 * Toolbar toggle state synced from TipTap selection and marks.
 * Subscribes to transaction + selectionUpdate so active buttons stay in sync.
 */
export function useTextEditorFormatBarState(
  editor: Editor | null,
): TextEditorFormatBarState | null {
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    if (!editor) return;
    const sync = () => setRevision((value) => value + 1);
    editor.on("transaction", sync);
    editor.on("selectionUpdate", sync);
    return () => {
      editor.off("transaction", sync);
      editor.off("selectionUpdate", sync);
    };
  }, [editor]);

  return useMemo(() => (editor ? readFormatBarState(editor) : null), [editor, revision]);
}
