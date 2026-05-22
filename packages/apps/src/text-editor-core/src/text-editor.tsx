import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import type { TextEditorContentFormat } from "@/text-editor-core/src/text-editor-content";
import { textEditorDemoContent } from "@/text-editor-core/src/text-editor-fixtures";
import {
  TextEditorFormatBar,
  type TextEditorFormatBarConfig,
  resolveTextEditorFormatBarConfig,
} from "@/text-editor-core/src/text-editor-format-bar";
import { TextEditorSheet } from "@/text-editor-core/src/text-editor-sheet";
import type { TextEditorSheetVariant } from "@/text-editor-core/src/text-editor-sheet";
import { useTextEditor } from "@/text-editor-core/src/use-text-editor";

import "@/text-editor-core/src/text-editor.css";

export type TextEditorProps = {
  /** Document serialization: HTML (e.g. mail) or Markdown (e.g. notes). */
  format?: TextEditorContentFormat;
  /** Initial content in the configured `format`. */
  content?: string;
  editable?: boolean;
  placeholder?: string;
  /** `false` hides the bar; pass `groups` to show a subset. */
  formatBar?: boolean | TextEditorFormatBarConfig;
  /** @deprecated Use `formatBar={{ showPrint: false }}` instead. */
  showPrint?: boolean;
  sheetVariant?: TextEditorSheetVariant;
  /** Grow the letter sheet to fill a flex parent (e.g. mail compose). */
  sheetFill?: boolean;
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
  formatBar = true,
  showPrint,
  sheetVariant = "sheet",
  sheetFill = false,
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

  const formatBarConfig = (() => {
    if (formatBar === false) return null;
    const config: TextEditorFormatBarConfig = typeof formatBar === "object" ? { ...formatBar } : {};
    if (showPrint !== undefined) config.showPrint = showPrint;
    return resolveTextEditorFormatBarConfig(config);
  })();

  return (
    <div
      className={cn(
        "text-editor flex w-full flex-col",
        sheetFill ? "h-full min-h-0 flex-1" : "h-full w-full",
        className,
      )}
    >
      {formatBarConfig ? (
        <TextEditorFormatBar
          editor={editor}
          groups={[...formatBarConfig.groups]}
          showPrint={formatBarConfig.showPrint}
          className={formatBarConfig.className}
        />
      ) : null}
      <TextEditorSheet
        editor={editor}
        variant={sheetVariant}
        fill={sheetFill}
        className="min-h-0 flex-1"
      />
    </div>
  );
}

export type { Editor };
