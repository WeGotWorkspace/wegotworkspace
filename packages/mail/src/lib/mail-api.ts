import type {
  MailAttachmentsResponse,
  MailConfigPutRequest,
  MailConfigResponse,
  MailDraftRequest,
  MailDraftResponse,
  MailFolder as MailFolderSchema,
  MailFolderCreateRequest,
  MailFolderMoveRequest,
  MailFolderMutationResponse,
  MailFoldersResponse,
  MailMessageDetail,
  MailMessageListItem,
  MailMessagePatchRequest,
  MailMessageResponse,
  MailMessagesResponse,
  MailMoveRequest,
  MailPublicConfig,
  MailSendRequest,
  MailSendResponse,
  MailStatusResponse,
  OkResponse,
} from "../../../api/openapi/generated/mail-types";

function apiV1BaseUrl(): string {
  if (typeof window === "undefined") {
    return "/api/v1";
  }
  const path = window.location.pathname;
  const marker = "/mail/";
  const idx = path.indexOf(marker);
  const basePrefix = idx >= 0 ? path.slice(0, idx) : "";
  return `${basePrefix}/api/v1`;
}

const API_BASE = apiV1BaseUrl().replace(/\/+$/, "");
const AUTH_SESSION_URL = `${API_BASE}/auth/session`;
const AUTH_REFRESH_URL = `${API_BASE}/auth/refresh`;

type TokenPair = {
  access_token: string;
  refresh_token: string;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

function parseErrorMessage(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return "Request failed";
  }
  try {
    const json = JSON.parse(trimmed) as { message?: unknown; error?: unknown };
    if (typeof json.message === "string" && json.message.trim() !== "") return json.message;
    if (typeof json.error === "string" && json.error.trim() !== "") return json.error;
  } catch {
    // Not JSON.
  }
  return trimmed;
}

async function mintTokenFromSession(): Promise<void> {
  const response = await fetch(AUTH_SESSION_URL, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(raw));
  }
  const payload = JSON.parse(raw) as TokenPair;
  accessToken = payload.access_token ?? null;
  refreshToken = payload.refresh_token ?? null;
  if (!accessToken || !refreshToken) {
    throw new Error("Could not initialize Mail API session.");
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) return false;
  const response = await fetch(AUTH_REFRESH_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const raw = await response.text();
  if (!response.ok) return false;
  const payload = JSON.parse(raw) as TokenPair;
  accessToken = payload.access_token ?? null;
  refreshToken = payload.refresh_token ?? null;
  return !!accessToken && !!refreshToken;
}

async function ensureAccessToken(): Promise<string> {
  if (!accessToken) {
    await mintTokenFromSession();
  }
  if (!accessToken) {
    throw new Error("Missing Mail API access token.");
  }
  return accessToken;
}

