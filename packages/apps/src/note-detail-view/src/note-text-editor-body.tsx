import { useCallback } from "react";
import type { Editor } from "@tiptap/react";
import { cn } from "@/lib/utils";
import { getTextEditorContent } from "@/text-editor-core/src/text-editor-content";
import { TextEditorSheet } from "@/text-editor-core/src/text-editor-sheet";
import { useTextEditor } from "@/text-editor-core/src/use-text-editor";
import { DocsCollabEditor, useDocsCollab } from "@/text-editor-core/docs-collab";
import type { DocsCollabUrls } from "@/text-editor-core/docs-collab";
import type { DocsCollabWireOperations } from "@/text-editor-core/docs-collab/docs-collab-wire";

import "@/text-editor-core/src/text-editor.css";
import "@/note-detail-view/src/note-text-editor-body.css";

/**
 * Configures the body as a live + offline Yjs collab document (Docs #230 stack).
 * Room = the note's virtual path on the shared `wgw_files` tree.
 */
export type NoteCollabConfig = {
  userName: string;
  urls: DocsCollabUrls;
  wire?: DocsCollabWireOperations;
};

export type NoteTextEditorBodyProps = {
  /** Remount editor when the active note changes. */
  noteId: string;
  /** Remount the read-only/solo editor when remote content revision changes. */
  contentRevision?: string;
  initialMarkdown: string;
  readOnly?: boolean;
  /**
   * When provided and not read-only, the body is edited collaboratively via the
   * Docs Yjs stack (offline cache, deferred REST save, live mesh). Body changes
   * persist through the collab document — never through the Notes metadata API.
   */
  collab?: NoteCollabConfig;
  className?: string;
};

function NoteCollabBody({
  initialMarkdown,
  userName,
  urls,
  wire,
  className,
}: {
  initialMarkdown: string;
  userName: string;
  urls: DocsCollabUrls;
  wire?: DocsCollabWireOperations;
  className?: string;
}) {
  const { session, onMarkdownChange, registerMarkdownGetter } = useDocsCollab({
    userName,
    autoJoin: true,
    urls,
    wire,
    seedContent: initialMarkdown,
  });

  const handleEditorReady = useCallback(
    (editor: Editor | null) => {
      if (editor) registerMarkdownGetter(() => getTextEditorContent(editor, "markdown"));
    },
    [registerMarkdownGetter],
  );

  if (!session) {
    return <div className={cn("note-text-editor-body text-editor", className)} aria-busy="true" />;
  }

  return (
    <DocsCollabEditor
      ydoc={session.ydoc}
      awareness={session.awareness}
      user={session.user}
      format="markdown"
      formatBar={false}
      className={cn("note-text-editor-body", className)}
      onContentChange={onMarkdownChange}
      onEditorReady={handleEditorReady}
    />
  );
}

function NoteSoloBody({
  initialMarkdown,
  editable,
  className,
}: {
  initialMarkdown: string;
  editable: boolean;
  className?: string;
}) {
  const editor = useTextEditor({
    format: "markdown",
    content: initialMarkdown,
    editable,
    placeholder: "Press '/' for commands…",
  });

  return (
    <div className={cn("note-text-editor-body text-editor", className)}>
      <TextEditorSheet editor={editor} variant="sheet" />
    </div>
  );
}

/**
 * Markdown note body. Editable notes use the Docs Yjs collab editor (when a
 * {@link NoteCollabConfig} is supplied); read-only previews and Storybook use a
 * solo, non-persisting editor.
 */
export function NoteTextEditorBody({
  noteId,
  contentRevision = "",
  initialMarkdown,
  readOnly = false,
  collab,
  className,
}: NoteTextEditorBodyProps) {
  if (!readOnly && collab) {
    return (
      <NoteCollabBody
        // Room encodes note id + notebook + archive state: switching notes
        // remounts the session; metadata edits (new lastEdited) do not.
        key={collab.urls.room ?? noteId}
        initialMarkdown={initialMarkdown}
        userName={collab.userName}
        urls={collab.urls}
        wire={collab.wire}
        className={className}
      />
    );
  }

  return (
    <NoteSoloBody
      key={`${noteId}:${contentRevision}`}
      initialMarkdown={initialMarkdown}
      editable={!readOnly}
      className={className}
    />
  );
}
