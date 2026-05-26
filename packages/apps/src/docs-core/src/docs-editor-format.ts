import { extensionFromFileName } from "@/drive-core/src/drive-file-utils";
import type { TextEditorContentFormat } from "@/text-editor-core/src/text-editor-content";

/** Map a drive file name to the text-editor serialization format. */
export function docsEditorFormatFromFileName(fileName: string): TextEditorContentFormat {
  const ext = extensionFromFileName(fileName);
  if (ext === "txt") return "text";
  return "markdown";
}

export function isDocsPlainTextFile(fileName: string): boolean {
  return docsEditorFormatFromFileName(fileName) === "text";
}
