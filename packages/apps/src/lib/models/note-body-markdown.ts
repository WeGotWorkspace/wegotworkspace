/**
 * Builds one markdown document for the Milkdown editor from `Note.body`.
 * Legacy rows use one string per paragraph; after saving from the editor we persist `[markdown]`.
 */
export function noteBodyToMarkdown(body: string[]): string {
  if (body.length === 0) return "";
  return body.join("\n\n");
}

/** Strips markdown / inline HTML for list previews, search, and excerpts. */
export function markdownToPlainText(markdown: string): string {
  let text = markdown;
  text = text.replace(/<[^>]+>/g, " ");
  text = text.replace(/```[\s\S]*?```/g, " ");
  text = text.replace(/`[^`]+`/g, " ");
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  text = text.replace(/^#{1,6}\s+/gm, "");
  text = text.replace(/(\*\*|__)(.*?)\1/g, "$2");
  text = text.replace(/(\*|_)(.*?)\1/g, "$2");
  text = text.replace(/~~(.*?)~~/g, "$1");
  text = text.replace(/^\s*[-*+]\s+/gm, "");
  text = text.replace(/^\s*\d+\.\s+/gm, "");
  text = text.replace(/^\s*>\s?/gm, "");
  text = text.replace(/^[-*_]{3,}\s*$/gm, " ");
  return text.replace(/\s+/g, " ").trim();
}
