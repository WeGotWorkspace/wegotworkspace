import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/react";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export const TRACK_CHANGE_MARK_ACTIVE_CLASS = "track-change-mark--active";

export const suggestionActiveIdPluginKey = new PluginKey<string | null>("suggestionActiveId");

const TRACK_CHANGE_ACTIVE_MARK_NAMES = new Set(["insertion", "deletion", "formatChange"]);

function buildActiveTrackChangeDecorations(
  doc: ProseMirrorNode,
  activeId: string | null,
): DecorationSet {
  if (!activeId) return DecorationSet.empty;

  const decorations: Decoration[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    for (const mark of node.marks) {
      if (!TRACK_CHANGE_ACTIVE_MARK_NAMES.has(mark.type.name)) continue;
      if (mark.attrs.changeId !== activeId) continue;
      decorations.push(
        Decoration.inline(pos, pos + node.nodeSize, { class: TRACK_CHANGE_MARK_ACTIVE_CLASS }),
      );
    }
  });

  return DecorationSet.create(doc, decorations);
}

function createSuggestionActiveIdPlugin(): Plugin<string | null> {
  return new Plugin<string | null>({
    key: suggestionActiveIdPluginKey,
    state: {
      init: () => null,
      apply(tr, activeId) {
        const meta = tr.getMeta(suggestionActiveIdPluginKey);
        if (meta !== undefined) return meta as string | null;
        return activeId;
      },
    },
    props: {
      decorations(state) {
        const activeId = suggestionActiveIdPluginKey.getState(state) ?? null;
        return buildActiveTrackChangeDecorations(state.doc, activeId);
      },
    },
  });
}

/** ProseMirror plugin that highlights the active track-change group via decorations. */
export const TrackChangeActiveExtension = Extension.create({
  name: "trackChangeActive",
  addProseMirrorPlugins() {
    return [createSuggestionActiveIdPlugin()];
  },
});

export function setSuggestionActiveId(editor: Editor | null, activeId: string | null): void {
  if (!editor || editor.isDestroyed) return;

  const current = suggestionActiveIdPluginKey.getState(editor.state) ?? null;
  if (current === activeId) return;

  const tr = editor.state.tr.setMeta(suggestionActiveIdPluginKey, activeId);
  tr.setMeta("addToHistory", false);
  editor.view.dispatch(tr);
}
