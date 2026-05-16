import {
  Download,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Paperclip,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { cn } from "@/lib/utils";
import { mailWorkspacePaneClasses } from "@/mail-core/src/mail-workspace.styles";
import type { MailAttachment } from "@/types/mail";

type MailAttachmentsProps = {
  attachments: MailAttachment[];
  /** Build a direct URL for downloads. Falls back to button mode when omitted. */
  buildDownloadUrl?: (attachment: MailAttachment) => string | undefined;
  /** Download handler used when direct URL mode is not provided. */
  onDownload?: (attachment: MailAttachment) => void;
  className?: string;
  label?: string;
};

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

function iconForAttachment(mime: string | undefined, name: string): IconComponent {
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

function formatAttachmentSize(bytes: number | undefined): string {
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

export function MailAttachments({
  attachments,
  buildDownloadUrl,
  onDownload,
  className,
  label = "Attachments",
}: MailAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <section className={cn(mailWorkspacePaneClasses.attachments, className)} aria-label={label}>
      <div className={mailWorkspacePaneClasses.attachmentsLabel}>
        <Paperclip className="size-3.5" />
        <span>
          {label} ({attachments.length})
        </span>
      </div>

      <ul className={mailWorkspacePaneClasses.attachmentsGrid}>
        {attachments.map((attachment, index) => {
          const Icon = iconForAttachment(attachment.type, attachment.name);
          const sizeLabel = formatAttachmentSize(attachment.size);
          const url = buildDownloadUrl?.(attachment);
          const metadata = [attachment.type, sizeLabel].filter(Boolean).join(" | ");
          const content = (
            <>
              <div className={mailWorkspacePaneClasses.attachmentIcon}>
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className={mailWorkspacePaneClasses.attachmentName}>{attachment.name}</div>
                {metadata ? (
                  <div className={mailWorkspacePaneClasses.attachmentMeta}>{metadata}</div>
                ) : null}
              </div>
              <Download
                className={cn("size-4", mailWorkspacePaneClasses.attachmentDownload)}
                aria-hidden="true"
              />
            </>
          );

          return (
            <li key={attachment.id ?? `${attachment.name}-${index}`}>
              {url ? (
                <a
                  href={url}
                  download={attachment.name}
                  rel="noopener"
                  className={mailWorkspacePaneClasses.attachmentItem}
                  aria-label={`Download ${attachment.name}`}
                >
                  {content}
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => onDownload?.(attachment)}
                  className={mailWorkspacePaneClasses.attachmentItem}
                  aria-label={`Download ${attachment.name}`}
                >
                  {content}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
