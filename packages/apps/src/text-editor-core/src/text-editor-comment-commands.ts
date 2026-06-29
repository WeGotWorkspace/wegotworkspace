import { Mark, mergeAttributes } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import type { CommandProps } from "@tiptap/core";
import type { MarkType } from "@tiptap/pm/model";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { trackChangesPluginKey } from "tiptap-track-changes";

const COMMENT_MARK_CLASS = "comment-mark";
const COMMENT_MARK_ACTIVE_CLASS = "comment-mark--active";

function bypassTrackChangesForCommentTransaction(tr: Editor["state"]["tr"]): typeof tr {
  tr.setMeta(trackChangesPluginKey, { handled: true });
  return tr;
}

export const commentActiveIdPluginKey = new PluginKey<string | null>("commentActiveId");

function syncCommentActiveClasses(view: EditorView, activeId: string | null): void {
  view.dom.querySelectorAll("[data-comment-id]").forEach((node) => {
    const el = node as HTMLElement;
    if (!el.classList.contains(COMMENT_MARK_CLASS)) {
      el.classList.add(COMMENT_MARK_CLASS);
    }
    el.classList.toggle(
      COMMENT_MARK_ACTIVE_CLASS,
      activeId != null && el.getAttribute("data-comment-id") === activeId,
    );
  });
}

function createCommentActiveIdPlugin(): Plugin<string | null> {
  return new Plugin<string | null>({
    key: commentActiveIdPluginKey,
    state: {
      init: () => null,
      apply(tr, activeId) {
        const meta = tr.getMeta(commentActiveIdPluginKey);
        if (meta !== undefined) return meta as string | null;
        return activeId;
      },
    },
    view(_view) {
      return {
        update(updatedView) {
          syncCommentActiveClasses(
            updatedView,
            commentActiveIdPluginKey.getState(updatedView.state) ?? null,
          );
        },
      };
    },
  });
}

export type SelectCommentOptions = {
  /** Collapsed caret position, clamped to the mark range when provided. */
  caretPos?: number;
  /** When set without caretPos, place caret at mark start or end. Defaults to end. */
  caretAt?: "start" | "end";
  /** Apply active styling and scroll only — do not move the editor selection. */
  preserveSelection?: boolean;
};

export const CommentMark = Mark.create({
  name: "comment",
  inclusive: false,
  addProseMirrorPlugins() {
    return [createCommentActiveIdPlugin()];
  },
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-comment-id"),
        renderHTML: (attrs) => (attrs.id ? { "data-comment-id": attrs.id } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-comment-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: COMMENT_MARK_CLASS }), 0];
  },
  addCommands() {
    return {
      setComment:
        (attributes: { id: string }) =>
        ({ state, dispatch }: CommandProps) => {
          const markType = state.schema.marks[this.name];
          if (!markType) return false;

          const { from, to, empty } = state.selection;
          if (empty) return false;

          const tr = bypassTrackChangesForCommentTransaction(
            state.tr.addMark(from, to, markType.create(attributes)),
          );
          if (dispatch) dispatch(tr);
          return true;
        },
      unsetComment:
        (id: string) =>
        ({ state, dispatch }: CommandProps) => {
          const markType = state.schema.marks[this.name];
          if (!markType) return false;

          const { tr, doc } = state;
          let modified = false;

          doc.descendants((node: ProseMirrorNode, pos: number) => {
            if (!node.isText) return;
            for (const mark of node.marks) {
              if (mark.type === markType && mark.attrs.id === id) {
                tr.removeMark(pos, pos + node.nodeSize, mark);
                modified = true;
              }
            }
          });

          if (modified) {
            bypassTrackChangesForCommentTransaction(tr);
            if (dispatch) dispatch(tr);
          }
          return modified;
        },
      selectComment:
        (id: string, options?: SelectCommentOptions) =>
        ({ editor, chain }: CommandProps) => {
          const range = findCommentMarkRange(editor.state.doc, id);
          scrollCommentMarkIntoView(editor, id);

          if (options?.preserveSelection) {
            applyCommentActiveId(editor, id);
            return chain().focus().run();
          }

          if (range == null) {
            const fallbackPos = findCommentMarkPos(editor.state.doc, id);
            if (fallbackPos == null) {
              applyCommentActiveId(editor, id);
              return false;
            }
            const ok = chain().focus().setTextSelection(fallbackPos).run();
            applyCommentActiveId(editor, id);
            return ok;
          }

          const caretPos = resolveSelectCommentCaretPos(range, options);
          const ok = chain().focus().setTextSelection(caretPos).run();
          applyCommentActiveId(editor, id);
          return ok;
        },
    };
  },
});

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    comment: {
      setComment: (attributes: { id: string }) => ReturnType;
      unsetComment: (id: string) => ReturnType;
      selectComment: (id: string, options?: SelectCommentOptions) => ReturnType;
    };
  }
}

