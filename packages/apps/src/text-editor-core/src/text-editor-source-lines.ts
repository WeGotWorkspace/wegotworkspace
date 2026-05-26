/** Normalize newlines and split buffer into logical source lines. */
export function textEditorSourceLines(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (normalized.length === 0) return [""];
  return normalized.split("\n");
}

/** Logical line count for source gutter (one number per newline in the buffer). */
export function textEditorSourceLineCount(text: string): number {
  return textEditorSourceLines(text).length;
}
