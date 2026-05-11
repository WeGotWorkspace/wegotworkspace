import type { MailAppBootstrap } from "@/lib/api/mock/mail-bootstrap";
import type { MailUIData, MailMailboxLoader } from "@/mail-core/src/mail-types";
import type {
  WgwMailFolderNode,
  WgwMailDraftRequest,
  WgwMailMessageDetail,
  WgwMailMessageListItem,
  WgwMailMessagePatchRequest,
  WgwMailMessageResponse,
  WgwMailMoveRequest,
  WgwMailSendRequest,
} from "@/lib/api/wgw/types";
import { wgwFetch, wgwFetchPrincipal, wgwReadJson } from "@/lib/api/wgw/http";
import {
  augmentMailboxToId,
  classifyFolderTree,
  parseMailFoldersPayload,
  unreadCountByMailboxLabel,
  WGW_UI_SYSTEM_MAILBOXES,
} from "@/lib/api/wgw/mail-folder-utils";
import {
  mailFromWgwDetail,
  mailFromWgwListItem,
  mailboxNameByFolderToken,
  parseMessagesPayload,
} from "@/lib/api/wgw/mail-message-utils";
import {
  buildMailboxToFolderId,
  folderTokenCandidatesForMailbox,
} from "@/lib/api/wgw/mail-token-utils";
import type { Mail } from "@/types/mail";
export {
  coerceFolderNode,
  parseMailFoldersPayload,
  splitFoldersForUi,
  WGW_UI_SYSTEM_MAILBOXES,
} from "@/lib/api/wgw/mail-folder-utils";
export {
  coerceMailListRow,
  mailFromWgwDetail,
  mailFromWgwListItem,
  mailboxNameByFolderToken,
  parseMessagesPayload,
  resolveMailboxLabel,
} from "@/lib/api/wgw/mail-message-utils";
export {
  buildMailboxToFolderId,
  canonicalImapMailboxLabel,
  folderIdForMailboxLabel,
  folderLabelForMailbox,
  folderTokenCandidatesForMailbox,
} from "@/lib/api/wgw/mail-token-utils";

// --- encoding (sidebar label → API folder token) -----------------------------------------------

/**
 * Encode a mailbox display label to the opaque `folder` string used in
 * `MailMessagePatchRequest`, `MailMoveRequest`, and message rows (often base64).
 */
export function folderTokenFromMailboxLabel(label: string): string {
  const bytes = new TextEncoder().encode(label);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return btoa(binary);
}

// --- message parsing/mapping utilities are in mail-message-utils.ts ----------------------------

export function wgwMailPatchRequest(
  mail: Mail,
  patch: Pick<WgwMailMessagePatchRequest, "read" | "starred">,
): WgwMailMessagePatchRequest {
  return {
    folder: mail.folder,
    uid: mail.uid,
    ...patch,
  };
}

export function wgwMailMoveRequest(mail: Mail, toFolderToken: string): WgwMailMoveRequest {
  return {
    fromFolder: mail.folder,
    toFolder: toFolderToken,
    uid: mail.uid,
  };
}

/** POST `/mail/move` with explicit folder tokens. */
export async function moveMailMessageByTokens(
  input: WgwMailMoveRequest,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  await postOrPatchMail("/mail/move", "POST", input, opts);
}

async function postOrPatchMail(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const res = await wgwFetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!res.ok) {
    const text = (await res.text()).trim();
    let detail = text;
    try {
      const json = text ? (JSON.parse(text) as Record<string, unknown>) : null;
      const candidate =
        json && typeof json === "object"
          ? (json.error ?? json.message ?? json.detail ?? json.reason)
          : undefined;
      if (typeof candidate === "string" && candidate.trim()) detail = candidate.trim();
    } catch {
      // Keep raw text if parsing fails.
    }
    throw new Error(`${method} ${path} failed (${res.status})${detail ? `: ${detail}` : ""}`);
  }
}

