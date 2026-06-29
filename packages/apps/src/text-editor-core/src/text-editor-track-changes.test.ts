/** @vitest-environment jsdom */
import { Editor } from "@tiptap/react";
import "@/text-editor-core/src/text-editor-track-changes-augmentation";
import { beforeEach, describe, expect, it } from "vitest";
import { Awareness } from "y-protocols/awareness";
import * as Y from "yjs";
import { getTrackedChanges } from "tiptap-track-changes";
import { applyContentSeedToYDoc } from "../docs-collab/docs-collab-editor-surface";
import { createCollaborativeTextEditorExtensions } from "./text-editor-extensions";
import {
  getAcceptedTextEditorContent,
  getTrackChangesMode,
  getTrackChangesPendingCount,
  trackChangesAuthorIdFromName,
} from "./text-editor-track-changes";

beforeEach(() => {
  document.elementFromPoint = () => null;
  document.elementsFromPoint = () => [];
});

function suggestInsertText(editor: Editor, text: string) {
  editor.commands.setSuggestMode();
  const view = editor.view;
  const { from, to } = view.state.selection;
  const handled = view.someProp("handleTextInput", (handler) =>
    (handler as (v: typeof view, f: number, t: number, s: string) => boolean)(view, from, to, text),
  );
  if (!handled) {
    const tr = editor.state.tr.insertText(text, from, to);
    tr.setMeta("uiEvent", "input");
    editor.view.dispatch(tr);
  }
}

function createCollabEditor(
  ydoc: Y.Doc,
  awareness: Awareness,
  user: { id: string; name: string; color: string },
  seedText: string | null = "Hello world",
) {
  if (seedText != null) {
    applyContentSeedToYDoc(ydoc, seedText, "markdown");
  }
  const element = document.createElement("div");
  document.body.appendChild(element);
  return new Editor({
    element,
    extensions: createCollaborativeTextEditorExtensions({
      document: ydoc,
      awareness,
      user,
      format: "markdown",
    }),
  });
}

describe("text editor track changes", () => {
  it("defaults to edit mode and toggles suggest mode", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const user = {
      id: trackChangesAuthorIdFromName("Alex"),
      name: "Alex",
      color: "#2563eb",
    };
    const editor = createCollabEditor(ydoc, awareness, user);

    expect(getTrackChangesMode(editor)).toBe("edit");
    editor.commands.setSuggestMode();
    expect(getTrackChangesMode(editor)).toBe("suggest");
    editor.commands.setEditMode();
    expect(getTrackChangesMode(editor)).toBe("edit");

    editor.destroy();
  });

  it("tracks insertions in suggest mode", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const user = {
      id: trackChangesAuthorIdFromName("Alex"),
      name: "Alex",
      color: "#2563eb",
    };
    const editor = createCollabEditor(ydoc, awareness, user);

    editor.commands.setTextSelection({ from: 13, to: 13 });
    suggestInsertText(editor, "!");

    expect(getTrackChangesPendingCount(editor)).toBeGreaterThan(0);
    expect(getAcceptedTextEditorContent(editor, "text")).toBe("Hello world");

    editor.destroy();
  });

  it("accepts and rejects suggestions at the cursor and in bulk", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const user = {
      id: trackChangesAuthorIdFromName("Alex"),
      name: "Alex",
      color: "#2563eb",
    };
    const editor = createCollabEditor(ydoc, awareness, user, "Hello");

    editor.commands.setTextSelection({ from: 6, to: 6 });
    suggestInsertText(editor, " world");
    const changeId = getTrackedChanges(editor)[0]?.changeId;
    expect(changeId).toBeTruthy();

    editor.commands.acceptChange(changeId!);
    expect(getTrackChangesPendingCount(editor)).toBe(0);
    expect(editor.getText()).toContain("Hello world");

    editor.commands.setTextSelection({ from: 11, to: 11 });
    suggestInsertText(editor, "!");
    const rejectId = getTrackedChanges(editor)[0]?.changeId;
    editor.commands.rejectChange(rejectId!);
    expect(getTrackChangesPendingCount(editor)).toBe(0);
    expect(editor.getText()).not.toContain("Hello world!");

    editor.commands.setTextSelection({ from: 6, to: 6 });
    suggestInsertText(editor, " again");
    editor.commands.acceptAll();
    expect(getTrackChangesPendingCount(editor)).toBe(0);
    expect(editor.getText()).toContain("Hello again");

    editor.destroy();
  });

  it("accepts a suggestion and exports accepted markdown", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const user = {
      id: trackChangesAuthorIdFromName("Alex"),
      name: "Alex",
      color: "#2563eb",
    };
    const editor = createCollabEditor(ydoc, awareness, user);

    editor.commands.setTextSelection({ from: 13, to: 13 });
    suggestInsertText(editor, "!");

    expect(getTrackChangesPendingCount(editor)).toBeGreaterThan(0);
    expect(getAcceptedTextEditorContent(editor, "markdown")).not.toContain("!");

    editor.commands.acceptAll();
    expect(getTrackChangesPendingCount(editor)).toBe(0);
    expect(getAcceptedTextEditorContent(editor, "text")).toContain("Hello world!");

    editor.destroy();
  });

  it("syncs pending suggestions between two editors on one Y.Doc", () => {
    const ydoc = new Y.Doc();
    const awareness1 = new Awareness(ydoc);
    const awareness2 = new Awareness(ydoc);
    const user1 = {
      id: trackChangesAuthorIdFromName("Alex"),
      name: "Alex",
      color: "#2563eb",
    };
    const user2 = {
      id: trackChangesAuthorIdFromName("Bob"),
      name: "Bob",
      color: "#dc2626",
    };

    const editor1 = createCollabEditor(ydoc, awareness1, user1);
    const editor2 = createCollabEditor(ydoc, awareness2, user2, null);

    editor1.commands.setTextSelection({ from: 13, to: 13 });
    suggestInsertText(editor1, "!");

    expect(getTrackChangesPendingCount(editor2)).toBeGreaterThan(0);
    expect(getAcceptedTextEditorContent(editor2, "text")).toBe("Hello world");

    editor1.destroy();
    editor2.destroy();
  });
});
