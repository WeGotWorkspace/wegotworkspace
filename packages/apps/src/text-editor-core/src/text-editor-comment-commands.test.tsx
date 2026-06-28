import { Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it } from "vitest";
import {
  CommentMark,
  findAnchorOccurrenceAtRange,
  findAnchorTextRange,
  findCommentMarkIdInSelection,
  getCommentMarkIdFromTarget,
  readSelectedAnchorText,
  setCommentActiveId,
  syncPersistedCommentMarks,
} from "./text-editor-comment-commands";

function createCommentEditor(content = "<p>Hello commented world</p>") {
  return new Editor({
    extensions: [StarterKit.configure({ undoRedo: false }), CommentMark],
    content,
  });
}

describe("text-editor comment commands", () => {
  it("applies comment mark to the current selection", () => {
    const editor = createCommentEditor("<p>Hello world</p>");
    editor.commands.setTextSelection({ from: 7, to: 12 });

    expect(editor.commands.setComment({ id: "c-1" })).toBe(true);
    expect(editor.getHTML()).toContain('data-comment-id="c-1"');
    editor.destroy();
  });

  it("removes comment marks by id", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-1" class="comment-mark">world</span></p>',
    );

    expect(editor.commands.unsetComment("c-1")).toBe(true);
    expect(editor.getHTML()).not.toContain("data-comment-id");
    editor.destroy();
  });

  it("selects a comment mark and toggles active styling", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-1" class="comment-mark">world</span>!</p>',
    );

    expect(editor.commands.selectComment("c-1")).toBe(true);
    const active = editor.view.dom.querySelector(".comment-mark--active");
    expect(active?.getAttribute("data-comment-id")).toBe("c-1");
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.from).toBe(12);

    setCommentActiveId(editor, null);
    expect(editor.view.dom.querySelector(".comment-mark--active")).toBeNull();
    editor.destroy();
  });

  it("places caret at click position within the mark", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-1" class="comment-mark">world</span>!</p>',
    );

    expect(editor.commands.selectComment("c-1", { caretPos: 9 })).toBe(true);
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.from).toBe(9);
    expect(findCommentMarkIdInSelection(editor, { allowedIds: new Set(["c-1"]) })).toBe("c-1");
    expect(editor.view.dom.querySelector(".comment-mark--active")).not.toBeNull();
    editor.destroy();
  });

  it("preserves selection when requested", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-1" class="comment-mark">world</span>!</p>',
    );
    editor.commands.setTextSelection({ from: 8, to: 11 });

    expect(editor.commands.selectComment("c-1", { preserveSelection: true })).toBe(true);
    expect(editor.state.selection.from).toBe(8);
    expect(editor.state.selection.to).toBe(11);
    expect(editor.view.dom.querySelector(".comment-mark--active")).not.toBeNull();
    editor.destroy();
  });

  it("places caret at mark start when requested", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-1" class="comment-mark">world</span>!</p>',
    );

    expect(editor.commands.selectComment("c-1", { caretAt: "start" })).toBe(true);
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.from).toBe(7);
    expect(editor.view.dom.querySelector(".comment-mark--active")).not.toBeNull();
    editor.destroy();
  });

  it("moves active styling when switching between two comment marks", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-1" class="comment-mark">world</span> <span data-comment-id="c-2" class="comment-mark">there</span></p>',
    );

    expect(editor.commands.selectComment("c-1")).toBe(true);
    expect(
      editor.view.dom.querySelector('.comment-mark--active[data-comment-id="c-1"]'),
    ).not.toBeNull();
    expect(
      editor.view.dom.querySelector('.comment-mark--active[data-comment-id="c-2"]'),
    ).toBeNull();

    expect(editor.commands.selectComment("c-2")).toBe(true);
    expect(
      editor.view.dom.querySelector('.comment-mark--active[data-comment-id="c-1"]'),
    ).toBeNull();
    expect(
      editor.view.dom.querySelector('.comment-mark--active[data-comment-id="c-2"]'),
    ).not.toBeNull();

    expect(editor.commands.selectComment("c-1")).toBe(true);
    expect(
      editor.view.dom.querySelector('.comment-mark--active[data-comment-id="c-1"]'),
    ).not.toBeNull();
    expect(
      editor.view.dom.querySelector('.comment-mark--active[data-comment-id="c-2"]'),
    ).toBeNull();
    editor.destroy();
  });

  it("re-applies active styling after mark DOM is rebuilt by a transaction", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-1" class="comment-mark">world</span> <span data-comment-id="c-2" class="comment-mark">there</span></p>',
    );

    expect(editor.commands.selectComment("c-1")).toBe(true);
    expect(editor.commands.selectComment("c-2")).toBe(true);

    editor.view.dom.querySelectorAll(".comment-mark--active").forEach((node) => {
      node.classList.remove("comment-mark--active");
    });
    expect(editor.view.dom.querySelector(".comment-mark--active")).toBeNull();

    editor.commands.insertContent("!");
    expect(
      editor.view.dom.querySelector('.comment-mark--active[data-comment-id="c-2"]'),
    ).not.toBeNull();
    expect(
      editor.view.dom.querySelector('.comment-mark--active[data-comment-id="c-1"]'),
    ).toBeNull();
    editor.destroy();
  });

  it("reads anchor text from a non-empty selection", () => {
    const editor = createCommentEditor("<p>Hello world</p>");
    editor.commands.setTextSelection({ from: 7, to: 12 });
    expect(readSelectedAnchorText(editor)).toBe("world");
    editor.destroy();
  });

  it("reads comment id from click targets", () => {
    const el = document.createElement("span");
    el.setAttribute("data-comment-id", "c-9");
    expect(getCommentMarkIdFromTarget(el)).toBe("c-9");
  });

  it("finds anchor text ranges and restores missing comment marks", () => {
    const editor = createCommentEditor("<p>Hello world</p>");
    const range = findAnchorTextRange(editor.state.doc, "world");
    expect(range).toEqual({ from: 7, to: 12 });

    expect(
      syncPersistedCommentMarks(editor, [
        {
          id: "c-1",
          anchorText: "world",
          resolved: false,
          messages: [{ id: "m-1" }],
        },
      ]),
    ).toBe(true);
    expect(editor.getHTML()).toContain('data-comment-id="c-1"');
    editor.destroy();
  });

  it("finds duplicate anchor text by occurrence index", () => {
    const editor = createCommentEditor("<p>repeat repeat repeat</p>");
    expect(findAnchorTextRange(editor.state.doc, "repeat", 0)).toEqual({ from: 1, to: 7 });
    expect(findAnchorTextRange(editor.state.doc, "repeat", 1)).toEqual({ from: 8, to: 14 });
    expect(findAnchorTextRange(editor.state.doc, "repeat", 2)).toEqual({ from: 15, to: 21 });
    editor.destroy();
  });

  it("derives occurrence index from the selected range", () => {
    const editor = createCommentEditor("<p>repeat repeat repeat</p>");
    expect(findAnchorOccurrenceAtRange(editor.state.doc, "repeat", 8, 14)).toBe(1);
    editor.destroy();
  });

  it("restores missing marks on the correct duplicate occurrence", () => {
    const editor = createCommentEditor("<p>repeat repeat repeat</p>");

    expect(
      syncPersistedCommentMarks(editor, [
        {
          id: "c-second",
          anchorText: "repeat",
          anchorFrom: 8,
          anchorTo: 14,
          anchorOccurrence: 1,
          resolved: false,
          messages: [{ id: "m-1" }],
        },
      ]),
    ).toBe(true);

    editor.commands.setTextSelection({ from: 8, to: 14 });
    expect(editor.getHTML()).toContain('data-comment-id="c-second"');
    editor.destroy();
  });

  it("does not find comment mark at collapsed caret after mark end (inclusive: false)", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-1" class="comment-mark">world</span>!</p>',
    );

    editor.commands.selectComment("c-1");
    expect(editor.state.selection.empty).toBe(true);
    expect(editor.state.selection.from).toBe(12);
    expect(findCommentMarkIdInSelection(editor, { allowedIds: new Set(["c-1"]) })).toBeNull();
    expect(editor.view.dom.querySelector(".comment-mark--active")).not.toBeNull();
    editor.destroy();
  });

  it("finds open comment marks in the current selection", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-1" class="comment-mark">world</span>!</p>',
    );
    editor.commands.setTextSelection({ from: 7, to: 12 });

    expect(findCommentMarkIdInSelection(editor, { allowedIds: new Set(["c-1"]) })).toBe("c-1");
    expect(findCommentMarkIdInSelection(editor, { allowedIds: new Set(["c-2"]) })).toBeNull();
    editor.destroy();
  });

  it("removes orphaned comment marks with no open thread", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-orphan" class="comment-mark">world</span></p>',
    );

    expect(
      syncPersistedCommentMarks(editor, [
        {
          id: "c-open",
          anchorText: "Hello",
          resolved: false,
          messages: [{ id: "m-1" }],
        },
      ]),
    ).toBe(true);

    expect(editor.getHTML()).not.toContain('data-comment-id="c-orphan"');
    editor.destroy();
  });

  it("removes marks for resolved and empty threads", () => {
    const editor = createCommentEditor(
      '<p><span data-comment-id="c-resolved" class="comment-mark">One</span> <span data-comment-id="c-empty" class="comment-mark">Two</span></p>',
    );

    expect(
      syncPersistedCommentMarks(editor, [
        {
          id: "c-resolved",
          anchorText: "One",
          resolved: true,
          messages: [{ id: "m-1" }],
        },
        {
          id: "c-empty",
          anchorText: "Two",
          resolved: false,
          messages: [],
        },
      ]),
    ).toBe(true);

    expect(editor.getHTML()).not.toContain("data-comment-id");
    editor.destroy();
  });

  it("removes marks for in-progress draft threads", () => {
    const editor = createCommentEditor(
      '<p>Hello <span data-comment-id="c-draft" class="comment-mark">world</span></p>',
    );

    expect(syncPersistedCommentMarks(editor, [])).toBe(true);
    expect(editor.getHTML()).not.toContain("data-comment-id");
    editor.destroy();
  });
});