function parseMessageDetailPayload(json: unknown): WgwMailMessageDetail {
  const raw = parseDetailRoot(json);
  if (!raw) throw new Error("Mail message payload is missing required `message` detail");

  const folder = parseDetailFolder(raw);
  const uid = parseDetailUid(raw);
  if (!folder || !Number.isFinite(uid)) {
    throw new Error("Mail message payload is missing required detail identity");
  }

  return {
    // Canonical fields consumed by app code.
    folder,
    uid,
    body: parseDetailBody(raw),
    bodyHtml: parseDetailBodyHtml(raw),
    // Optional passthrough fields used by existing mappers.
    id: readString(raw.id),
    folderId: readString(raw.folderId),
    mailbox: readString(raw.mailbox),
    messageId: parseDetailMessageId(raw),
    from: parseDetailFrom(raw),
    subject: readString(raw.subject),
    snippet: readString(raw.snippet),
    preview: readString(raw.preview),
    date: readString(raw.date),
    read: readBoolean(raw.read),
    starred: readBoolean(raw.starred),
    attachments: parseDetailAttachments(raw),
  };
}

function parseDetailAttachments(raw: Record<string, unknown>): WgwMailMessageDetail["attachments"] {
  const list = raw.attachments;
  if (!Array.isArray(list)) return undefined;
  const items = list
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => !!entry)
    .map((entry) => ({
      id: readString(entry.id),
      name: readString(entry.name) ?? readString(entry.filename) ?? "attachment",
      size: typeof entry.size === "number" ? entry.size : undefined,
      type: readString(entry.type) ?? readString(entry.contentType),
      part: readString(entry.part) ?? readString(entry.partId),
    }));
  return items.length > 0 ? items : undefined;
}

