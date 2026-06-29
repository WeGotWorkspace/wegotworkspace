/** @vitest-environment jsdom */
import { act, cleanup, renderHook } from "@testing-library/react";
import { Editor } from "@tiptap/react";
import { Awareness } from "y-protocols/awareness";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import * as Y from "yjs";
import "@/text-editor-core/src/text-editor-track-changes-augmentation";
import { applyContentSeedToYDoc } from "./docs-collab-editor-surface";
import { getDocsSuggestionThreadsMap } from "./docs-suggestions-map";
import { createCollaborativeTextEditorExtensions } from "@/text-editor-core/src/text-editor-extensions";
import {
  getDocsTrackChangeGroups,
  trackChangesAuthorIdFromName,
} from "@/text-editor-core/src/text-editor-track-changes";
import { useDocsSuggestions } from "./use-docs-suggestions";

beforeEach(() => {
  document.elementFromPoint = () => null;
  document.elementsFromPoint = () => [];
});

afterEach(() => {
  cleanup();
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

function createCollabEditor(ydoc: Y.Doc, awareness: Awareness) {
  applyContentSeedToYDoc(ydoc, "Hello world", "markdown");
  const user = {
    id: trackChangesAuthorIdFromName("Alex"),
    name: "Alex",
    color: "#2563eb",
  };
  const element = document.createElement("div");
  document.body.appendChild(element);
  const editor = new Editor({
    element,
    extensions: createCollaborativeTextEditorExtensions({
      document: ydoc,
      awareness,
      user,
      format: "markdown",
    }),
  });
  editor.commands.setTextSelection({ from: 6, to: 6 });
  suggestInsertText(editor, "!");
  return editor;
}

describe("useDocsSuggestions", () => {
  it("does not prune persisted threads before editor track changes are readable", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    getDocsSuggestionThreadsMap(ydoc).set("orphan-key", {
      messages: [],
      reactions: [{ emoji: "👍", userIds: ["u-1"] }],
    });

    const editor = createCollabEditor(ydoc, awareness);
    const changeId = getDocsTrackChangeGroups(editor)[0]?.changeId;
    expect(changeId).toBeTruthy();

    getDocsSuggestionThreadsMap(ydoc).set(changeId!, {
      messages: [],
      reactions: [{ emoji: "👀", userIds: ["u-1"] }],
    });

    renderHook(() =>
      useDocsSuggestions(editor, {
        ydoc,
        currentUser: { id: "u-1", name: "Alex" },
      }),
    );

    expect(getDocsSuggestionThreadsMap(ydoc).has(changeId!)).toBe(true);
    expect(getDocsSuggestionThreadsMap(ydoc).get(changeId!)).toMatchObject({
      reactions: [{ emoji: "👀", userIds: ["u-1"] }],
    });
    expect(getDocsSuggestionThreadsMap(ydoc).has("orphan-key")).toBe(false);

    editor.destroy();
  });

  it("persists reactions through toggleReaction", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const editor = createCollabEditor(ydoc, awareness);
    const changeId = getDocsTrackChangeGroups(editor)[0]?.changeId;
    expect(changeId).toBeTruthy();

    const { result } = renderHook(() =>
      useDocsSuggestions(editor, {
        ydoc,
        currentUser: { id: "u-1", name: "Alex" },
      }),
    );

    act(() => {
      result.current.toggleReaction(changeId!, "👍");
    });

    expect(getDocsSuggestionThreadsMap(ydoc).get(changeId!)).toMatchObject({
      reactions: [{ emoji: "👍", userIds: ["u-1"] }],
    });
    expect(result.current.suggestions[0]?.reactions).toEqual([{ emoji: "👍", userIds: ["u-1"] }]);

    editor.destroy();
  });

  it("activates a suggestion for reply composer visibility", () => {
    const ydoc = new Y.Doc();
    const awareness = new Awareness(ydoc);
    const editor = createCollabEditor(ydoc, awareness);
    const changeId = getDocsTrackChangeGroups(editor)[0]?.changeId;
    expect(changeId).toBeTruthy();

    const { result } = renderHook(() =>
      useDocsSuggestions(editor, {
        ydoc,
        currentUser: { id: "u-1", name: "Alex" },
      }),
    );

    expect(result.current.activeChangeId).toBeNull();

    act(() => {
      result.current.selectSuggestion(changeId!);
    });

    expect(result.current.activeChangeId).toBe(changeId);

    editor.destroy();
  });
});
