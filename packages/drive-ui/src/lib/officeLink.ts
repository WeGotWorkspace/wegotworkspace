const OFFICE_EXT = new Set(["docx", "xlsx", "pptx", "pdf"]);

function normalizeOpenableDrivePath(path: string): { cleanPath: string } | null {
  let s = path.trim().replace(/^\/+/, "").replace(/\/+/g, "/");
  if (s === "") {
    return null;
  }
  for (const seg of s.split("/")) {
    if (seg === "" || seg === "." || seg === ".." || seg.includes("..")) {
      return null;
    }
  }
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  const zone = parts[0]?.toLowerCase();
  if (zone !== "users" && zone !== "groups") {
    return null;
  }
  const fileName = parts[parts.length - 1] ?? "";
  const ext = fileName.includes(".") ? (fileName.split(".").pop() ?? "").toLowerCase() : "";
  if (!OFFICE_EXT.has(ext)) {
    return null;
  }
  return { cleanPath: s };
}

/**
 * @returns e.g. {@code /office/editor?file=users%2Fwouter%2FHello.docx} or null.
 */
export function officeEditorHref(driveFilePath: string): string | null {
  const info = normalizeOpenableDrivePath(driveFilePath);
  if (!info) {
    return null;
  }

  const q = new URLSearchParams({ file: info.cleanPath });

  return `/office/editor?${q.toString()}`;
}

export function canOpenInOfficePath(path: string): boolean {
  return normalizeOpenableDrivePath(path) !== null;
}

/** Blank document in the office shell (see {@code ?new=} on the editor page). */
export function officeNewEditorHref(ext: "docx" | "xlsx" | "pptx" | "pdf"): string {
  return `/office/editor?new=${encodeURIComponent(ext)}`;
}
