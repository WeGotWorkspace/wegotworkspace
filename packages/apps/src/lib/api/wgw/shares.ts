/**
 * File-sharing HTTP client.
 *
 * - Owner side (`/files/shares*`) reuses the authenticated {@link wgwFetch} helper.
 * - Public/recipient side (`/shares/{token}*`) is unauthenticated: the link token lives in
 *   the path and a confirmed-email credential is sent via the `X-Wgw-Share-Access` header.
 */
import { wgwApiBaseUrl, wgwFetch, wgwReadJson } from "@/lib/api/wgw/http";
import { normalizeApiVirtualPath } from "@/lib/files/api-path";
import type {
  WgwShare,
  WgwShareChildren,
  WgwShareConfirmResult,
  WgwShareCreateInput,
  WgwShareGrantRequestResult,
  WgwShareGrantsInput,
  WgwSharePublicMeta,
  WgwShareUpdateInput,
} from "@/lib/api/wgw/shares-types";

export const SHARE_ACCESS_HEADER = "X-Wgw-Share-Access";

/** Loose RFC-5322-ish check good enough for client-side invite validation. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidShareEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/**
 * Split a free-form input (comma / semicolon / whitespace / newline separated) into a
 * de-duplicated, lower-cased list of valid email addresses. Invalid tokens are dropped.
 */
export function parseShareEmailList(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const token of raw.split(/[\s,;]+/)) {
    const email = token.trim().toLowerCase();
    if (email === "" || seen.has(email) || !isValidShareEmail(email)) continue;
    seen.add(email);
    result.push(email);
  }
  return result;
}

/** Build the absolute public viewer URL for a link token. */
export function shareViewerUrl(origin: string, token: string): string {
  const trimmed = origin.replace(/\/+$/, "");
  return `${trimmed}/s/${encodeURIComponent(token)}`;
}

function relativeSharePath(path: string | null | undefined): string {
  if (!path) return "";
  return path.replace(/^\/+/, "").replace(/\/+$/, "");
}

async function readShareApiError(res: Response, fallback: string): Promise<string> {
  try {
    const payload = (await res.clone().json()) as { error?: string; message?: string };
    const message = payload.error ?? payload.message;
    if (typeof message === "string" && message.trim() !== "") return message;
  } catch {
    // Fall through to plain-text body.
  }
  try {
    const text = await res.text();
    if (text.trim() !== "") return text.trim();
  } catch {
    // Ignore body read failures.
  }
  return fallback;
}

/* -------------------------------------------------------------------------- */
/* Owner side (`Authorization: Bearer <jwt>`)                                  */
/* -------------------------------------------------------------------------- */

export type ShareOwnerOperations = {
  listShares: (path?: string, opts?: { signal?: AbortSignal }) => Promise<WgwShare[]>;
  createShare: (input: WgwShareCreateInput, opts?: { signal?: AbortSignal }) => Promise<WgwShare>;
  updateShare: (
    shareId: string,
    input: WgwShareUpdateInput,
    opts?: { signal?: AbortSignal },
  ) => Promise<WgwShare>;
  revokeShare: (shareId: string, opts?: { signal?: AbortSignal }) => Promise<void>;
  addShareGrants: (
    shareId: string,
    input: WgwShareGrantsInput,
    opts?: { signal?: AbortSignal },
  ) => Promise<WgwShare>;
  removeShareGrant: (
    shareId: string,
    grantId: string,
    opts?: { signal?: AbortSignal },
  ) => Promise<WgwShare>;
};

async function ownerJson<T>(path: string, init: RequestInit, fallback: string): Promise<T> {
  const res = await wgwFetch(path, init);
  if (!res.ok) throw new Error(await readShareApiError(res, fallback));
  return (await wgwReadJson(res)) as T;
}

