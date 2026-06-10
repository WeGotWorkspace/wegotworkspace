import type { Mail } from "@/types/mail";
import type { MailComposeAttachment } from "@/mail-core/src/mail-compose-utils";

export type ComposeMode = "new" | "reply" | "reply-all" | "forward" | "draft";

export type MailComposeDraft = {
  mode: ComposeMode;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: MailComposeAttachment[];
  saving: boolean;
  sending: boolean;
};

const EMPTY_COMPOSE_ATTACHMENTS: MailComposeAttachment[] = [];

export function splitDetailBodyParagraphs(body: string): string[] {
  const cleaned = body.trim();
  if (!cleaned) return [""];
  const parts = cleaned
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [cleaned];
}

export function ensureSubjectPrefix(subject: string, prefix: "Re" | "Fwd"): string {
  const trimmed = subject.trim();
  if (!trimmed) return `${prefix}: `;
  const pattern = prefix === "Re" ? /^\s*re:/i : /^\s*fwd:/i;
  return pattern.test(trimmed) ? trimmed : `${prefix}: ${trimmed}`;
}

export function normalizeComposeSubject(
  subject: string,
  noSubjectLabel: string,
): string | undefined {
  const normalized = subject.trim();
  if (!normalized) return undefined;
  if (normalized.toLowerCase() === noSubjectLabel.trim().toLowerCase()) return undefined;
  if (normalized.toLowerCase() === "(no subject)") return undefined;
  return normalized;
}

function quotedOriginalMessage(source: Mail): string {
  const sourceBody = source.body.join("\n\n").trim() || source.excerpt.trim();
  if (!sourceBody) return "";
  const header = [
    "",
    "",
    "--- Original message ---",
    `From: ${source.from}${source.email ? ` <${source.email}>` : ""}`,
    `Subject: ${source.title || "(no subject)"}`,
    "",
  ].join("\n");
  const quotedBody = sourceBody
    .split("\n")
    .map((line) => `> ${line}`)
    .join("\n");
  return `${header}${quotedBody}`;
}

export function draftForMode(mode: ComposeMode, source?: Mail): MailComposeDraft {
  if (!source) {
    return {
      mode,
      to: "",
      cc: "",
      bcc: "",
      subject: "",
      body: "",
      attachments: EMPTY_COMPOSE_ATTACHMENTS,
      saving: false,
      sending: false,
    };
  }
  if (mode === "draft") {
    return {
      mode,
      to: "",
      cc: "",
      bcc: "",
      subject: source.title,
      body: source.body.join("\n\n"),
      attachments: EMPTY_COMPOSE_ATTACHMENTS,
      saving: false,
      sending: false,
    };
  }
  if (mode === "forward") {
    return {
      mode,
      to: "",
      cc: "",
      bcc: "",
      subject: ensureSubjectPrefix(source.title, "Fwd"),
      body: quotedOriginalMessage(source),
      attachments: EMPTY_COMPOSE_ATTACHMENTS,
      saving: false,
      sending: false,
    };
  }
  return {
    mode,
    to: source.email,
    cc: "",
    bcc: "",
    subject: ensureSubjectPrefix(source.title, "Re"),
    body: quotedOriginalMessage(source),
    attachments: EMPTY_COMPOSE_ATTACHMENTS,
    saving: false,
    sending: false,
  };
}

export function withDetailLoadedFlag(row: Mail): Mail {
  return { ...row, detailLoaded: row.detailLoaded ?? false };
}
