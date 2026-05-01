/**
 * Browser client for the token-based Drive API ({@code /api/v1/drive/*}).
 * Uses the browser session cookie to mint/refresh Bearer tokens via auth endpoints.
 */

function normalizeBaseUrl(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function fallbackApiBaseUrlFromLocation(): string {
  const path = window.location.pathname;
  const marker = "/drive/";
  const idx = path.indexOf(marker);
  const basePrefix = idx >= 0 ? path.slice(0, idx) : "";
  return `${basePrefix}/api/v1/drive`;
}

function fallbackDownloadBaseUrlFromLocation(): string {
  const path = window.location.pathname;
  if (path.endsWith("/drive")) {
    return `${path}/`;
  }
  const marker = "/drive/";
  const idx = path.indexOf(marker);
  if (idx >= 0) {
    return path.slice(0, idx + marker.length);
  }
  return import.meta.env.BASE_URL;
}

function resolveApiBaseUrl(): string {
  const configured = window.__SABRE_DRIVE_CONFIG__?.apiBaseUrl;
  if (typeof configured === "string" && configured.trim() !== "") {
    return normalizeBaseUrl(configured);
  }
  return normalizeBaseUrl(fallbackApiBaseUrlFromLocation());
}

function resolveDownloadBaseUrl(): string {
  const configured = window.__SABRE_DRIVE_CONFIG__?.downloadBaseUrl;
  if (typeof configured === "string" && configured.trim() !== "") {
    return normalizeBaseUrl(configured);
  }

  return normalizeBaseUrl(fallbackDownloadBaseUrlFromLocation());
}

function resolveAuthSessionUrl(): string {
  const configured = window.__SABRE_DRIVE_CONFIG__?.authSessionUrl;
  if (typeof configured === "string" && configured.trim() !== "") {
    return configured.trim();
  }

  return `${resolveApiBaseUrl().replace(/\/drive\/?$/, "")}/auth/session`;
}

function resolveAuthRefreshUrl(): string {
  const configured = window.__SABRE_DRIVE_CONFIG__?.authRefreshUrl;
  if (typeof configured === "string" && configured.trim() !== "") {
    return configured.trim();
  }

  return `${resolveApiBaseUrl().replace(/\/drive\/?$/, "")}/auth/refresh`;
}

function routeUrl(route: string): string {
  const normalizedRoute = route.replace(/^\/+/, "");
  return `${apiBase}${normalizedRoute}`;
}

const apiBase = resolveApiBaseUrl();
const downloadBase = resolveDownloadBaseUrl();
const authSessionUrl = resolveAuthSessionUrl();
const authRefreshUrl = resolveAuthRefreshUrl();

type AuthTokenResponse = {
  access_token: string;
  refresh_token: string;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

/** Base64 path segment expected by Drive {@code GET /download}. */
export function driveDownloadUrl(filePath: string): string {
  const bytes = new TextEncoder().encode(filePath);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const pathParam = btoa(binary);
  return `${downloadBase}?r=${encodeURIComponent("/download")}&path=${encodeURIComponent(pathParam)}`;
}

function parseJsonOrNull(raw: string): unknown {
  const t = raw.trim();
  if (!t) {
    return null;
  }
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

async function mintTokenFromSession(): Promise<void> {
  const r = await fetch(authSessionUrl, {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });
  const raw = await r.text();
  if (!r.ok) {
    throw new Error(parseDriveApiMessage(raw) || `Could not start API session (${r.status})`);
  }
  const payload = parseJsonOrNull(raw) as AuthTokenResponse | null;
  if (!payload?.access_token || !payload?.refresh_token) {
    throw new Error("API auth did not return an access token.");
  }
  accessToken = payload.access_token;
  refreshToken = payload.refresh_token;
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) {
    return false;
  }
  const r = await fetch(authRefreshUrl, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const raw = await r.text();
  if (!r.ok) {
    return false;
  }
  const payload = parseJsonOrNull(raw) as AuthTokenResponse | null;
  if (!payload?.access_token || !payload?.refresh_token) {
    return false;
  }
  accessToken = payload.access_token;
  refreshToken = payload.refresh_token;

  return true;
}

async function ensureAccessToken(): Promise<string> {
  if (!accessToken) {
    await mintTokenFromSession();
  }
  if (!accessToken) {
    throw new Error("Missing API access token.");
  }

  return accessToken;
}

async function withAuth(
  input: RequestInfo | URL,
  init?: RequestInit,
  allowRetry = true,
): Promise<Response> {
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
  if (response.status !== 401 || !allowRetry) {
    return response;
  }

  const refreshed = await refreshAccessToken();
  if (refreshed) {
    return withAuth(input, init, false);
  }

  accessToken = null;
  const reminted = await (async () => {
    try {
      await mintTokenFromSession();
      return true;
    } catch {
      return false;
    }
  })();
  if (!reminted) {
    return response;
  }

  return withAuth(input, init, false);
}

export async function drivePost<T = unknown>(route: string, body: Record<string, unknown> = {}): Promise<T> {
  const r = await withAuth(routeUrl(route), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(parseDriveApiMessage(t) || `Request failed (${r.status})`);
  }
  return (await r.json()) as T;
}

export async function driveGet<T = unknown>(route: string): Promise<T> {
  const r = await withAuth(routeUrl(route), {
    method: "GET",
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(parseDriveApiMessage(t) || `Request failed (${r.status})`);
  }
  return (await r.json()) as T;
}

function parseDriveApiMessage(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "";
  }
  try {
    const j = JSON.parse(t) as { data?: unknown; error?: unknown };
    if (typeof j.error === "string") {
      return j.error;
    }
    if (typeof j.data === "string") {
      return j.data;
    }
    if (j.data != null && typeof j.data !== "object") {
      return String(j.data);
    }
  } catch {
    /* not JSON */
  }
  return t;
}

export interface DriveDirEntry {
  type: string;
  path: string;
  name: string;
  size: number;
  time: number;
  permissions: number;
}

export interface DriveDirResponse {
  data: {
    location: string;
    files: DriveDirEntry[];
  };
}

/** Recursive filename search (server applies the same storage ACL as directory listing). */
export async function driveSearchFilenames(
  q: string,
  opts?: { limit?: number },
): Promise<DriveDirResponse> {
  const trimmed = q.trim();
  return drivePost<DriveDirResponse>("/searchfiles", {
    q: trimmed,
    ...(opts?.limit != null ? { limit: opts.limit } : {}),
  });
}

export interface DriveUser {
  username?: string;
  name?: string;
  role?: string;
}

export interface DriveUserResponse {
  data: DriveUser;
}

/** Create a directory under {@code cwd} using the same storage as listing. */
export async function driveCreateFolder(cwd: string, name: string): Promise<void> {
  await drivePost("/createnew", { cwd, type: "dir", name: name.trim() });
}

export type DriveDeleteItem = { path: string; type: "dir" | "file" };

/** Permanently removes files and/or directories ({@code /deleteitems}). */
export async function driveDeleteItems(items: DriveDeleteItem[]): Promise<void> {
  if (items.length === 0) {
    return;
  }
  await drivePost("/deleteitems", { items });
}

/**
 * Small chunks so uploads survive typical reverse-proxy limits (e.g. nginx {@code client_max_body_size 1m};
 * a 1MiB chunk plus multipart overhead is often rejected before PHP runs).
 */
const UPLOAD_CHUNK_BYTES = 256 * 1024;

function uploadResumableIdentifier(): string {
  const raw = `u${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
  return raw.replace(/[^0-9a-zA-Z_]/g, "_");
}

function appendResumableFields(
  form: FormData,
  params: {
    chunkNumber: number;
    chunkSize: number;
    currentChunkSize: number;
    totalSize: number;
    totalChunks: number;
    identifier: string;
    filename: string;
    relativePath: string;
    mime: string;
  },
): void {
  form.append("resumableChunkNumber", String(params.chunkNumber));
  form.append("resumableChunkSize", String(params.chunkSize));
  form.append("resumableCurrentChunkSize", String(params.currentChunkSize));
  form.append("resumableTotalSize", String(params.totalSize));
  form.append("resumableType", params.mime);
  form.append("resumableIdentifier", params.identifier);
  form.append("resumableFilename", params.filename);
  form.append("resumableRelativePath", params.relativePath);
  form.append("resumableTotalChunks", String(params.totalChunks));
}

export type DriveUploadProgress = {
  fileIndex: number;
  fileCount: number;
  fileName: string;
  /** 0..1 within the current file */
  fileProgress: number;
};

/**
 * Resumable-style multipart upload to {@code cwd} ({@code /upload}), same storage as WebDAV.
 */
export async function driveUploadFiles(
  cwd: string,
  files: File[],
  opts?: {
    signal?: AbortSignal;
    onProgress?: (p: DriveUploadProgress) => void;
  },
): Promise<void> {
  if (files.length === 0) {
    return;
  }

  for (let fi = 0; fi < files.length; fi++) {
    const file = files[fi];
    const totalChunks = Math.max(1, Math.ceil(file.size / UPLOAD_CHUNK_BYTES));
    const identifier = uploadResumableIdentifier();
    const mime = file.type && file.type.length > 0 ? file.type : "application/octet-stream";

    for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
      if (opts?.signal?.aborted) {
        throw new DOMException("Aborted", "AbortError");
      }

      const pre = new URLSearchParams({
        resumableFilename: file.name,
        resumableIdentifier: identifier,
        resumableChunkNumber: String(chunkNumber),
      });
      const check = await withAuth(`${routeUrl("/upload")}?${pre.toString()}`, { method: "GET", signal: opts?.signal });
      if (!check.ok) {
        const checkRaw = await check.text();
        throw new Error(parseDriveApiMessage(checkRaw) || `Upload check failed (${check.status})`);
      }

      const start = (chunkNumber - 1) * UPLOAD_CHUNK_BYTES;
      const end = Math.min(start + UPLOAD_CHUNK_BYTES, file.size);
      const currentChunkSize = end - start;

      const form = new FormData();
      appendResumableFields(form, {
        chunkNumber,
        chunkSize: UPLOAD_CHUNK_BYTES,
        currentChunkSize,
        totalSize: file.size,
        totalChunks,
        identifier,
        filename: file.name,
        relativePath: cwd,
        mime,
      });
      form.append("cwd", cwd);

      const bodyChunk =
        totalChunks === 1
          ? file
          : new File([file.slice(start, end)], file.name, {
              type: mime,
              lastModified: file.lastModified,
            });
      form.append("file", bodyChunk);

      const token = await ensureAccessToken();
      const r = await fetch(routeUrl("/upload"), {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: form,
        signal: opts?.signal,
      });

      const rawText = await r.text();
      const message = parseDriveApiMessage(rawText) || rawText;

      if (r.status === 401) {
        accessToken = null;
        if (!(await refreshAccessToken())) {
          throw new Error(message || "Upload authorization failed.");
        }
        chunkNumber -= 1;
        continue;
      }
      if (!r.ok) {
        throw new Error(message || `Upload failed (${r.status})`);
      }
      if (chunkNumber < totalChunks) {
        if (message !== "Uploaded") {
          throw new Error(message || "Upload chunk failed.");
        }
      } else if (message !== "Stored") {
        throw new Error(message || "Could not store file.");
      }

      opts?.onProgress?.({
        fileIndex: fi,
        fileCount: files.length,
        fileName: file.name,
        fileProgress: chunkNumber / totalChunks,
      });
    }

    opts?.onProgress?.({
      fileIndex: fi,
      fileCount: files.length,
      fileName: file.name,
      fileProgress: 1,
    });
  }
}
