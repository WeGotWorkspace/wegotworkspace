import { useEffect } from "react";
import { useEditor, type Editor, type UseEditorOptions } from "@tiptap/react";
import {
  getTextEditorContent,
  initialTextEditorContent,
  type TextEditorContentFormat,
} from "@/text-editor-core/src/text-editor-content";
import {
  createTextEditorExtensions,
  type CreateTextEditorExtensionsOptions,
} from "@/text-editor-core/src/text-editor-extensions";
import {
  applyTextEditorPageFormat,
  DEFAULT_TEXT_EDITOR_PAGE_FORMAT,
  type TextEditorPageFormat,
} from "@/text-editor-core/src/text-editor-pagination";

export type UseTextEditorOptions = {
  content?: string;
  format?: TextEditorContentFormat;
  editable?: boolean;
  placeholder?: string;
  /** Visual multi-page pagination. Off by default; Docs opts in. */
  pagination?: boolean;
  /** Page size for visual pagination (defaults to A4). */
  pageFormat?: TextEditorPageFormat;
  onUpdate?: (payload: { editor: Editor; content: string }) => void;
} & Pick<UseEditorOptions, "autofocus" | "editorProps">;

export function useTextEditor(options: UseTextEditorOptions = {}) {
  const {
    content = "",
    format = "html",
    editable = true,
    placeholder,
    pagination = false,
    pageFormat = DEFAULT_TEXT_EDITOR_PAGE_FORMAT,
    onUpdate,
    autofocus,
    editorProps,
  } = options;

  const extensionOptions: CreateTextEditorExtensionsOptions = {
    placeholder,
    format,
    pagination,
    pageFormat,
  };

  const editor = useEditor(
    {
      extensions: createTextEditorExtensions(extensionOptions),
      content: initialTextEditorContent(content, format),
      editable,
      autofocus,
      editorProps: {
        attributes: { class: "text-editor-prose focus:outline-none" },
        ...editorProps,
      },
      immediatelyRender: false,
      onUpdate: onUpdate
        ? ({ editor }) =>
            onUpdate({
              editor,
              content: getTextEditorContent(editor, format),
            })
        : undefined,
    },
    [format, editable, placeholder, pagination],
  );

  // `pageFormat` is intentionally out of the editor deps so a size change
  // re-flows pagination live instead of tearing down the editor.
  useEffect(() => {
    if (!editor || !pagination) return;
    applyTextEditorPageFormat(editor, pageFormat);
  }, [editor, pagination, pageFormat]);

  return editor;
}
