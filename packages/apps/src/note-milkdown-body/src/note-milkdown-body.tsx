import { useRef } from "react";
import { Crepe, CrepeFeature } from "@milkdown/crepe";
import { Milkdown, MilkdownProvider, useEditor } from "@milkdown/react";
import { replaceAll } from "@milkdown/utils";

import "@milkdown/crepe/theme/frame.css";
/** Toolbar, ProseMirror chrome, CodeMirror — required; `frame.css` is only Crepe theme variables */
import "@milkdown/crepe/theme/common/style.css";

import { cn } from "@/lib/utils";
import { noteMilkdownCrepeFeatureConfigs } from "@/note-milkdown-body/src/note-milkdown-crepe-feature-config";
import { milkdownUnderlinePlugins } from "@/note-milkdown-body/src/note-underline-mark";

import "@/note-milkdown-body/src/note-milkdown-body.css";

export type NoteMilkdownBodyProps = {
  /** Remount Milkdown when the active note changes. */
  noteId: string;
  /** Markdown source for initial editor value (joined paragraphs from `Note.body`). */
  initialMarkdown: string;
  /** When true, editor is display-only via Crepe readonly mode. */
  readOnly?: boolean;
  onMarkdownChange?: (markdown: string) => void;
  className?: string;
};

function CrepeNoteEditorInner({
  noteId,
  /** Initial markdown when Crepe instantiates (do not add to useEditor deps; it updates every keystroke from parent state). */
  defaultMarkdown,
  readOnly,
  onMarkdownChange,
}: {
  noteId: string;
  defaultMarkdown: string;
  readOnly: boolean;
  onMarkdownChange?: (markdown: string) => void;
}) {
  const readOnlyRef = useRef(readOnly);
  readOnlyRef.current = readOnly;

  const onChangeRef = useRef(onMarkdownChange);
  onChangeRef.current = onMarkdownChange;

  const noteIdRef = useRef(noteId);
  noteIdRef.current = noteId;

  const markdownRef = useRef(defaultMarkdown);
  markdownRef.current = defaultMarkdown;

  useEditor(
    (root) => {
      const editorNoteId = noteId;
      const initialMarkdown = markdownRef.current;

      const crepe = new Crepe({
        root,
        defaultValue: initialMarkdown,
        features: {
          [CrepeFeature.Latex]: false,
          [CrepeFeature.AI]: false,
          [CrepeFeature.TopBar]: false,
        },
        featureConfigs: noteMilkdownCrepeFeatureConfigs(),
      });
      crepe.editor.use(milkdownUnderlinePlugins);
      crepe.on((listener) => {
        listener.mounted((ctx) => {
          if (editorNoteId !== noteIdRef.current) return;
          crepe.editor.action(replaceAll(initialMarkdown, true));
        });
        listener.markdownUpdated((_ctx, markdown, prevMarkdown) => {
          if (editorNoteId !== noteIdRef.current) return;
          if (readOnlyRef.current) return;
          const emit = onChangeRef.current;
          if (!emit) return;
          if (markdown === prevMarkdown) return;
          emit(markdown);
        });
      });
      if (readOnly) crepe.setReadonly(true);
      return crepe;
    },
    // Only `noteId` + readOnly — recreating Crepe whenever `initialMarkdown` changes would run after each `onMarkdownChange` and drop the caret.
    [noteId, readOnly],
  );

  return <Milkdown />;
}

/**
 * Milkdown Crepe block editor with toolbar, lists, links, tables, and code fences.
 */
export function NoteMilkdownBody({
  noteId,
  initialMarkdown,
  readOnly = false,
  onMarkdownChange,
  className,
}: NoteMilkdownBodyProps) {
  const canEdit = !readOnly && Boolean(onMarkdownChange);

  return (
    <div
      className={cn("note-milkdown-body", className)}
      data-milkdown-readonly={readOnly ? "true" : undefined}
    >
      <MilkdownProvider key={noteId}>
        <CrepeNoteEditorInner
          noteId={noteId}
          defaultMarkdown={initialMarkdown}
          readOnly={readOnly || !canEdit}
          onMarkdownChange={canEdit ? onMarkdownChange : undefined}
        />
      </MilkdownProvider>
    </div>
  );
}