function findCommentMarkPos(doc: Editor["state"]["doc"], id: string): number | null {
  let found: number | null = null;
  doc.descendants((node, pos) => {
    if (found != null) return false;
    if (!node.isText) return;
    const hasMark = node.marks.some((mark) => mark.type.name === "comment" && mark.attrs.id === id);
    if (hasMark) {
      found = pos;
      return false;
    }
  });
  return found;
}

export function getCommentMarkIdFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const el = target.closest("[data-comment-id]");
  if (!el) return null;
  return el.getAttribute("data-comment-id");
}

export function escapeCommentIdForSelector(id: string): string {
  if (typeof CSS !== "undefined" && "escape" in CSS) {
    return CSS.escape(id);
  }
  return id.replace(/["\\]/g, "\\$&");
}

export function scrollCommentMarkIntoView(editor: Editor, id: string): void {
  const root = editor.view.dom;
  const el = root.querySelector(`[data-comment-id="${escapeCommentIdForSelector(id)}"]`);
  if (el && "scrollIntoView" in el && typeof el.scrollIntoView === "function") {
    el.scrollIntoView({ block: "center", behavior: "smooth" });
  }
}

export function setCommentActiveId(editor: Editor | null, activeId: string | null): void {
  if (!editor || editor.isDestroyed) return;

  const current = commentActiveIdPluginKey.getState(editor.state) ?? null;
  if (current === activeId) {
    syncCommentActiveClasses(editor.view, activeId);
    return;
  }

  const tr = editor.state.tr.setMeta(commentActiveIdPluginKey, activeId);
  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}

/** Apply active styling immediately; plugin view.update re-syncs after DOM rebuilds. */
export function applyCommentActiveId(editor: Editor, activeId: string | null): void {
  setCommentActiveId(editor, activeId);
}

export function readSelectedAnchorText(editor: Editor): string | null {
  const { from, to, empty } = editor.state.selection;
  if (empty) return null;
  const text = editor.state.doc.textBetween(from, to, " ").trim();
  return text || null;
}

export function findCommentMarkIdInSelection(
  editor: Editor,
  options: {
    allowedIds?: Set<string>;
    excludeId?: string | null;
  } = {},
): string | null {
  const markType = editor.state.schema.marks.comment;
  if (!markType) return null;

  const { from, to } = editor.state.selection;

  const matches = (id: unknown): id is string => {
    if (typeof id !== "string" || !id) return false;
    if (options.excludeId && id === options.excludeId) return false;
    if (options.allowedIds && !options.allowedIds.has(id)) return false;
    return true;
  };

  if (from === to) {
    const $pos = editor.state.doc.resolve(from);
    for (const mark of $pos.marks()) {
      if (mark.type === markType && matches(mark.attrs.id)) {
        return mark.attrs.id;
      }
    }
    return null;
  }

  let foundId: string | null = null;
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (foundId || !node.isText) return;
    for (const mark of node.marks) {
      if (mark.type === markType && matches(mark.attrs.id)) {
        foundId = mark.attrs.id;
      }
    }
  });
  return foundId;
}

type DocTextChunk = {
  pos: number;
  text: string;
};

function collectDocTextChunks(doc: ProseMirrorNode): DocTextChunk[] {
  const chunks: DocTextChunk[] = [];
  doc.descendants((node, pos) => {
    if (node.isText && node.text) {
      chunks.push({ pos, text: node.text });
    }
  });
  return chunks;
}

function chunkOffsetToPos(chunks: DocTextChunk[], offset: number): number | null {
  let remaining = offset;
  for (const chunk of chunks) {
    if (remaining <= chunk.text.length) {
      return chunk.pos + remaining;
    }
    remaining -= chunk.text.length;
  }
  return null;
}

function posToFlatOffset(chunks: DocTextChunk[], pos: number): number | null {
  let offset = 0;
  for (const chunk of chunks) {
    const chunkEnd = chunk.pos + chunk.text.length;
    if (pos <= chunkEnd) {
      return offset + (pos - chunk.pos);
    }
    offset += chunk.text.length;
  }
  return null;
}

/** Map flat text offset in the document to a ProseMirror position. */
export function findAnchorTextRange(
  doc: ProseMirrorNode,
  anchorText: string,
  occurrence = 0,
): { from: number; to: number } | null {
  const needle = anchorText.trim();
  if (!needle) return null;

  const chunks = collectDocTextChunks(doc);
  if (chunks.length === 0) return null;

  const haystack = chunks.map((chunk) => chunk.text).join("");
  let searchFrom = 0;
  let matchIndex = -1;

  for (let index = 0; index <= occurrence; index += 1) {
    matchIndex = haystack.indexOf(needle, searchFrom);
    if (matchIndex === -1) return null;
    searchFrom = matchIndex + 1;
  }

  const from = chunkOffsetToPos(chunks, matchIndex);
  const to = chunkOffsetToPos(chunks, matchIndex + needle.length);
  if (from == null || to == null) return null;
  return { from, to };
}