function parseDetailRoot(json: unknown): Record<string, unknown> | null {
  const root = asRecord(json);
  if (!root) return null;
  const nested = asRecord(root.message);
  return nested ?? root;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseDetailFolder(raw: Record<string, unknown>): string {
  if (typeof raw.folder === "string" && raw.folder.length > 0) return raw.folder;
  if (typeof raw.folderId === "string" && raw.folderId.length > 0) return raw.folderId;
  return "";
}

function parseDetailUid(raw: Record<string, unknown>): number {
  if (typeof raw.uid === "number" && Number.isFinite(raw.uid)) return raw.uid;
  if (typeof raw.uid === "string" && /^\s*\d+\s*$/.test(raw.uid)) return Number(raw.uid.trim());
  if (typeof raw.id === "string") {
    const idUid = raw.id.match(/:(\d+)$/)?.[1];
    if (idUid) return Number(idUid);
  }
  return NaN;
}

function parseDetailFrom(raw: Record<string, unknown>): WgwMailMessageDetail["from"] {
  const value = raw.from;
  if (typeof value === "string") return value;
  const rec = asRecord(value);
  if (!rec) return undefined;
  const name = readString(rec.name);
  const address = readString(rec.address);
  const email = readString(rec.email);
  if (!name && !address && !email) return undefined;
  return {
    ...(name ? { name } : {}),
    ...(address ? { address } : {}),
    ...(email ? { email } : {}),
  };
}

function parseDetailBodyHtml(raw: Record<string, unknown>): string | null {
  return typeof raw.bodyHtml === "string" ? raw.bodyHtml : null;
}

function parseDetailBody(raw: Record<string, unknown>): string {
  if (typeof raw.body === "string") return raw.body;
  if (typeof raw.bodyText === "string") return raw.bodyText;
  if (typeof raw.snippet === "string") return raw.snippet;
  if (typeof raw.preview === "string") return raw.preview;
  const bodyHtml = parseDetailBodyHtml(raw);
  return bodyHtml?.replace(/<[^>]+>/g, " ") ?? "";
}

function parseDetailMessageId(raw: Record<string, unknown>): string | undefined {
  if (typeof raw.messageId === "string" && raw.messageId.length > 0) return raw.messageId;
  if (typeof raw.id === "string" && raw.id.length > 0) return raw.id;
  return undefined;
}

/** PATCH `/mail/message` for read/starred updates on one message. */
export async function patchMailMessage(
  mail: Mail,
  patch: Pick<WgwMailMessagePatchRequest, "read" | "starred">,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  await postOrPatchMail("/mail/message", "PATCH", wgwMailPatchRequest(mail, patch), opts);
}

/** POST `/mail/move` for one message. */
export async function moveMailMessage(
  mail: Mail,
  toFolderToken: string,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  await moveMailMessageByTokens(wgwMailMoveRequest(mail, toFolderToken), opts);
}

/** POST `/mail/draft` for creating/updating drafts. */
export async function saveMailDraft(
  input: WgwMailDraftRequest,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  await postOrPatchMail("/mail/draft", "POST", input, opts);
}

/** POST `/mail/send` for sending messages. */
export async function sendMailMessage(
  input: WgwMailSendRequest,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  await postOrPatchMail("/mail/send", "POST", input, opts);
}

/** GET `/mail/message` for one message detail row. */
export async function fetchMailMessageDetail(
  mail: Pick<Mail, "folder" | "uid">,
): Promise<WgwMailMessageDetail | null> {
  const qp = `folder=${encodeURIComponent(mail.folder)}&uid=${encodeURIComponent(String(mail.uid))}`;
  const res = await wgwFetch(`/mail/message?${qp}`);
  if (!res.ok) throw new Error(`GET /mail/message failed (${res.status})`);
  const json = await wgwReadJson(res);
  return parseMessageDetailPayload(json);
}

/** DELETE `/mail/message` for permanent deletion of one message. */
export async function deleteMailMessage(
  mail: Pick<Mail, "folder" | "uid">,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const qp = `folder=${encodeURIComponent(mail.folder)}&uid=${encodeURIComponent(String(mail.uid))}`;
  const res = await wgwFetch(`/mail/message?${qp}`, { method: "DELETE", signal: opts?.signal });
  if (!res.ok) throw new Error(`DELETE /mail/message failed (${res.status})`);
}

/** GET `/mail/message/attachment` with auth-bearing request, returns attachment blob. */
export async function downloadMailAttachment(
  mail: Pick<Mail, "folder" | "uid">,
  attachment: { id?: string; part?: string; name: string; type?: string },
  opts?: { signal?: AbortSignal },
): Promise<Blob> {
  const params = new URLSearchParams();
  params.set("folder", mail.folder);
  params.set("uid", String(mail.uid));
  if (attachment.part) params.set("part", attachment.part);
  if (attachment.id) params.set("id", attachment.id);
  const res = await wgwFetch(`/mail/message/attachment?${params.toString()}`, {
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(`GET /mail/message/attachment failed (${res.status})`);
  return await res.blob();
}

/** When no folder tree is available, derive the API token from the UI mailbox label. */
export function folderTokenForMail(mailboxLabel: string): string {
  return folderTokenFromMailboxLabel(mailboxLabel);
}

// --- live bootstrap ----------------------------------------------------------------------------

const DEFAULT_MAILBOX_PAGE_SIZE = 40;

async function fetchMessagesPageForFolderToken(
  folderToken: string,
  opts?: { offset?: number; limit?: number; query?: string },
): Promise<{ rows: WgwMailMessageListItem[]; hasMore: boolean; nextOffset: number }> {
  const limit = Math.max(1, opts?.limit ?? DEFAULT_MAILBOX_PAGE_SIZE);
  const offset = Math.max(0, opts?.offset ?? 0);
  const query = (opts?.query ?? "").trim();
  const queryParam = query.length > 0 ? `&q=${encodeURIComponent(query)}` : "";
  const qp = `folder=${encodeURIComponent(folderToken)}&limit=${limit}&offset=${offset}${queryParam}`;
  const res = await wgwFetch(`/mail/messages?${qp}`);
  if (!res.ok) return { rows: [], hasMore: false, nextOffset: offset };
  const json = await wgwReadJson(res);
  const rows = parseMessagesPayload(json, folderToken);
  return {
    rows,
    hasMore: rows.length >= limit,
    nextOffset: offset + rows.length,
  };
}

function canonicalSystemMailboxLabel(mailboxLabel: string): string | undefined {
  const map: Record<string, string> = {
    Inbox: "Inbox",
    Starred: "Starred",
    Sent: "Sent",
    Drafts: "Drafts",
    Spam: "Spam",
    Archive: "Archive",
    Trash: "Trash",
  };
  return map[mailboxLabel];
}

function createLiveMailLoader(
  _roots: WgwMailFolderNode[],
  folderNames: Record<string, string>,
  mailboxToId: Record<string, string>,
): MailMailboxLoader {
  return {
    folderTokenForLabel: (mailboxLabel: string) =>
      folderTokenCandidatesForMailbox(
        mailboxLabel,
        mailboxToId,
        folderNames,
        folderTokenFromMailboxLabel,
      )[0],

    async loadMailbox(
      mailboxLabel: string,
      opts?: { offset?: number; limit?: number; query?: string },
    ): Promise<{ rows: Mail[]; hasMore: boolean; nextOffset: number }> {
      const tokens = folderTokenCandidatesForMailbox(
        mailboxLabel,
        mailboxToId,
        folderNames,
        folderTokenFromMailboxLabel,
      );
      const token = tokens[0];
      if (!token) return { rows: [], hasMore: false, nextOffset: opts?.offset ?? 0 };

      const sidebarName = canonicalSystemMailboxLabel(mailboxLabel) ?? mailboxLabel;
      let page = await fetchMessagesPageForFolderToken(token, opts);
      if ((opts?.offset ?? 0) === 0 && page.rows.length === 0) {
        for (const alt of tokens.slice(1)) {
          const candidate = await fetchMessagesPageForFolderToken(alt, opts);
          if (candidate.rows.length > 0) {
            page = candidate;
            break;
          }
        }
      }
      return {
        rows: page.rows.map((row) =>
          mailFromWgwListItem(row, folderNames, { mailboxDisplay: sidebarName }),
        ),
        hasMore: page.hasMore,
        nextOffset: page.nextOffset,
      };
    },
  };
}

/** Load mail folders + messages for the default mailbox only; other folders load when selected in the UI. */
export async function fetchMailLiveBootstrap(): Promise<MailAppBootstrap> {
  const session = await wgwFetchPrincipal();

  const foldersRes = await wgwFetch("/mail/folders");
  if (!foldersRes.ok) throw new Error(`GET /mail/folders failed (${foldersRes.status})`);
  const foldersJson = await wgwReadJson(foldersRes);
  const roots = parseMailFoldersPayload(foldersJson);
  const { slotToId, slotToUnreadCount, moreMailboxes } = classifyFolderTree(roots);
  const unreadByLabel = unreadCountByMailboxLabel(roots);
  const folderNames = mailboxNameByFolderToken(roots);
  const mailboxToId = augmentMailboxToId(buildMailboxToFolderId(roots), slotToId);

  const mailboxLabels = ["Inbox", "Starred", ...WGW_UI_SYSTEM_MAILBOXES, ...moreMailboxes];
  const seenMailbox = new Set<string>();
  const mailboxes = mailboxLabels
    .filter((label) => {
      if (seenMailbox.has(label)) return false;
      seenMailbox.add(label);
      return true;
    })
    .map((label) => {
      const unreadCount =
        unreadByLabel[label] ?? slotToUnreadCount[label as keyof typeof slotToUnreadCount];
      return unreadCount === undefined ? { label } : { label, unreadCount };
    });
  const defaultLabel = "Inbox";
  const mailboxLoader = createLiveMailLoader(roots, folderNames, mailboxToId);

  const defaultTokens = folderTokenCandidatesForMailbox(
    defaultLabel,
    mailboxToId,
    folderNames,
    folderTokenFromMailboxLabel,
  );
  let initialPage =
    defaultTokens.length > 0
      ? await fetchMessagesPageForFolderToken(defaultTokens[0]!, {
          offset: 0,
          limit: DEFAULT_MAILBOX_PAGE_SIZE,
        })
      : { rows: [], hasMore: false, nextOffset: 0 };
  if (initialPage.rows.length === 0 && defaultTokens.length > 1) {
    for (const token of defaultTokens.slice(1)) {
      const candidate = await fetchMessagesPageForFolderToken(token, {
        offset: 0,
        limit: DEFAULT_MAILBOX_PAGE_SIZE,
      });
      if (candidate.rows.length > 0) {
        initialPage = candidate;
        break;
      }
    }
  }
  const initialRows = initialPage.rows;
  const initialSidebarName = canonicalSystemMailboxLabel(defaultLabel) ?? defaultLabel;
  const mail: Mail[] = initialRows.map((row) =>
    mailFromWgwListItem(row, folderNames, { mailboxDisplay: initialSidebarName }),
  );

  const data: MailUIData = {
    mail,
    mailboxes,
  };

  return { data, session, mailboxLoader };
}
