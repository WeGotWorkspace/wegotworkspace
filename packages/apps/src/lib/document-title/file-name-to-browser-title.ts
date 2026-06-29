import { splitFileNameForRename } from "@/lib/files/filename-rename";

/** Strip the file extension for browser tab context (matches rename dialog base name). */
export function fileNameToBrowserTitle(fileName: string): string {
  const trimmed = fileName.trim();
  if (!trimmed) return "";
  const { baseName } = splitFileNameForRename(trimmed);
  return baseName.trim() || trimmed;
}
