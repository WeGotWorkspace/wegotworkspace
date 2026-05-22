import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import type { TextEditorContentFormat } from "@/text-editor-core/src/text-editor-content";
import { textEditorDemoContent } from "@/text-editor-core/src/text-editor-fixtures";
import { TextEditorFormatBar } from "@/text-editor-core/src/text-editor-format-bar";
import { TextEditorSheet } from "@/text-editor-core/src/text-editor-sheet";
import { useTextEditor } from "@/text-editor-core/src/use-text-editor";

import "@/text-editor-core/src/text-editor.css";

export type TextEditorProps = {
  /** Document serialization: HTML (e.g. mail) or Markdown (e.g. notes). */
  format?: TextEditorContentFormat;
  /** Initial content in the configured `format`. */
  content?: string;
  editable?: boolean;
  placeholder?: string;
  showPrint?: boolean;
  className?: string;
  onUpdate?: (payload: { editor: Editor; content: string }) => void;
};

/**
 * Rich text editor: formatting toolbar plus letter sheet with slash commands and table controls.
 */
export function TextEditor({
  format = "html",
  content,
  editable = true,
  placeholder,
  showPrint = true,
  className,
  onUpdate,
}: TextEditorProps) {
  const editor = useTextEditor({
    format,
    content: content ?? textEditorDemoContent(format),
    editable,
    placeholder,
    onUpdate,
  });

  return (
    <div className={cn("text-editor flex h-full w-full flex-col", className)}>
      <TextEditorFormatBar editor={editor} showPrint={showPrint} />
      <TextEditorSheet editor={editor} className="min-h-0 flex-1" />
    </div>
  );
}

export type { Editor };
