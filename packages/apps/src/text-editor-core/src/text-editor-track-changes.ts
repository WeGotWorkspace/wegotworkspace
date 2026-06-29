import { Editor } from "@tiptap/react";
import "@/text-editor-core/src/text-editor-track-changes-augmentation";
import {
  TrackChangesExtension,
  getBaseText,
  getPendingChangeCount,
  getTrackedChanges,
  type ChangeAuthor,
  type TrackChangesMode,
} from "tiptap-track-changes";
import {
  getTextEditorContent,
  type TextEditorContentFormat,
} from "@/text-editor-core/src/text-editor-content";
import { createTextEditorExtensions } from "@/text-editor-core/src/text-editor-extensions";

export type TextEditorCollabUser = {
  id: string;
  name: string;
  color: string;
};

/** Stable author id derived from a display name (matches collab session coloring). */
export function trackChangesAuthorIdFromName(name: string): string {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i += 1) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `tc_${(hash >>> 0).toString(16)}`;
}

export function toTrackChangesAuthor(user: {
  id?: string;
  name: string;
  color: string;
}): ChangeAuthor {
  return {
    id: user.id ?? trackChangesAuthorIdFromName(user.name),
    name: user.name,
    color: user.color,
  };
}

export function editorHasTrackChanges(editor: Editor | null): editor is Editor {
  return Boolean(editor?.extensionManager.extensions.some((ext) => ext.name === "trackChanges"));
}

export function getTrackChangesMode(editor: Editor | null): TrackChangesMode {
  if (!editorHasTrackChanges(editor)) return "edit";
  return editor.storage.trackChanges.mode;
}

export function getTrackChangesPendingCount(editor: Editor | null): number {
  if (!editorHasTrackChanges(editor)) return 0;
  return getPendingChangeCount(editor);
}

/** changeId for a tracked change overlapping the current selection, if any. */
export function trackChangeIdAtSelection(editor: Editor | null): string | null {
  if (!editorHasTrackChanges(editor)) return null;
  const { from, to } = editor.state.selection;
  const anchor = from === to ? from : Math.floor((from + to) / 2);
  const hit = getTrackedChanges(editor).find(
    (change) => anchor >= change.from && anchor <= change.to,
  );
  return hit?.changeId ?? null;
}

export function editorHasPendingTrackChanges(editor: Editor): boolean {
  return editorHasTrackChanges(editor) && getPendingChangeCount(editor) > 0;
}

/** Serialize publishable content — pending suggestions excluded (see `getBaseText`). */
export function getAcceptedTextEditorContent(
  editor: Editor,
  format: TextEditorContentFormat,
): string {
  if (!editorHasPendingTrackChanges(editor)) {
    return getTextEditorContent(editor, format);
  }
  if (format === "text") {
    return getBaseText(editor);
  }

  const temp = new Editor({
    extensions: [
      ...createTextEditorExtensions({ format }),
      TrackChangesExtension.configure({
        author: toTrackChangesAuthor({ name: "export", color: "#6b7280" }),
      }),
    ],
    content: editor.getJSON(),
  });
  temp.commands.rejectAll();
  const accepted = getTextEditorContent(temp, format);
  temp.destroy();
  return accepted;
}
