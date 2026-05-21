import type { WgwMailDraftRequest, WgwMailSendRequest } from "@/lib/api/wgw/types";

export type MailComposeAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  file: File;
};

export type MailComposeDraftFields = {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: MailComposeAttachment[];
};

export function createComposeAttachment(file: File): MailComposeAttachment {
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    filename: file.name,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    file,
  };
}

export function serializeComposeSnapshot(draft: MailComposeDraftFields): string {
  return JSON.stringify({
    to: draft.to.trim(),
    cc: draft.cc.trim(),
    bcc: draft.bcc.trim(),
    subject: draft.subject.trim(),
    body: draft.body,
    attachments: draft.attachments.map((attachment) => ({
      id: attachment.id,
      filename: attachment.filename,
      size: attachment.size,
      mimeType: attachment.mimeType,
    })),
  });
}

export function isComposeDraftDirty(
  draft: MailComposeDraftFields,
  baselineSnapshot: string,
): boolean {
  return serializeComposeSnapshot(draft) !== baselineSnapshot;
}

export function composeDraftHasContent(draft: MailComposeDraftFields): boolean {
  return Boolean(
    draft.to.trim() ||
    draft.cc.trim() ||
    draft.bcc.trim() ||
    draft.subject.trim() ||
    draft.body.trim() ||
    draft.attachments.length > 0,
  );
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Could not read attachment."));
    reader.readAsDataURL(file);
  });
}

export async function encodeComposeAttachmentsForApi(
  attachments: MailComposeAttachment[],
): Promise<NonNullable<WgwMailSendRequest["attachments"]>> {
  return Promise.all(
    attachments.map(async (attachment) => ({
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      contentBase64: await fileToBase64(attachment.file),
    })),
  );
}

export async function composeDraftToApiPayload(
  draft: MailComposeDraftFields,
  normalizeSubject: (subject: string) => string | undefined,
): Promise<Pick<WgwMailDraftRequest, "to" | "cc" | "bcc" | "subject" | "body" | "attachments">> {
  const attachments =
    draft.attachments.length > 0
      ? await encodeComposeAttachmentsForApi(draft.attachments)
      : undefined;
  return {
    to: draft.to || undefined,
    cc: draft.cc || undefined,
    bcc: draft.bcc || undefined,
    subject: normalizeSubject(draft.subject),
    body: draft.body || undefined,
    attachments,
  };
}

export function formatComposeAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
