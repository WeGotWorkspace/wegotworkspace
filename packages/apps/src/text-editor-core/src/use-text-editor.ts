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

export type UseTextEditorOptions = {
  content?: string;
  format?: TextEditorContentFormat;
  editable?: boolean;
  placeholder?: string;
  /** Visual multi-page pagination (US Letter). Off by default; Docs opts in. */
  pagination?: boolean;
  onUpdate?: (payload: { editor: Editor; content: string }) => void;
} & Pick<UseEditorOptions, "autofocus" | "editorProps">;

export function useTextEditor(options: UseTextEditorOptions = {}) {
  const {
    content = "",
    format = "html",
    editable = true,
    placeholder,
    pagination = false,
    onUpdate,
    autofocus,
    editorProps,
  } = options;

  const extensionOptions: CreateTextEditorExtensionsOptions = { placeholder, format, pagination };

  return useEditor(
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
}