export function createWgwShareOwnerOperations(): ShareOwnerOperations {
  return {
    async listShares(path, opts) {
      const query = path ? `?path=${encodeURIComponent(normalizeApiVirtualPath(path))}` : "";
      const payload = await ownerJson<{ data: { shares: WgwShare[] } }>(
        `/files/shares${query}`,
        { method: "GET", signal: opts?.signal },
        "GET /files/shares failed",
      );
      return payload.data.shares;
    },
    async createShare(input, opts) {
      const payload = await ownerJson<{ data: WgwShare }>(
        "/files/shares",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: normalizeApiVirtualPath(input.path),
            publicAccess: input.publicAccess,
            ...(input.expiresAt !== undefined ? { expiresAt: input.expiresAt } : {}),
          }),
          signal: opts?.signal,
        },
        "POST /files/shares failed",
      );
      return payload.data;
    },
    async updateShare(shareId, input, opts) {
      const payload = await ownerJson<{ data: WgwShare }>(
        `/files/shares/${encodeURIComponent(shareId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: opts?.signal,
        },
        "PATCH /files/shares failed",
      );
      return payload.data;
    },
    async revokeShare(shareId, opts) {
      const res = await wgwFetch(`/files/shares/${encodeURIComponent(shareId)}`, {
        method: "DELETE",
        signal: opts?.signal,
      });
      if (!res.ok) throw new Error(await readShareApiError(res, "DELETE /files/shares failed"));
    },
    async addShareGrants(shareId, input, opts) {
      const payload = await ownerJson<{ data: WgwShare }>(
        `/files/shares/${encodeURIComponent(shareId)}/grants`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
          signal: opts?.signal,
        },
        "POST /files/shares/{id}/grants failed",
      );
      return payload.data;
    },
    async removeShareGrant(shareId, grantId, opts) {
      const payload = await ownerJson<{ data: WgwShare }>(
        `/files/shares/${encodeURIComponent(shareId)}/grants/${encodeURIComponent(grantId)}`,
        { method: "DELETE", signal: opts?.signal },
        "DELETE /files/shares/{id}/grants/{grantId} failed",
      );
      return payload.data;
    },
  };
}

/* -------------------------------------------------------------------------- */
/* Public / recipient side (no JWT; link token in path + access header)        */
/* -------------------------------------------------------------------------- */

export type ShareAccessTokenProvider = () => string | null | undefined;

function shareGuestFetch(
  path: string,
  init: RequestInit,
  accessToken?: string | null,
): Promise<Response> {
  const base = wgwApiBaseUrl();
  const normalized = path.startsWith("/") ? path : `/${path}`;
  const headers = new Headers(init.headers);
  if (accessToken) headers.set(SHARE_ACCESS_HEADER, accessToken);
  return fetch(`${base}${normalized}`, { ...init, headers });
}

export async function fetchSharePublicMeta(
  token: string,
  accessToken?: string | null,
  opts?: { signal?: AbortSignal },
): Promise<WgwSharePublicMeta> {
  const res = await shareGuestFetch(
    `/shares/${encodeURIComponent(token)}`,
    { method: "GET", signal: opts?.signal },
    accessToken,
  );
  if (!res.ok) throw new Error(await readShareApiError(res, "GET /shares/{token} failed"));
  const payload = (await res.json()) as { data: WgwSharePublicMeta };
  return payload.data;
}

export async function requestShareGrant(
  token: string,
  email: string,
  opts?: { signal?: AbortSignal },
): Promise<WgwShareGrantRequestResult> {
  const res = await shareGuestFetch(`/shares/${encodeURIComponent(token)}/grants`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim() }),
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(await readShareApiError(res, "POST /shares/{token}/grants failed"));
  const payload = (await res.json()) as { data: WgwShareGrantRequestResult };
  return payload.data;
}

export async function confirmShareGrant(
  inviteToken: string,
  opts?: { signal?: AbortSignal },
): Promise<WgwShareConfirmResult> {
  const res = await shareGuestFetch("/shares/grants/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ inviteToken }),
    signal: opts?.signal,
  });
  if (!res.ok) throw new Error(await readShareApiError(res, "POST /shares/grants/confirm failed"));
  const payload = (await res.json()) as { data: WgwShareConfirmResult };
  return payload.data;
}

export async function fetchShareChildren(
  token: string,
  path: string,
  accessToken?: string | null,
  opts?: { signal?: AbortSignal },
): Promise<WgwShareChildren> {
  const rel = relativeSharePath(path);
  const query = rel ? `?path=${encodeURIComponent(rel)}` : "";
  const res = await shareGuestFetch(
    `/shares/${encodeURIComponent(token)}/children${query}`,
    { method: "GET", signal: opts?.signal },
    accessToken,
  );
  if (!res.ok) throw new Error(await readShareApiError(res, "GET /shares/{token}/children failed"));
  const payload = (await res.json()) as { data: WgwShareChildren };
  return payload.data;
}

function shareContentUrl(token: string, path: string): string {
  const rel = relativeSharePath(path);
  const query = rel ? `?path=${encodeURIComponent(rel)}` : "";
  return `/shares/${encodeURIComponent(token)}/content${query}`;
}

export async function fetchShareContentBlob(
  token: string,
  path: string,
  accessToken?: string | null,
  opts?: { signal?: AbortSignal },
): Promise<Blob> {
  const res = await shareGuestFetch(
    shareContentUrl(token, path),
    { method: "GET", signal: opts?.signal },
    accessToken,
  );
  if (!res.ok) throw new Error(await readShareApiError(res, "GET /shares/{token}/content failed"));
  return res.blob();
}

export async function createShareDirectory(
  token: string,
  input: { name: string; path?: string | null },
  accessToken?: string | null,
  opts?: { signal?: AbortSignal },
): Promise<void> {
  const res = await shareGuestFetch(
    `/shares/${encodeURIComponent(token)}/directories`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: input.name.trim(),
        path: input.path ? relativeSharePath(input.path) : null,
      }),
      signal: opts?.signal,
    },
    accessToken,
  );
  if (!res.ok) {
    throw new Error(await readShareApiError(res, "POST /shares/{token}/directories failed"));
  }
}

export type ShareUploadProgressInput = {
  uploadedBytes: number;
  totalBytes: number;
  filesCompleted: number;
  filesTotal: number;
  currentFileName: string;
};

const SHARE_UPLOAD_CHUNK_SIZE = 1 * 1024 * 1024;

function shareUploadIdentifier(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`.replace(/[^0-9A-Za-z_]/g, "_");
}

export async function uploadShareContent(
  token: string,
  input: { parentPath: string; files: File[] },
  accessToken?: string | null,
  opts?: { signal?: AbortSignal; onProgress?: (progress: ShareUploadProgressInput) => void },
): Promise<void> {
  const totalBytes = input.files.reduce((sum, file) => sum + file.size, 0);
  const filesTotal = input.files.length;
  let uploadedBytes = 0;
  let filesCompleted = 0;
  const publish = (currentFileName: string) => {
    opts?.onProgress?.({ uploadedBytes, totalBytes, filesCompleted, filesTotal, currentFileName });
  };
  publish(input.files[0]?.name ?? "");
  for (const file of input.files) {
    const chunks = Math.max(1, Math.ceil(file.size / SHARE_UPLOAD_CHUNK_SIZE));
    const identifier = shareUploadIdentifier(file);
    for (let index = 0; index < chunks; index += 1) {
      const start = index * SHARE_UPLOAD_CHUNK_SIZE;
      const end = Math.min(file.size, start + SHARE_UPLOAD_CHUNK_SIZE);
      const chunk = file.slice(start, end);
      const form = new FormData();
      form.append("file", chunk, file.name);
      form.append("resumableFilename", file.name);
      form.append("resumableIdentifier", identifier);
      form.append("resumableChunkNumber", String(index + 1));
      form.append("resumableTotalChunks", String(chunks));
      const res = await shareGuestFetch(
        shareContentUrl(token, input.parentPath),
        { method: "POST", body: form, signal: opts?.signal },
        accessToken,
      );
      if (!res.ok) {
        throw new Error(await readShareApiError(res, "POST /shares/{token}/content failed"));
      }
      uploadedBytes += chunk.size;
      publish(file.name);
    }
    filesCompleted += 1;
    publish(file.name);
  }
}
