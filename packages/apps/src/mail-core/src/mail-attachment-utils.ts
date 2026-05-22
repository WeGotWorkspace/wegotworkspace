import {
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

export function iconForMailAttachment(mime: string | undefined, name: string): IconComponent {
  const normalizedMime = (mime ?? "").toLowerCase();
  const extension = name.toLowerCase().split(".").pop() ?? "";
  if (
    normalizedMime.startsWith("image/") ||
    ["png", "jpg", "jpeg", "gif", "webp", "svg", "heic"].includes(extension)
  ) {
    return FileImage;
  }
  if (
    normalizedMime.startsWith("video/") ||
    ["mp4", "mov", "webm", "avi", "mkv"].includes(extension)
  ) {
    return FileVideo;
  }
  if (
    normalizedMime.startsWith("audio/") ||
    ["mp3", "wav", "ogg", "m4a", "flac"].includes(extension)
  ) {
    return FileAudio;
  }
  if (normalizedMime === "application/pdf" || extension === "pdf") return FileText;
  if (
    normalizedMime.includes("spreadsheet") ||
    normalizedMime === "text/csv" ||
    ["xls", "xlsx", "csv", "numbers"].includes(extension)
  ) {
    return FileSpreadsheet;
  }
  if (
    normalizedMime.includes("zip") ||
    normalizedMime.includes("compressed") ||
    ["zip", "tar", "gz", "rar", "7z"].includes(extension)
  ) {
    return FileArchive;
  }
  if (
    normalizedMime.startsWith("text/") ||
    ["txt", "md", "rtf", "doc", "docx"].includes(extension)
  ) {
    return FileText;
  }
  return FileIcon;
}

export function formatMailAttachmentSize(bytes: number | undefined): string {
  if (!bytes || bytes <= 0) return "";
  const units = ["B", "KB", "MB", "GB"];
  let unitIndex = 0;
  let value = bytes;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value < 10 && unitIndex > 0 ? value.toFixed(1) : Math.round(value)} ${units[unitIndex]}`;
}

export function extensionLabelForMailAttachment(name: string): string {
  const extension = name.includes(".") ? (name.split(".").pop() ?? "") : "";
  return extension ? extension.toUpperCase() : "";
}

export function mailAttachmentMetaLabel(name: string, sizeBytes?: number): string {
  const extension = extensionLabelForMailAttachment(name);
  const sizeLabel = formatMailAttachmentSize(sizeBytes);
  return [extension, sizeLabel].filter(Boolean).join(" | ");
}
