import { Editor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "tiptap-markdown";
import type { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { setTextEditorContent } from "@/text-editor-core/src/text-editor-content";
import { LaatsteTestCollabEditor } from "@/text-editor-core/laatste-test-collab/laatste-test-collab-editor";

const SEED_ORIGIN = "seed";

export type LaatsteTestCollabEditorSurfaceProps = {
  ydoc: Y.Doc;
  awareness: Awareness;
  user: { name: string; color: string };
  onMarkdownChange: (getMarkdown: () => string) => void;
};

/** @deprecated Use LaatsteTestCollabEditor — kept for thin embeds */
export function LaatsteTestCollabEditorSurface(props: LaatsteTestCollabEditorSurfaceProps) {
  return (
    <LaatsteTestCollabEditor {...props} sheetFill formatBar={false} className="min-h-[70vh]" />
  );
}

/** Seed helper (yjs-demos#16) — used before mounting the collab editor surface */
export function applyMarkdownSeedToYDoc(target: Y.Doc, markdown: string): void {
  const temp = new Y.Doc();
  const tempEditor = new Editor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: temp }),
      Markdown,
    ],
  });
  setTextEditorContent(tempEditor, markdown, "markdown");
  Y.applyUpdate(target, Y.encodeStateAsUpdate(temp), SEED_ORIGIN);
  tempEditor.destroy();
}
