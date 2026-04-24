import type { DraftSeed } from "@/components/mail/Composer";
import type { Message } from "@/lib/mail-store";

function formatRecipientCsv(list: { name?: string; email: string }[] | undefined): string {
  if (!list?.length) return "";
  return list
    .map((t) => {
      const e = t.email.trim();
      const n = t.name?.trim();
      if (!e) return n ?? "";
      if (!n || n === e) return e;
      return `${n} <${e}>`;
    })
    .filter(Boolean)
    .join(", ");
}

function stripHtmlToPlain(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Build composer seed from an IMAP draft row (after full body fetch when possible). */
export function draftSeedFromMessage(m: Message): DraftSeed {
  const body =
    m.body.trim() !== ""
      ? m.body
      : m.bodyHtml && m.bodyHtml.trim() !== ""
        ? stripHtmlToPlain(m.bodyHtml)
        : "";
  return {
    sourceMessageId: m.id,
    to: formatRecipientCsv(m.to),
    cc: formatRecipientCsv(m.cc),
    bcc: formatRecipientCsv(m.bcc),
    subject: m.subject,
    body,
  };
}
