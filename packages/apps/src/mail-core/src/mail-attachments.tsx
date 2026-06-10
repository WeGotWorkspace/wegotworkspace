import { Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { MailAttachmentChip } from "@/mail-core/src/mail-attachment-chip";
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

export function MailAttachments({
  attachments,
  buildDownloadUrl,
  onDownload,
  className,
  label = "Attachments",
}: MailAttachmentsProps) {
  if (!attachments || attachments.length === 0) return null;

  return (
    <section className={cn("mail-attachments", className)} aria-label={label}>
      <div className="mail-attachments__label">
        <Paperclip className="size-3.5" />
        <span>
          {label} ({attachments.length})
        </span>
      </div>

      <ul className="mail-attachments__grid">
        {attachments.map((attachment, index) => {
          const url = buildDownloadUrl?.(attachment);

          return (
            <li key={attachment.id ?? `${attachment.name}-${index}`}>
              <MailAttachmentChip
                name={attachment.name}
                mimeType={attachment.type}
                sizeBytes={attachment.size}
                downloadHref={url}
                onDownload={url ? undefined : () => onDownload?.(attachment)}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
