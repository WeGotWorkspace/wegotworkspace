import { Extension } from "@tiptap/react";
import type { Editor } from "@tiptap/react";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const COMMENT_DRAFT_ANCHOR_CLASS = "comment-draft-anchor-selection";

export type CommentDraftAnchorRange = {
  from: number;
  to: number;
};

export const commentDraftAnchorPluginKey = new PluginKey<CommentDraftAnchorRange | null>(
  "commentDraftAnchor",
);

function buildDecorationSet(
  doc: Editor["state"]["doc"],
  anchor: CommentDraftAnchorRange | null,
): DecorationSet {
  if (!anchor) return DecorationSet.empty;

  const { from, to } = anchor;
  if (from < 0 || to <= from || to > doc.content.size) return DecorationSet.empty;

  return DecorationSet.create(doc, [
    Decoration.inline(from, to, { class: COMMENT_DRAFT_ANCHOR_CLASS }),
  ]);
}

/** Show native-selection styling on draft comment anchor text (no comment mark). */
export function setCommentDraftAnchor(
  editor: Editor | null,
  anchor: CommentDraftAnchorRange | null,
): void {
  if (!editor || editor.isDestroyed) return;
  editor.view.dispatch(editor.state.tr.setMeta(commentDraftAnchorPluginKey, anchor));
}

export const CommentDraftAnchor = Extension.create({
  name: "commentDraftAnchor",
  addProseMirrorPlugins() {
    return [
      new Plugin<CommentDraftAnchorRange | null>({
        key: commentDraftAnchorPluginKey,
        state: {
          init: () => null,
          apply(tr, anchor) {
            const meta = tr.getMeta(commentDraftAnchorPluginKey);
            if (meta !== undefined) return meta as CommentDraftAnchorRange | null;
            if (!anchor || !tr.docChanged) return anchor;

            const from = tr.mapping.map(anchor.from, -1);
            const to = tr.mapping.map(anchor.to, 1);
            if (from >= to || to > tr.doc.content.size) return null;
            return { from, to };
          },
        },
        props: {
          decorations(state) {
            const anchor = commentDraftAnchorPluginKey.getState(state);
            return buildDecorationSet(state.doc, anchor ?? null);
          },
        },
      }),
    ];
  },
});
