import removeMd from "remove-markdown";

/**
 * Builds one markdown document for the note editor from `Note.body`.
 * Legacy rows use one string per paragraph; after saving from the editor we persist `[markdown]`.
 */
export function noteBodyToMarkdown(body: string[]): string {
  if (body.length === 0) return "";
  return body.join("\n\n");
}

/** Strips markdown / inline HTML for list previews, search, and excerpts. */
export function markdownToPlainText(markdown: string): string {
  return removeMd(markdown).replace(/\s+/g, " ").trim();
}
