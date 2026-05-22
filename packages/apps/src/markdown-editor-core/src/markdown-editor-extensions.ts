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

export type CreateMarkdownEditorExtensionsOptions = {
  placeholder?: string;
};

export function createMarkdownEditorExtensions(
  options: CreateMarkdownEditorExtensionsOptions = {},
): Extensions {
  const placeholder = options.placeholder ?? "Press '/' for commands…";

  return [
    StarterKit,
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
}
