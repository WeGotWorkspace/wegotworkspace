/**
 * Builds one markdown document for the Milkdown editor from `Note.body`.
 * Legacy rows use one string per paragraph; after saving from the editor we persist `[markdown]`.
 */
export function noteBodyToMarkdown(body: string[]): string {
  if (body.length === 0) return "";
  return body.join("\n\n");
}
