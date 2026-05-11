import type {
  WgwMailFolderNode,
  WgwMailMessageDetail,
  WgwMailMessageListItem,
  WgwMailMessagesResponse,
} from "@/lib/api/wgw/types";
import type { Mail } from "@/types/mail";

type WgwMailMessageWire = WgwMailMessageListItem & {
  uid?: number | string;
  imapUid?: number | string;
  imap_uid?: number | string;
  msgno?: number | string;
  msgNo?: number | string;
  messageUid?: number | string;
  mailUid?: number | string;
  Uid?: number | string;
  UID?: number | string;
  to?:
    | string
    | { name?: string; address?: string; email?: string }
    | Array<string | { name?: string; address?: string; email?: string }>;
  recipients?:
    | string
    | { name?: string; address?: string; email?: string }
    | Array<string | { name?: string; address?: string; email?: string }>;
  recipient?: string | { name?: string; address?: string; email?: string };
  toList?: Array<string | { name?: string; address?: string; email?: string }>;
  toAddresses?: Array<string | { name?: string; address?: string; email?: string }>;
  toAddress?: string | { name?: string; address?: string; email?: string };
  toName?: string;
  bodyHtml?: string;
};

function parseUid(value: number | string | undefined): number {
  if (value === undefined) throw new Error("Mail row is missing a valid uid");
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && /^\s*\d+\s*$/.test(value)) return Number(value.trim());
  throw new Error("Mail row is missing a valid uid");
}

function parseUidFromRow(raw: WgwMailMessageWire): number {
  const idSuffix = raw.id?.match(/:(\d+)$/)?.[1];
  return parseUid(
    raw.uid ??
      idSuffix ??
      raw.imapUid ??
      raw.imap_uid ??
      raw.msgno ??
      raw.msgNo ??
      raw.messageUid ??
      raw.mailUid ??
      raw.Uid ??
      raw.UID,
  );
}

export function coerceMailListRow(
  raw: WgwMailMessageListItem,
  defaultFolder: string,
): WgwMailMessageListItem {
  const row = raw as WgwMailMessageWire;
  const uid = parseUidFromRow(row);
  const folder = row.folder?.trim() ? row.folder : row.folderId?.trim() ? row.folderId : defaultFolder;
  return {
    ...row,
    folder,
    uid,
    messageId: row.messageId ?? row.id,
    from: raw.from,
    subject: raw.subject,
    snippet: raw.snippet ?? row.preview,
    date: raw.date,
    read: raw.read,
    flagged: raw.flagged ?? row.starred,
  };
}

export function parseMessagesPayload(
  json: unknown,
  defaultFolder: string,
): WgwMailMessageListItem[] {
  const payload = json as WgwMailMessagesResponse;
  if (!payload?.messages || !Array.isArray(payload.messages)) {
    throw new Error("Mail messages payload is missing required `messages` array");
  }
  const out: WgwMailMessageListItem[] = [];
  let dropped = 0;
  for (const row of payload.messages) {
    try {
      out.push(coerceMailListRow(row, defaultFolder));
    } catch {
      dropped += 1;
    }
  }
  if (dropped > 0) {
    console.warn(`[mail] Dropped ${dropped} message row(s) with invalid identity fields`);
  }
  return out;
}

function wordCountFromText(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).filter(Boolean).length;
}

