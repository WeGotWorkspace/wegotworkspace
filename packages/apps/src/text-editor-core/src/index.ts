export { TextEditor, type TextEditorProps } from "@/text-editor-core/src/text-editor";
export {
  TextEditorFormatBar,
  type TextEditorFormatBarProps,
  type TextEditorFormatBarConfig,
  type TextEditorFormatBarGroup,
  TEXT_EDITOR_FORMAT_BAR_FULL,
  TEXT_EDITOR_FORMAT_BAR_GROUPS,
  TEXT_EDITOR_FORMAT_BAR_MAIL,
  resolveTextEditorFormatBarConfig,
} from "@/text-editor-core/src/text-editor-format-bar";
export {
  TextEditorSheet,
  type TextEditorSheetProps,
  type TextEditorSheetVariant,
} from "@/text-editor-core/src/text-editor-sheet";
export { TextEditorSlashMenu } from "@/text-editor-core/src/text-editor-slash-menu";
export { printTextEditorSheet } from "@/text-editor-core/src/text-editor-print";
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
  TextEditorSource,
  type TextEditorSourceProps,
} from "@/text-editor-core/src/text-editor-source";
export { useTextEditorSourceSync } from "@/text-editor-core/src/use-text-editor-source-sync";
export {
  TEXT_EDITOR_DEMO_HTML,
  TEXT_EDITOR_DEMO_MARKDOWN,
  textEditorDemoContent,
} from "@/text-editor-core/src/text-editor-fixtures";
export type { Editor } from "@tiptap/react";
