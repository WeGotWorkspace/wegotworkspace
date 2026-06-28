import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import {
  COMMENT_DRAFT_ANCHOR_CLASS,
  CommentDraftAnchor,
  setCommentDraftAnchor,
} from "./text-editor-comment-draft-anchor";

function createEditor(content = "<p>Hello world</p>") {
  return new Editor({
    extensions: [StarterKit.configure({ undoRedo: false }), CommentDraftAnchor],
    content,
  });
}

describe("text-editor comment draft anchor", () => {
  it("adds a selection-like decoration for the draft anchor range", () => {
    const editor = createEditor();
    setCommentDraftAnchor(editor, { from: 7, to: 12 });

    const span = editor.view.dom.querySelector(`.${COMMENT_DRAFT_ANCHOR_CLASS}`);
    expect(span).not.toBeNull();
    expect(span?.textContent).toBe("world");
    editor.destroy();
  });

  it("clears the decoration when the draft anchor is removed", () => {
    const editor = createEditor();
    setCommentDraftAnchor(editor, { from: 7, to: 12 });
    setCommentDraftAnchor(editor, null);

    expect(editor.view.dom.querySelector(`.${COMMENT_DRAFT_ANCHOR_CLASS}`)).toBeNull();
    editor.destroy();
  });

  it("maps draft anchor positions through document edits", () => {
    const editor = createEditor("<p>Hello world</p>");
    setCommentDraftAnchor(editor, { from: 7, to: 12 });

    editor.commands.insertContentAt(1, "X");

    const span = editor.view.dom.querySelector(`.${COMMENT_DRAFT_ANCHOR_CLASS}`);
    expect(span?.textContent).toBe("world");
    editor.destroy();
  });
});