function splitBodyParagraphs(body: string): string[] {
  const t = body.trim();
  if (!t) return [""];
  const parts = t
    .split(/\n\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts : [t];
}

function excerptFromBody(body: string, max = 180): string {
  const first = splitBodyParagraphs(body)[0] ?? "";
  if (first.length <= max) return first;
  return `${first.slice(0, max - 1)}…`;
}

/**
 * Resolve canonical plain-text detail content regardless of backend field variant.
 * Some installations return `bodyText`, others `body`, and list-shaped detail payloads
 * may only expose `snippet`/`preview`.
 */
export function plainTextFromWgwDetail(detail: WgwMailMessageDetail): string {
  return detail.body;
}

function senderFromApi(from: WgwMailMessageListItem["from"]): { name: string; email: string } {
  if (!from) return { name: "", email: "" };
  if (typeof from === "string") {
    const m = from.match(/^(.*?)\s*<([^>]+)>$/);
    if (m) return { name: m[1]!.trim(), email: m[2]!.trim() };
    if (from.includes("@")) return { name: from.split("@")[0] ?? from, email: from };
    return { name: from, email: "" };
  }
  const email = from.address ?? from.email ?? "";
  const name = from.name?.trim() || (email ? email.split("@")[0]! : "");
  return { name, email };
}

function recipientFromApi(raw: WgwMailMessageWire): { name: string; email: string } {
  const directName = raw.toName?.trim();
  if (directName) return { name: directName, email: "" };
  const toCandidate =
    raw.to ?? raw.recipients ?? raw.recipient ?? raw.toList ?? raw.toAddresses ?? raw.toAddress;
  if (!toCandidate) return { name: "", email: "" };
  if (Array.isArray(toCandidate)) {
    const first = toCandidate[0];
    if (!first) return { name: "", email: "" };
    return senderFromApi(first as WgwMailMessageListItem["from"]);
  }
  return senderFromApi(toCandidate as WgwMailMessageListItem["from"]);
}

function isSentMailboxLabel(mailbox: string): boolean {
  const normalized = mailbox.trim().toLowerCase();
  return normalized === "sent" || normalized.includes("sent");
}

/**
 * Build a lookup from folder token → mailbox display name using the tree from
 * `GET /mail/folders`.
 */
export function mailboxNameByFolderToken(folders: WgwMailFolderNode[]): Record<string, string> {
  const map: Record<string, string> = {};

  const walk = (nodes: WgwMailFolderNode[]) => {
    for (const n of nodes) {
      map[n.id] = n.name;
      if (n.children?.length) walk(n.children);
    }
  };
  walk(folders);
  return map;
}

/** Resolve folder token or label to the canonical display name from the folder tree when possible. */
export function resolveMailboxLabel(
  folderKey: string,
  folderNames: Record<string, string>,
): string {
  return folderNames[folderKey] ?? folderKey;
}

export function mailFromWgwListItem(
  row: WgwMailMessageListItem,
  folderNames: Record<string, string>,
  opts?: {
    /** Force list bucket to this sidebar string (fixes token vs display-name mismatches). */ mailboxDisplay?: string;
  },
): Mail {
  const wireRow = row as WgwMailMessageWire;
  const mailbox = opts?.mailboxDisplay ?? resolveMailboxLabel(row.folder, folderNames);
  const sender = senderFromApi(row.from);
  const recipient = recipientFromApi(wireRow);
  const listActor = isSentMailboxLabel(mailbox) ? recipient : sender;
  const from = listActor.name || listActor.email || "Unknown";
  const subject = row.subject?.trim() ?? "";
  const bodyText = row.snippet ?? "";
  const body = splitBodyParagraphs(bodyText);
  const id = row.messageId ?? `${row.folder}:${row.uid}`;
  return {
    id,
    folder: row.folder,
    uid: row.uid,
    from,
    email: listActor.email || from,
    mailbox,
    unread: row.read === undefined ? true : !row.read,
    starred: row.flagged === true,
    notebook: from,
    category: mailbox,
    date: row.date ?? "",
    title: subject,
    excerpt: bodyText.length > 180 ? `${bodyText.slice(0, 179)}…` : bodyText,
    body,
    bodyHtml: wireRow.bodyHtml,
    detailLoaded: false,
    tags: [],
    wordCount: wordCountFromText(bodyText),
  };
}

export function mailFromWgwDetail(
  detail: WgwMailMessageDetail,
  folderNames: Record<string, string>,
  listRow?: WgwMailMessageListItem,
): Mail {
  const base = mailFromWgwListItem(listRow ?? detail, folderNames, undefined);
  const plainText = plainTextFromWgwDetail(detail);
  const cleaned = plainText.replace(/\s+/g, " ").trim();
  const body = splitBodyParagraphs(plainText || cleaned);
  return {
    ...base,
    body: body.some((p) => p.length > 0) ? body : base.body,
    bodyHtml: detail.bodyHtml ?? undefined,
    detailLoaded: true,
    excerpt: excerptFromBody(plainText || cleaned),
    wordCount: wordCountFromText(plainText || cleaned),
  };
}
