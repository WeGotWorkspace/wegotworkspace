/**
 * Builds links to the Sabre office shell ({@code /office/editor?file=…}) using the same rules as
 * {@code parseOfficeFileParam} in {@code packages/docs/overlay/lib/sabre-office-dav.ts}.
 */

const OFFICE_EXT = new Set(["docx", "xlsx", "pptx", "pdf"]);

/**
 * @returns Path relative to WebDAV {@code files/} (no leading slash), or null if not openable in OnlyOffice.
 */
export function relUnderFilesFromDrivePath(path: string): string | null {
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
  const zone = parts[0].toLowerCase();
  if (zone !== "users" && zone !== "groups") {
    return null;
  }
  const last = parts[parts.length - 1] ?? "";
  const ext = last.includes(".") ? (last.split(".").pop() ?? "").toLowerCase() : "";
  if (!OFFICE_EXT.has(ext)) {
    return null;
  }
  return s;
}

/**
 * @returns e.g. {@code /office/editor?file=users%2Fwouter%2FHello.docx} or null.
 * The office editor also accepts {@code ?page=} with the same path (see office overlay).
 */
export function officeEditorHref(driveFilePath: string): string | null {
  const rel = relUnderFilesFromDrivePath(driveFilePath);
  if (!rel) {
    return null;
  }
  const q = new URLSearchParams({ file: rel });
  return `/office/editor?${q.toString()}`;
}

export function canOpenInOfficePath(path: string): boolean {
  return relUnderFilesFromDrivePath(path) !== null;
}

/** Blank document in the office shell (see {@code server.openNew} / {@code ?new=} on the editor page). */
export function officeNewEditorHref(ext: "docx" | "xlsx" | "pptx"): string {
  return `/office/editor?new=${encodeURIComponent(ext)}`;
}
