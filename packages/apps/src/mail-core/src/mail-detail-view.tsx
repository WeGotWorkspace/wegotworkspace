import { useMemo } from "react";
import { CalendarDays } from "lucide-react";
import { DetailViewHeader } from "@/detail-view-header/src/detail-view-header";
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
    <article className={cn("mail-detail-view max-w-[680px] mx-auto", className)}>
      <DetailViewHeader
        topTags={[
          {
            key: "mailbox",
            label: mailbox,
            icon: mailboxIconForLabel(mailbox),
            colors: {
              color: "var(--color-cream, #f5f1e8)",
              backgroundColor: "color-mix(in oklab, var(--color-ink) 88%, transparent)",
            },
          },
          {
            key: "date",
            label: date,
            icon: <CalendarDays className="size-3.5 opacity-70" />,
            colors: {
              backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
              color: "color-mix(in oklab, var(--color-ink) 58%, transparent)",
            },
          },
        ]}
        title={title}
        emptyTitleLabel={emptySubjectLabel}
        titleClassName="text-3xl md:text-4xl font-sans text-(--color-ink) font-semibold leading-[1.1] tracking-tight mb-8"
      />

      <div className="mail-detail-view__sender-row">
        <UserAvatar displayName={from} subtitle={senderMetaLine} size="md" />
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
