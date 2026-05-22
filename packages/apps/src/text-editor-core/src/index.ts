export { TextEditor, type TextEditorProps } from "@/text-editor-core/src/text-editor";
export {
  TextEditorFormatBar,
  type TextEditorFormatBarProps,
} from "@/text-editor-core/src/text-editor-format-bar";
export {
  TextEditorSheet,
  type TextEditorSheetProps,
} from "@/text-editor-core/src/text-editor-sheet";
export { TextEditorSlashMenu } from "@/text-editor-core/src/text-editor-slash-menu";
export { TextEditorTableControls } from "@/text-editor-core/src/text-editor-table-controls";
export {
  createTextEditorExtensions,
  CommentMark,
  SuggestionMark,
  type CreateTextEditorExtensionsOptions,
} from "@/text-editor-core/src/text-editor-extensions";
export {
  TEXT_EDITOR_CONTENT_FORMATS,
  getTextEditorContent,
  setTextEditorContent,
  type TextEditorContentFormat,
} from "@/text-editor-core/src/text-editor-content";
export { useTextEditor, type UseTextEditorOptions } from "@/text-editor-core/src/use-text-editor";
export {
  TEXT_EDITOR_DEMO_HTML,
  TEXT_EDITOR_DEMO_MARKDOWN,
  textEditorDemoContent,
} from "@/text-editor-core/src/text-editor-fixtures";
export type { Editor } from "@tiptap/react";
