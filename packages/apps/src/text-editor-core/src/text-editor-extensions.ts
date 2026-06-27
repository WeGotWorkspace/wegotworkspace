import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCaret from "@tiptap/extension-collaboration-caret";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import TextAlign from "@tiptap/extension-text-align";
import Typography from "@tiptap/extension-typography";
import Underline from "@tiptap/extension-underline";
import StarterKit from "@tiptap/starter-kit";
import { Mark, mergeAttributes, type Extensions } from "@tiptap/react";
import { Markdown } from "tiptap-markdown";
import type { Awareness } from "y-protocols/awareness";
import type * as Y from "yjs";
import type { TextEditorContentFormat } from "@/text-editor-core/src/text-editor-content";
import { createTextEditorPaginationExtension } from "@/text-editor-core/src/text-editor-pagination";
import { PlainTextPaste } from "@/text-editor-core/src/text-editor-plain-paste";

export const CommentMark = Mark.create({
  name: "comment",
  inclusive: false,
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
    return ["span", mergeAttributes(HTMLAttributes, { class: "comment-mark" }), 0];
  },
});

export const SuggestionMark = Mark.create({
  name: "suggestion",
  inclusive: false,
  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (el) => (el as HTMLElement).getAttribute("data-suggestion-id"),
        renderHTML: (attrs) => (attrs.id ? { "data-suggestion-id": attrs.id } : {}),
      },
    };
  },
  parseHTML() {
    return [{ tag: "span[data-suggestion-id]" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "suggestion-mark" }), 0];
  },
});

export type CreateTextEditorExtensionsOptions = {
  placeholder?: string;
  format?: TextEditorContentFormat;
  /**
   * Visual multi-page pagination (US Letter). Off by default; Docs opts in.
   * Decoration-only — never changes the stored content.
   */
  pagination?: boolean;
};

export function createTextEditorExtensions(
  options: CreateTextEditorExtensionsOptions = {},
): Extensions {
  const format = options.format ?? "html";
  const placeholder =
    options.placeholder ?? (format === "text" ? "Start typing…" : "Press '/' for commands…");

  const extensions: Extensions = [
    // Keep Link/Underline explicitly configured below without duplicating StarterKit marks.
    StarterKit.configure({ link: false, underline: false }),
    Underline,
    Link.configure({ openOnClick: false }),
    Placeholder.configure({ placeholder }),
    Highlight.configure({ multicolor: false }),
    TaskList,
    TaskItem.configure({ nested: true }),
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Typography,
    Image,
    Table.configure({ resizable: false }),
    TableRow,
    TableHeader,
    TableCell,
    CommentMark,
    SuggestionMark,
  ];

  if (format === "markdown") {
    extensions.push(
      Markdown.configure({
        html: true,
        transformPastedText: true,
        transformCopiedText: true,
      }),
    );
  }

  if (format === "text") {
    extensions.push(PlainTextPaste);
  }

  if (options.pagination) {
    extensions.push(createTextEditorPaginationExtension());
  }

  return extensions;
}

export type CreateCollaborativeTextEditorExtensionsOptions = CreateTextEditorExtensionsOptions & {
  document: Y.Doc;
  awareness: Awareness;
  user: { name: string; color: string };
};

/** Same surface as {@link createTextEditorExtensions} with Yjs + remote carets (undo disabled). */
export function createCollaborativeTextEditorExtensions(
  options: CreateCollaborativeTextEditorExtensionsOptions,
): Extensions {
  const { document, awareness, user, ...editorOptions } = options;
  const base = createTextEditorExtensions(editorOptions).filter((ext) => ext.name !== "starterKit");

  return [
    StarterKit.configure({ undoRedo: false }),
    ...base,
    Collaboration.configure({ document }),
    CollaborationCaret.configure({
      provider: { awareness },
      user,
    }),
  ];
}
