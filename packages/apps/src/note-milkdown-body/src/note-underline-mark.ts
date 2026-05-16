import { toggleMark } from "@milkdown/kit/prose/commands";
import type { MarkdownNode } from "@milkdown/transformer";
import { $command, $markAttr, $markSchema } from "@milkdown/kit/utils";

import { milkdownUnderlineRemark } from "@/note-milkdown-body/src/note-underline-remark";

export const milkdownUnderlineAttr = $markAttr("underline");

function escapeUnderlineHtmlSegment(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export const milkdownUnderlineSchema = $markSchema("underline", (ctx) => ({
  parseDOM: [
    { tag: "u" },
    {
      style: "text-decoration",
      getAttrs: (value) =>
        typeof value === "string" && /\bunderline\b/i.test(value) ? null : false,
    },
  ],
  toDOM: (mark) => ["u", ctx.get(milkdownUnderlineAttr.key)(mark), 0],
  parseMarkdown: {
    match: (node: MarkdownNode) => node.type === "underlineInline",
    runner: (state, node, markType) => {
      state.openMark(markType);
      state.next(node.children ?? []);
      state.closeMark(markType);
    },
  },
  toMarkdown: {
    match: (mark) => mark.type.name === "underline",
    runner: (state, _mark, node) => {
      const text = typeof node?.text === "string" ? node.text : "";
      state.addNode("html", undefined, `<u>${escapeUnderlineHtmlSegment(text)}</u>`);
      return true;
    },
  },
}));

export const milkdownUnderlineToggleCommand = $command(
  "ToggleCrepeUnderline",
  (ctx) => () => toggleMark(milkdownUnderlineSchema.type(ctx)),
);

/** Plugins to register on the Creper `Editor` (before `.create()`). Order: remark first. */
export const milkdownUnderlinePlugins = [
  ...milkdownUnderlineRemark,
  milkdownUnderlineAttr,
  milkdownUnderlineSchema.ctx,
  milkdownUnderlineSchema.mark,
  milkdownUnderlineToggleCommand,
];
