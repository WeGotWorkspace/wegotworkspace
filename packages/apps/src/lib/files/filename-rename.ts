export type FileNameRenameParts = {
  baseName: string;
  /** Includes leading dot when present, e.g. `.md`. */
  extension: string;
  hasExtension: boolean;
};

/** Split a file name into editable base + fixed extension (last segment after `.`). */
export function splitFileNameForRename(name: string): FileNameRenameParts {
  const trimmed = name.trim();
  if (!trimmed) {
    return { baseName: "", extension: "", hasExtension: false };
  }

  const lastDot = trimmed.lastIndexOf(".");
  if (lastDot <= 0) {
    return { baseName: trimmed, extension: "", hasExtension: false };
  }

  return {
    baseName: trimmed.slice(0, lastDot),
    extension: trimmed.slice(lastDot),
    hasExtension: true,
  };
}

export function joinFileNameForRename(baseName: string, extension: string): string {
  const base = baseName.trim();
  if (!extension) return base;
  return `${base}${extension}`;
}
