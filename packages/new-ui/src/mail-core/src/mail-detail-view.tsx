import { useMemo } from "react";
import { Tag } from "@/tag/src/tag";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { cn } from "@/lib/utils";
import { mailboxIconForLabel } from "@/mail-core/src/mailbox-icons";
import type { MailAttachment } from "@/types/mail";
import { MailAttachments } from "./mail-attachments";
import { MailBodyIframe } from "./mail-body-iframe";

type MailDetailViewProps = {
  /** Used for stable keys on body paragraphs when switching messages. */
  mailId: string;
  mailbox: string;
  date: string;
  title: string;
  emptySubjectLabel?: string;
  from: string;
  /** Second line under sender name, e.g. built with i18n: `email + detailToViewer("me")`. */
  senderMetaLine: string;
  body: string[];
  excerpt?: string;
  bodyHtml?: string;
  detailLoaded?: boolean;
  attachments?: MailAttachment[];
  buildAttachmentUrl?: (attachment: MailAttachment) => string | undefined;
  onDownloadAttachment?: (attachment: MailAttachment) => void;
  className?: string;
};

export function MailDetailView({
  mailId,
  mailbox,
  date,
  title,
  emptySubjectLabel = "(no subject)",
  from,
  senderMetaLine,
  body,
  excerpt,
  bodyHtml,
  detailLoaded = false,
  attachments,
  buildAttachmentUrl,
  onDownloadAttachment,
  className,
}: MailDetailViewProps) {
  const plainBody = useMemo(() => body.filter((p) => p.trim().length > 0).join("\n\n"), [body]);
  const plainBodyFallback = useMemo(
    () => plainBody || (excerpt ?? "").trim(),
    [plainBody, excerpt],
  );
  const hasHtmlBody = (bodyHtml ?? "").trim().length > 0;
  const showIframe = detailLoaded && hasHtmlBody;
  const showPlainBody = detailLoaded && !hasHtmlBody;

  return (
    <article className={cn("max-w-[680px] mx-auto", className)}>
      <div className="flex items-center gap-3 md:gap-6 text-[11px] uppercase tracking-[0.2em] mb-5">
        <Tag
          label={mailbox}
          icon={mailboxIconForLabel(mailbox)}
          colors={{
            color: "var(--color-cream, #f5f1e8)",
            backgroundColor: "color-mix(in oklab, var(--color-ink) 88%, transparent)",
          }}
        />
        <span className="font-sans text-[color-mix(in_oklab,var(--color-ink)_55%,transparent)] normal-case tracking-normal text-sm">
          {date}
        </span>
      </div>

      <h1 className="text-3xl md:text-4xl font-sans text-(--color-ink) font-semibold leading-[1.1] tracking-tight mb-8">
        {title || emptySubjectLabel}
      </h1>

      <div className="flex items-center py-4 border-y border-[color-mix(in_oklab,var(--color-ink)_10%,transparent)] mb-10">
        <UserAvatar
          displayName={from}
          subtitle={senderMetaLine}
          size="md"
          className="gap-3 w-full [--user-avatar-bg:var(--color-emerald)] [--user-avatar-fg:var(--color-ink)]"
        />
      </div>

      {showIframe ? (
        <MailBodyIframe key={`${mailId}-body-frame`} bodyHtml={bodyHtml ?? ""} />
      ) : showPlainBody ? (
        <div className="whitespace-pre-wrap wrap-break-word font-sans text-base leading-7 text-[color-mix(in_oklab,var(--color-ink)_82%,transparent)]">
          {plainBodyFallback}
        </div>
      ) : null}

      {attachments && attachments.length > 0 ? (
        <MailAttachments
          attachments={attachments}
          buildDownloadUrl={buildAttachmentUrl}
          onDownload={onDownloadAttachment}
        />
      ) : null}
    </article>
  );
}
