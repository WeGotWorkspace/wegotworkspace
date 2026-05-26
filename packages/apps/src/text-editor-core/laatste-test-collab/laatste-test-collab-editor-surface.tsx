import { Editor } from "@tiptap/react";
import Collaboration from "@tiptap/extension-collaboration";
import StarterKit from "@tiptap/starter-kit";
import type { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import {
  setTextEditorContent,
  type TextEditorContentFormat,
} from "@/text-editor-core/src/text-editor-content";
import { createTextEditorExtensions } from "@/text-editor-core/src/text-editor-extensions";
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
export function applyContentSeedToYDoc(
  target: Y.Doc,
  content: string,
  format: TextEditorContentFormat = "markdown",
): void {
  const temp = new Y.Doc();
  const tempEditor = new Editor({
    extensions: [
      StarterKit.configure({ undoRedo: false }),
      Collaboration.configure({ document: temp }),
      ...createTextEditorExtensions({ format }).filter((ext) => ext.name !== "starterKit"),
    ],
    editorProps: {
      attributes: { class: "text-editor-prose focus:outline-none" },
    },
  });
  setTextEditorContent(tempEditor, content, format);
  Y.applyUpdate(target, Y.encodeStateAsUpdate(temp), SEED_ORIGIN);
  tempEditor.destroy();
}
