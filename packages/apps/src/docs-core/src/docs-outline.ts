import type { Editor } from "@tiptap/react";

export type DocsOutlineItem = {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
};

const HEADING_LINE_RE = /^(#{1,6})\s+(.+)$/;

/** Headings in document order from markdown source (ATX `#` lines). */
export function parseMarkdownOutline(content: string): DocsOutlineItem[] {
  const items: DocsOutlineItem[] = [];
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    const match = HEADING_LINE_RE.exec(trimmed);
    if (!match) continue;
    const level = match[1].length;
    if (level < 1 || level > 6) continue;
    const text = match[2]
      .replace(/\s+#+\s*$/, "")
      .replace(/[*_`~[\]]/g, "")
      .trim();
    if (!text) continue;
    items.push({ level: level as DocsOutlineItem["level"], text });
  }
  return items;
}

/** Outline-style numbers per heading (e.g. `1`, `1.1`, `2.1.2`) in document order. */
export function formatOutlineNumbers(items: readonly DocsOutlineItem[]): string[] {
  const counters: number[] = [];

  return items.map((item) => {
    counters.length = item.level;
    const index = item.level - 1;
    counters[index] = (counters[index] ?? 0) + 1;
    return counters.slice(0, item.level).join(".");
  });
}

/** Focus the nth heading node in the TipTap document (same order as {@link parseMarkdownOutline}). */
export function focusOutlineHeading(editor: Editor, itemIndex: number): boolean {
  let seen = 0;
  let focused = false;

  editor.state.doc.descendants((node, pos) => {
    if (focused || node.type.name !== "heading") return;
    if (seen !== itemIndex) {
      seen += 1;
      return;
    }
    editor
      .chain()
      .focus()
      .setTextSelection(pos + 1)
      .scrollIntoView()
      .run();
    focused = true;
    return false;
  });

  return focused;
}
