import { useEffect } from "react";
import type { Editor } from "@tiptap/react";
import Collaboration, { isChangeOrigin } from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Placeholder from "@tiptap/extension-placeholder";
import StarterKit from "@tiptap/starter-kit";
import { useEditor } from "@tiptap/react";
import { Markdown } from "tiptap-markdown";
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
import { TextEditorSheet } from "@/text-editor-core/src/text-editor-sheet";
import { TextEditorSource } from "@/text-editor-core/src/text-editor-source";
import { useTextEditorSourceSync } from "@/text-editor-core/src/use-text-editor-source-sync";

export type LaatsteTestCollabEditorProps = {
  ydoc: Y.Doc;
  awareness: Awareness;
  user: { name: string; color: string };
  formatBar?: boolean | TextEditorFormatBarConfig;
  sheetFill?: boolean;
  viewSource?: boolean;
  className?: string;
  onMarkdownChange?: (getMarkdown: () => string) => void;
  onEditorReady?: (editor: Editor | null) => void;
};

export function LaatsteTestCollabEditor({
  ydoc,
  awareness,
  user,
  formatBar = true,
  sheetFill = false,
  viewSource = false,
  className,
  onMarkdownChange,
  onEditorReady,
}: LaatsteTestCollabEditorProps) {
  const editor = useEditor(
    {
      editable: true,
      enableContentCheck: false,
      autofocus: "end",
      extensions: [
        StarterKit.configure({ undoRedo: false }),
        Collaboration.configure({ document: ydoc }),
        CollaborationCaret.configure({
          provider: { awareness },
          user,
        }),
        Markdown,
        Placeholder.configure({
          placeholder: "Press '/' for commands…",
        }),
      ],
      onUpdate: ({ transaction, editor: ed }) => {
        if (isChangeOrigin(transaction)) return;
        onMarkdownChange?.(() => getTextEditorContent(ed, "markdown"));
      },
      onSelectionUpdate: ({ editor: ed }) => {
        ed.commands.updateUser(user);
      },
    },
    [ydoc, awareness, user.color, user.name, onMarkdownChange],
  );

  const format: TextEditorContentFormat = "markdown";

  const { sourceValue, onSourceChange, onSourceFocus, onSourceBlur } = useTextEditorSourceSync({
    editor,
    format,
    viewSource,
    onUpdate: onMarkdownChange
      ? ({ content }) => {
          onMarkdownChange(() => content);
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
      slashMenu
      className="min-h-0 flex-1"
    />
  );

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
            formatLabel="Markdown"
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
