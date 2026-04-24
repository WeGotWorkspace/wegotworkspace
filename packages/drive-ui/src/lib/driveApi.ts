/**
 * Browser client for the Drive JSON API served at {@code /drive/?r=…} (same origin, HTTP Basic + CSRF cookie).
 */

function normalizeBaseUrl(path: string): string {
  const trimmed = path.trim();
  if (!trimmed) {
    return "/";
  }
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading : `${withLeading}/`;
}

function fallbackBaseUrlFromLocation(): string {
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

function resolveBaseUrl(): string {
  const configured = window.__SABRE_DRIVE_CONFIG__?.apiBaseUrl;
  if (typeof configured === "string" && configured.trim() !== "") {
    return normalizeBaseUrl(configured);
  }
  return normalizeBaseUrl(fallbackBaseUrlFromLocation());
}

const base = resolveBaseUrl();

/** Base64 path segment expected by Drive {@code GET /download}. */
export function driveDownloadUrl(filePath: string): string {
  const bytes = new TextEncoder().encode(filePath);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const pathParam = btoa(binary);
  return `${base}?r=${encodeURIComponent("/download")}&path=${encodeURIComponent(pathParam)}`;
}

let csrfToken: string | null = null;

function absorbCsrfFromResponse(r: Response): void {
  const t = r.headers.get("X-CSRF-Token");
  if (t) {
    csrfToken = t;
  }
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

function readCsrfToken(payload: unknown): string | null {
  if (payload == null || typeof payload !== "object") {
    return null;
  }

  const obj = payload as Record<string, unknown>;
  const direct = [obj.csrf, obj.csrfToken, obj.csrf_token];
  for (const candidate of direct) {
    if (typeof candidate === "string" && candidate.trim() !== "") {
      return candidate;
    }
  }

  const data = obj.data;
  if (data != null && typeof data === "object") {
    const nested = data as Record<string, unknown>;
    const nestedCandidates = [nested.csrf, nested.csrfToken, nested.csrf_token];
    for (const candidate of nestedCandidates) {
      if (typeof candidate === "string" && candidate.trim() !== "") {
        return candidate;
      }
    }
  }

  return null;
}

/** Fetches a fresh CSRF token (also updates the in-memory token used by POSTs). */
export async function refreshCsrf(): Promise<string> {
  const r = await fetch(`${base}?r=${encodeURIComponent("/getuser")}`, {
    method: "GET",
    credentials: "include",
  });
  absorbCsrfFromResponse(r);
  const raw = await r.text();
  if (!r.ok) {
    throw new Error(parseDriveApiMessage(raw) || `Request failed (${r.status})`);
  }
  if (!csrfToken) {
    const fromBody = readCsrfToken(parseJsonOrNull(raw));
    if (fromBody) {
      csrfToken = fromBody;
    }
  }
  if (!csrfToken) {
    throw new Error("Drive API did not return a CSRF token. Reload the page.");
  }
  return csrfToken;
}

async function getCsrf(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }
  return refreshCsrf();
}

export function resetCsrf(): void {
  csrfToken = null;
}

export async function drivePost<T = unknown>(route: string, body: Record<string, unknown> = {}): Promise<T> {
  const token = await getCsrf();
  const r = await fetch(`${base}?r=${encodeURIComponent(route)}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify(body),
  });
  absorbCsrfFromResponse(r);
  if (r.status === 401 || r.status === 403) {
    resetCsrf();
  }
  if (!r.ok) {
    const t = await r.text();
    throw new Error(parseDriveApiMessage(t) || `Request failed (${r.status})`);
  }
  return (await r.json()) as T;
}

export async function driveGet<T = unknown>(route: string): Promise<T> {
  const r = await fetch(`${base}?r=${encodeURIComponent(route)}`, {
    method: "GET",
    credentials: "include",
  });
  absorbCsrfFromResponse(r);
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
    const j = JSON.parse(t) as { data?: unknown };
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

/** Align Drive session cwd with the Drive UI (required before {@link driveCreateFolder} / upload). */
export async function driveSyncSessionCwd(to: string): Promise<void> {
  await drivePost("/changedir", { to });
}

/** Create a directory under {@code cwd} using the same storage as listing. */
export async function driveCreateFolder(cwd: string, name: string): Promise<void> {
  await driveSyncSessionCwd(cwd);
  await drivePost("/createnew", { type: "dir", name: name.trim() });
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

  await driveSyncSessionCwd(cwd);
  resetCsrf();
  let token = await refreshCsrf();

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
      const check = await fetch(`${base}?r=${encodeURIComponent("/upload")}&${pre.toString()}`, {
        method: "GET",
        credentials: "include",
        signal: opts?.signal,
      });
      absorbCsrfFromResponse(check);
      token = csrfToken ?? token;

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

      const bodyChunk =
        totalChunks === 1
          ? file
          : new File([file.slice(start, end)], file.name, {
              type: mime,
              lastModified: file.lastModified,
            });
      form.append("file", bodyChunk);

      const r = await fetch(`${base}?r=${encodeURIComponent("/upload")}`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": token,
        },
        body: form,
        signal: opts?.signal,
      });
      absorbCsrfFromResponse(r);

      if (r.status === 401 || r.status === 403) {
        resetCsrf();
      }

      const rawText = await r.text();
      const message = parseDriveApiMessage(rawText) || rawText;

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
