import { useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { isChangeOrigin } from "@tiptap/extension-collaboration";
import { useEditor } from "@tiptap/react";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import { cn } from "@/lib/utils";
import {
  getTextEditorContent,
  type TextEditorContentFormat,
} from "@/text-editor-core/src/text-editor-content";
import {
  TextEditorFormatBar,
  type TextEditorFormatBarConfig,
  resolveTextEditorFormatBarConfig,
} from "@/text-editor-core/src/text-editor-format-bar";
import { createCollaborativeTextEditorExtensions } from "@/text-editor-core/src/text-editor-extensions";
import { TextEditorSheet } from "@/text-editor-core/src/text-editor-sheet";
import { TextEditorSource } from "@/text-editor-core/src/text-editor-source";
import { useTextEditorSourceSync } from "@/text-editor-core/src/use-text-editor-source-sync";

import "@/text-editor-core/src/text-editor.css";

export type DocsCollabEditorProps = {
  ydoc: Y.Doc;
  awareness: Awareness;
  user: { name: string; color: string };
  format?: TextEditorContentFormat;
  formatBar?: boolean | TextEditorFormatBarConfig;
  sheetFill?: boolean;
  viewSource?: boolean;
  className?: string;
  /** @deprecated Prefer `onContentChange`; kept for compatibility paths. */
  onMarkdownChange?: (getMarkdown: () => string) => void;
  onContentChange?: (getContent: () => string) => void;
  onEditorReady?: (editor: Editor | null) => void;
};

export function DocsCollabEditor({
  ydoc,
  awareness,
  user,
  format = "markdown",
  formatBar = true,
  sheetFill = false,
  viewSource = false,
  className,
  onMarkdownChange,
  onContentChange,
  onEditorReady,
}: DocsCollabEditorProps) {
  const effectiveOnContentChange = onContentChange ?? onMarkdownChange;
  const onContentChangeRef = useRef(effectiveOnContentChange);
  onContentChangeRef.current = effectiveOnContentChange;

  const editor = useEditor(
    {
      editable: true,
      enableContentCheck: false,
      autofocus: "end",
      immediatelyRender: false,
      extensions: createCollaborativeTextEditorExtensions({
        format,
        placeholder: "Press '/' for commands…",
        document: ydoc,
        awareness,
        user,
      }),
      editorProps: {
        attributes: { class: "text-editor-prose focus:outline-none" },
      },
      onUpdate: ({ transaction, editor: ed }) => {
        if (isChangeOrigin(transaction)) return;
        onContentChangeRef.current?.(() => getTextEditorContent(ed, format));
      },
      onSelectionUpdate: ({ editor: ed }) => {
        ed.commands.updateUser(user);
      },
    },
    [ydoc, awareness, format, user.color, user.name],
  );

  const { sourceValue, onSourceChange, onSourceFocus, onSourceBlur } = useTextEditorSourceSync({
    editor,
    format,
    viewSource,
    onUpdate: onContentChange
      ? ({ content }) => {
          onContentChange(() => content);
        }
      : undefined,
  });

  useEffect(() => {
    editor?.commands.updateUser(user);
  }, [editor, user]);

  useEffect(() => {
    onEditorReady?.(editor);
    return () => onEditorReady?.(null);
  }, [editor, onEditorReady]);

  const formatBarConfig = (() => {
    if (formatBar === false) return null;
    const config: TextEditorFormatBarConfig = typeof formatBar === "object" ? { ...formatBar } : {};
    config.showPrint ??= false;
    return resolveTextEditorFormatBarConfig(config);
  })();

  const formatBarElement = formatBarConfig ? (
    <TextEditorFormatBar
      editor={editor}
      groups={[...formatBarConfig.groups]}
      showPrint={formatBarConfig.showPrint}
      className={formatBarConfig.className}
    />
  ) : null;

  const sheetElement = (
    <TextEditorSheet
      editor={editor}
      variant="sheet"
      fill={sheetFill}
      slashMenu={format !== "text"}
      className="min-h-0 flex-1"
    />
  );

  const formatLabel = format === "markdown" ? "Markdown" : format === "text" ? "Text" : "HTML";

  return (
    <div
      className={cn(
        "text-editor flex w-full flex-col",
        sheetFill ? "h-full min-h-0 flex-1" : "h-full w-full",
        viewSource && "text-editor--view-source",
        className,
      )}
    >
      {viewSource ? (
        <div className="text-editor__body min-h-0 flex-1">
          <TextEditorSource
            value={sourceValue}
            onChange={onSourceChange}
            onFocus={onSourceFocus}
            onBlur={onSourceBlur}
            editable
            formatLabel={formatLabel}
            className="text-editor__source min-h-0"
          />
          <div className="text-editor__formatted flex min-h-0 flex-1 flex-col">
            {formatBarElement}
            {sheetElement}
          </div>
        </div>
      ) : (
        <>
          {formatBarElement}
          {sheetElement}
        </>
      )}
    </div>
  );
}
