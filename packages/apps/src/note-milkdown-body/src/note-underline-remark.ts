import type { Root } from "mdast";
import { visit } from "unist-util-visit";

import { $remark } from "@milkdown/kit/utils";

/**
 * Remark pass: paired inline `<u>…</u>` becomes `{ type: 'underlineInline', children }`
 * so {@link ./note-underline-mark.ts} can reopen it as a mark (avoids plain `html` atoms).
 */
function underlineInlineFromHtml(tree: Root) {
  visit(tree, "html", (node, index, parent) => {
    if (parent == null || index === undefined || typeof node.value !== "string") {
      return;
    }
    const trimmed = node.value.trim();
    const m = /^<u>([\s\S]*?)<\/u>$/i.exec(trimmed);
    if (!m) return;
    const inner = m[1] ?? "";
    (parent.children as unknown[])[index] = {
      type: "underlineInline",
      children: [{ type: "text", value: inner }],
    };
  });
}

export const milkdownUnderlineRemark = $remark(
  "milkdownNoteUnderlineRemark",
  () => () => underlineInlineFromHtml,
);
