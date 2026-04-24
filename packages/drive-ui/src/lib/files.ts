export type FileKind = "folder" | "doc" | "sheet" | "slide" | "image" | "pdf" | "video" | "audio" | "archive" | "other";

export interface DriveFile {
  id: string;
  path: string;
  name: string;
  kind: FileKind;
  size?: string;
  /** Raw byte size from the server (for sorting); folders may be 0. */
  sizeBytes?: number;
  modified: string;
  owner: { name: string; avatar: string };
  shared?: { name: string; avatar: string }[];
  starred?: boolean;
  parentId?: string | null;
  preview?: string;
}

export const formatRelative = (iso: string) => {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i + 1).toLowerCase();
}

export function kindFromName(name: string, isDir: boolean): FileKind {
  if (isDir) return "folder";
  const e = extOf(name);
  const doc = ["doc", "docx", "odt", "txt", "md", "rtf"];
  const sheet = ["xls", "xlsx", "ods", "csv"];
  const slide = ["ppt", "pptx", "odp"];
  const image = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"];
  const video = ["mp4", "webm", "mov", "mkv", "avi"];
  const audio = ["mp3", "wav", "ogg", "flac", "m4a"];
  const archive = ["zip", "tar", "gz", "rar", "7z"];
  if (e === "pdf") return "pdf";
  if (doc.includes(e)) return "doc";
  if (sheet.includes(e)) return "sheet";
  if (slide.includes(e)) return "slide";
  if (image.includes(e)) return "image";
  if (video.includes(e)) return "video";
  if (audio.includes(e)) return "audio";
  if (archive.includes(e)) return "archive";
  return "other";
}

export function formatBytes(n: number): string | undefined {
  if (n <= 0) return undefined;
  const u = ["B", "KB", "MB", "GB", "TB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < u.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v < 10 && i > 0 ? v.toFixed(1) : Math.round(v)} ${u[i]}`;
}