async function withAuth(input: RequestInfo | URL, init?: RequestInit, allowRetry = true): Promise<Response> {
  const token = await ensureAccessToken();
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (response.status !== 401 || !allowRetry) return response;
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    accessToken = null;
    refreshToken = null;
    await mintTokenFromSession();
  }
  return withAuth(input, init, false);
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const tail = path.startsWith("/") ? path : `/${path}`;
  const r = await withAuth(`${API_BASE}/mail${tail}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const text = await r.text();
  let data: unknown = null;
  let parseFailed = false;
  if (text !== "") {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      parseFailed = true;
      data = { error: "invalid_json", raw: text.slice(0, 200) };
    }
  }
  if (!r.ok) {
    let err = `HTTP ${r.status}`;
    if (data && typeof data === "object" && data !== null) {
      const o = data as { message?: string; error?: string };
      if (typeof o.message === "string" && o.message.trim() !== "") {
        err = o.message;
      } else if (typeof o.error === "string" && o.error.trim() !== "") {
        err = o.error;
      }
    }
    throw new Error(err);
  }
  if (parseFailed) {
    throw new Error(
      "Mail API returned non-JSON.",
    );
  }
  if (data === null) {
    throw new Error("Mail API returned an empty body.");
  }
  return data as T;
}

export type MailStatus = MailStatusResponse;
export type MailConfigPublic = MailPublicConfig;
export type MailFolder = MailFolderSchema;
export type MailMessageDto = MailMessageListItem & { bodyHtml?: MailMessageDetail["bodyHtml"] };

export async function mailStatus(): Promise<MailStatus> {
  return req<MailStatus>("/status");
}

export async function mailConfigGet(): Promise<MailConfigResponse> {
  return req<MailConfigResponse>("/config");
}

export async function mailConfigPut(body: MailConfigPutRequest): Promise<MailConfigResponse> {
  return req<MailConfigResponse>("/config", { method: "PUT", body: JSON.stringify(body) });
}

export async function mailFolders(): Promise<MailFoldersResponse> {
  return req<MailFoldersResponse>("/folders");
}

export async function mailMessages(
  folderId: string,
  opts?: { limit?: number; offset?: number; q?: string; unseen?: boolean },
): Promise<MailMessagesResponse> {
  const q = new URLSearchParams({ folder: folderId });
  if (opts?.limit != null) q.set("limit", String(opts.limit));
  if (opts?.offset != null) q.set("offset", String(opts.offset));
  if (opts?.q != null && opts.q.trim() !== "") q.set("q", opts.q.trim());
  if (opts?.unseen) q.set("unseen", "1");
  return req<MailMessagesResponse>(`/messages?${q.toString()}`);
}

export type MailAttachmentHintItem = {
  id: string;
  attachments: MailMessageDto["attachments"];
};

/** After {@link mailMessages}, fetch MIME attachment summaries for list rows (deferred IMAP structure scan). */
export async function mailMessageAttachmentHints(
  folderId: string,
  messageIds: string[],
): Promise<MailAttachmentsResponse> {
  const uids: number[] = [];
  const seen = new Set<number>();
  for (const id of messageIds) {
    const sp = splitMessageId(id);
    if (!sp) continue;
    if (seen.has(sp.uid)) continue;
    seen.add(sp.uid);
    uids.push(sp.uid);
    if (uids.length >= 80) break;
  }
  if (uids.length === 0) {
    return { items: [] };
  }
  const q = new URLSearchParams({
    folder: folderId,
    uids: uids.join(","),
  });
  return req<MailAttachmentsResponse>(`/messages/attachments?${q.toString()}`);
}

export async function mailMessage(
  folderEnc: string,
  uid: number,
  opts?: { inlineImages?: boolean },
): Promise<MailMessageResponse> {
  const q = new URLSearchParams({ folder: folderEnc, uid: String(uid) });
  if (opts?.inlineImages) {
    q.set("inline_images", "1");
  }
  return req<MailMessageResponse>(`/message?${q.toString()}`);
}

export async function mailPatchMessage(payload: MailMessagePatchRequest): Promise<OkResponse> {
  return req<OkResponse>("/message", { method: "PATCH", body: JSON.stringify(payload) });
}

export async function mailMove(payload: MailMoveRequest): Promise<OkResponse> {
  return req<OkResponse>("/move", { method: "POST", body: JSON.stringify(payload) });
}

export async function mailSend(payload: MailSendRequest): Promise<MailSendResponse> {
  return req<MailSendResponse>("/send", { method: "POST", body: JSON.stringify(payload) });
}

export async function mailSaveDraft(payload: MailDraftRequest): Promise<MailDraftResponse> {
  return req<MailDraftResponse>("/draft", { method: "POST", body: JSON.stringify(payload) });
}

export async function mailFolderCreate(body: MailFolderCreateRequest): Promise<MailFolderMutationResponse> {
  return req<MailFolderMutationResponse>("/folders", { method: "POST", body: JSON.stringify(body) });
}

export async function mailFolderDelete(folderEnc: string): Promise<OkResponse> {
  const q = new URLSearchParams({ folder: folderEnc });
  return req<OkResponse>(`/folders?${q.toString()}`, { method: "DELETE" });
}

export async function mailFolderMove(
  body: Pick<MailFolderMoveRequest, "folder" | "parentMailbox">,
): Promise<MailFolderMutationResponse> {
  return req<MailFolderMutationResponse>("/folders", {
    method: "PATCH",
    body: JSON.stringify({
      folder: body.folder,
      parentMailbox: body.parentMailbox ?? "",
    }),
  });
}

export function splitMessageId(id: string): { folderEnc: string; uid: number } | null {
  const i = id.indexOf(":");
  if (i <= 0) return null;
  const folderEnc = id.slice(0, i);
  const uid = Number(id.slice(i + 1));
  if (!Number.isFinite(uid) || uid <= 0) return null;
  return { folderEnc, uid };
}

export async function mailDownloadAttachment(
  folderEnc: string,
  uid: number,
  part: string,
  filename = "attachment",
): Promise<void> {
  const q = new URLSearchParams({ folder: folderEnc, uid: String(uid), part });
  const response = await withAuth(`${API_BASE}/mail/message/attachment?${q.toString()}`, {
    method: "GET",
    headers: {},
  });
  if (!response.ok) {
    throw new Error(parseErrorMessage(await response.text()));
  }
  const blob = await response.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = href;
  a.download = filename || "attachment";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(href);
}