/** 0-based index of which duplicate `anchorText` instance a range covers. */
export function findAnchorOccurrenceAtRange(
  doc: ProseMirrorNode,
  anchorText: string,
  from: number,
  to: number,
): number {
  const needle = anchorText.trim();
  if (!needle) return 0;

  const chunks = collectDocTextChunks(doc);
  const haystack = chunks.map((chunk) => chunk.text).join("");
  const rangeStart = posToFlatOffset(chunks, from);
  const rangeEnd = posToFlatOffset(chunks, to);
  if (rangeStart == null || rangeEnd == null) return 0;

  let occurrence = 0;
  let searchFrom = 0;

  while (searchFrom < haystack.length) {
    const idx = haystack.indexOf(needle, searchFrom);
    if (idx === -1) break;
    const matchEnd = idx + needle.length;
    if (idx === rangeStart && matchEnd === rangeEnd) {
      return occurrence;
    }
    if (idx < rangeStart) {
      occurrence += 1;
    } else {
      break;
    }
    searchFrom = idx + 1;
  }

  return 0;
}

export function resolveThreadAnchorRange(
  doc: ProseMirrorNode,
  thread: {
    anchorText: string;
    anchorFrom?: number;
    anchorTo?: number;
    anchorOccurrence?: number;
  },
): { from: number; to: number } | null {
  const anchorText = thread.anchorText.trim();
  if (!anchorText) return null;

  if (typeof thread.anchorFrom === "number" && typeof thread.anchorTo === "number") {
    const { anchorFrom, anchorTo } = thread;
    if (anchorFrom >= 0 && anchorTo > anchorFrom && anchorTo <= doc.content.size) {
      const text = doc.textBetween(anchorFrom, anchorTo, " ").trim();
      if (text === anchorText) {
        return { from: anchorFrom, to: anchorTo };
      }
    }
  }

  return findAnchorTextRange(doc, anchorText, thread.anchorOccurrence ?? 0);
}

function clampPosToCommentMarkRange(pos: number, range: { from: number; to: number }): number {
  return Math.max(range.from, Math.min(range.to, pos));
}

function resolveSelectCommentCaretPos(
  range: { from: number; to: number },
  options?: SelectCommentOptions,
): number {
  if (options?.caretPos != null) {
    return clampPosToCommentMarkRange(options.caretPos, range);
  }
  if (options?.caretAt === "start") {
    return range.from;
  }
  // Default: mark end — caret outside inclusive mark, active styling only.
  return range.to;
}

export function findCommentMarkRange(
  doc: Editor["state"]["doc"],
  id: string,
): { from: number; to: number } | null {
  let from: number | null = null;
  let to: number | null = null;

  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const hasMark = node.marks.some((mark) => mark.type.name === "comment" && mark.attrs.id === id);
    if (!hasMark) return;
    if (from == null) from = pos;
    to = pos + node.nodeSize;
  });

  return from != null && to != null ? { from, to } : null;
}

export function documentHasCommentMark(doc: ProseMirrorNode, id: string): boolean {
  let found = false;
  doc.descendants((node) => {
    if (found || !node.isText) return;
    found = node.marks.some((mark) => mark.type.name === "comment" && mark.attrs.id === id);
  });
  return found;
}

function collectCommentMarkIds(doc: ProseMirrorNode): Set<string> {
  const ids = new Set<string>();
  doc.descendants((node) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type.name === "comment" && typeof mark.attrs.id === "string") {
        ids.add(mark.attrs.id);
      }
    }
  });
  return ids;
}

function removeCommentMarkId(
  tr: Editor["state"]["tr"],
  doc: ProseMirrorNode,
  markType: MarkType,
  id: string,
): boolean {
  let modified = false;
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (mark.type === markType && mark.attrs.id === id) {
        tr.removeMark(pos, pos + node.nodeSize, mark);
        modified = true;
      }
    }
  });
  return modified;
}

/** Keep comment marks aligned with open threads and remove orphaned highlights. */
export function syncPersistedCommentMarks(
  editor: Editor,
  threads: Array<{
    id: string;
    anchorText: string;
    anchorFrom?: number;
    anchorTo?: number;
    anchorOccurrence?: number;
    resolved: boolean;
    messages: unknown[];
  }>,
): boolean {
  const markType = editor.state.schema.marks.comment as MarkType | undefined;
  if (!markType) return false;

  const validIds = new Set<string>();
  for (const thread of threads) {
    if (!thread.resolved && thread.messages.length > 0) {
      validIds.add(thread.id);
    }
  }

  const { tr, doc } = editor.state;
  let modified = false;

  for (const id of collectCommentMarkIds(doc)) {
    if (validIds.has(id)) continue;
    if (removeCommentMarkId(tr, doc, markType, id)) modified = true;
  }

  for (const thread of threads) {
    if (thread.resolved || thread.messages.length === 0) continue;
    if (documentHasCommentMark(doc, thread.id)) continue;

    const range = resolveThreadAnchorRange(doc, thread);
    if (!range) continue;

    tr.addMark(range.from, range.to, markType.create({ id: thread.id }));
    modified = true;
  }

  if (!modified) return false;

  tr.setMeta("addToHistory", false);
  bypassTrackChangesForCommentTransaction(tr);
  editor.view.dispatch(tr);
  return true;
}
