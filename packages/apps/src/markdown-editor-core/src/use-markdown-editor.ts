import { useEditor, type Editor, type UseEditorOptions } from "@tiptap/react";
import {
  createMarkdownEditorExtensions,
  type CreateMarkdownEditorExtensionsOptions,
} from "@/markdown-editor-core/src/markdown-editor-extensions";

export type UseMarkdownEditorOptions = {
  content?: string;
  editable?: boolean;
  placeholder?: string;
  onUpdate?: (editor: Editor) => void;
} & Pick<UseEditorOptions, "autofocus" | "editorProps">;

export function useMarkdownEditor(options: UseMarkdownEditorOptions = {}) {
  const { content = "", editable = true, placeholder, onUpdate, autofocus, editorProps } = options;

  const extensionOptions: CreateMarkdownEditorExtensionsOptions = { placeholder };

  return useEditor({
    extensions: createMarkdownEditorExtensions(extensionOptions),
    content,
    editable,
    autofocus,
    editorProps: {
      attributes: { class: "markdown-editor-prose focus:outline-none" },
      ...editorProps,
    },
    immediatelyRender: false,
    onUpdate: onUpdate ? ({ editor }) => onUpdate(editor) : undefined,
  });
}
