"use client";

export type SabreOfficeInjectedConfig = {
  base_uri: string;
  auth_realm: string;
  timezone: string;
  office_path: string;
  username: string;
  save_transport?: "webdav" | "api" | "webdav+api";
  save_api_path?: string;
};

export function readSabreOfficeConfig(): SabreOfficeInjectedConfig | null {
  if (typeof window === "undefined") {
    return null;
  }
  const w = window as unknown as { __SABRE_OFFICE_CONFIG__?: SabreOfficeInjectedConfig };
  const c = w.__SABRE_OFFICE_CONFIG__;
  if (!c || typeof c.base_uri !== "string" || typeof c.username !== "string") {
    return null;
  }
  return {
    base_uri: c.base_uri,
    auth_realm: typeof c.auth_realm === "string" ? c.auth_realm : "SabreDAV",
    timezone: typeof c.timezone === "string" ? c.timezone : "UTC",
    office_path: typeof c.office_path === "string" ? c.office_path : "/office/",
    username: c.username,
    save_transport:
      c.save_transport === "webdav" || c.save_transport === "api" || c.save_transport === "webdav+api"
        ? c.save_transport
        : "webdav+api",
    save_api_path:
      typeof c.save_api_path === "string" && c.save_api_path.trim() !== ""
        ? c.save_api_path
        : "/api/v1/office/documents",
  };
}

export function davRootPath(baseUri: string): string {
  let p = baseUri.trim();
  if (p === "" || p[0] !== "/") {
    p = `/${p}`;
  }
  return p.endsWith("/") ? p : `${p}/`;
}

export type ParsedOfficeFile = {
  relUnderFiles: string;
  ext: string;
  displayPath: string;
};

const OFFICE_EXT = new Set(["docx", "xlsx", "pptx", "pdf"]);

/**
 * Parses {@code ?file=} as a path under WebDAV {@code files/} (value without {@code files/} prefix).
 */
export function parseOfficeFileParam(raw: string | null): ParsedOfficeFile | null {
  if (raw == null) {
    return null;
  }
  let s = decodeURIComponent(raw.trim());
  if (s === "") {
    return null;
  }
  s = s.replace(/^\/+/, "").replace(/\/+/g, "/");
  if (s === "") {
    return null;
  }
  for (const seg of s.split("/")) {
    if (seg === "" || seg === "." || seg === ".." || seg.includes("..")) {
      return null;
    }
  }
  const parts = s.split("/").filter(Boolean);
  if (parts.length < 3) {
    return null;
  }
  const zone = parts[0].toLowerCase();
  if (zone !== "users" && zone !== "groups") {
    return null;
  }
  const last = parts[parts.length - 1] ?? "";
  const ext = last.includes(".") ? (last.split(".").pop() ?? "").toLowerCase() : "";
  if (!OFFICE_EXT.has(ext)) {
    return null;
  }
  return {
    relUnderFiles: s,
    ext,
    displayPath: `/${s}`,
  };
}

export function filesResourcePathname(baseUri: string, relUnderFiles: string): string {
  const root = davRootPath(baseUri);
  const rel = relUnderFiles.replace(/^\/+/, "").replace(/\/+/g, "/");
  const path = `${root}files/${rel}`;
  return new URL(path, window.location.origin).pathname;
}

function fetchInit(signal?: AbortSignal): RequestInit {
  return signal ? { credentials: "include", signal } : { credentials: "include" };
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const t = await res.text();
    return t.slice(0, 500);
  } catch {
    return "";
  }
}

function parseLockTokenFromHeader(res: Response): string | null {
  const raw = res.headers.get("Lock-Token");
  if (!raw) {
    return null;
  }
  const m = raw.match(/<([^>]+)>/);
  return m ? m[1].trim() : raw.trim();
}

function parseLockTokenFromXml(xmlText: string): string | null {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const hrefs = doc.getElementsByTagNameNS("*", "href");
  for (let i = 0; i < hrefs.length; i++) {
    const text = hrefs[i]?.textContent?.trim() ?? "";
    if (text.includes("opaquelocktoken:")) {
      return text;
    }
  }
  return null;
}

const LOCK_BODY = `<?xml version="1.0" encoding="utf-8"?>
<D:lockinfo xmlns:D="DAV:">
  <D:lockscope><D:exclusive/></D:lockscope>
  <D:locktype><D:write/></D:locktype>
  <D:owner><D:href>https://example.org/</D:href></D:owner>
</D:lockinfo>`;

async function webdavMkcol(collectionPathname: string, signal?: AbortSignal): Promise<void> {
  const path = collectionPathname.endsWith("/") ? collectionPathname : `${collectionPathname}/`;
  const res = await fetch(path, {
    ...fetchInit(signal),
    method: "MKCOL",
  });
  if (res.ok || res.status === 201 || res.status === 204) {
    return;
  }
  if (res.status === 405 || res.status === 409) {
    return;
  }
  throw new Error(`WebDAV MKCOL ${res.status}: ${await readErrorBody(res)}`);
}

export async function webdavEnsureParentCollections(
  baseUri: string,
  relUnderFiles: string,
  signal?: AbortSignal,
): Promise<void> {
  const parts = relUnderFiles.split("/").filter(Boolean);
  if (parts.length < 3) {
    throw new Error("Path must be like users/{name}/file.ext or groups/{name}/file.ext.");
  }
  const dirParts = parts.slice(0, -1);
  for (let i = 2; i <= dirParts.length; i++) {
    const sub = dirParts.slice(0, i).join("/");
    const pathname = filesResourcePathname(baseUri, sub);
    await webdavMkcol(pathname, signal);
  }
}

async function lockResource(absolutePath: string, signal?: AbortSignal): Promise<string | null> {
  const res = await fetch(absolutePath, {
    ...fetchInit(signal),
    method: "LOCK",
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      Depth: "0",
    },
    body: LOCK_BODY,
  });
  if (res.status === 200 || res.status === 201) {
    const fromHeader = parseLockTokenFromHeader(res);
    if (fromHeader) {
      return fromHeader;
    }
    const text = await res.text();
    return parseLockTokenFromXml(text);
  }
  if (res.status === 404) {
    return null;
  }
  const err = await readErrorBody(res);
  throw new Error(`WebDAV LOCK ${res.status}: ${err}`);
}

async function unlockResource(
  absolutePath: string,
  lockToken: string,
  signal?: AbortSignal,
): Promise<void> {
  const token = lockToken.startsWith("<") ? lockToken : `<${lockToken}>`;
  const res = await fetch(absolutePath, {
    ...fetchInit(signal),
    method: "UNLOCK",
    headers: {
      "Lock-Token": token,
    },
  });
  if (!res.ok && res.status !== 204) {
    const err = await readErrorBody(res);
    console.warn("WebDAV UNLOCK", res.status, err);
  }
}

function mimeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case "pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case "pdf":
      return "application/pdf";
    default:
      return "application/octet-stream";
  }
}

function relUnderFilesFromPathname(pathname: string): string {
  const idx = pathname.indexOf("/files/");
  if (idx === -1) {
    throw new Error("Not a WebDAV files path.");
  }
  return pathname.slice(idx + "/files/".length).replace(/\/+/g, "/");
}

export async function webdavPutOfficeFile(
  baseUri: string,
  absoluteResourcePath: string,
  bytes: Uint8Array,
  filenameForExt: string,
  signal?: AbortSignal,
): Promise<void> {
  const ext = (filenameForExt.split(".").pop() ?? "").toLowerCase();
  const relNorm = relUnderFilesFromPathname(absoluteResourcePath);
  await webdavEnsureParentCollections(baseUri, relNorm, signal);

  let lockToken: string | null = null;
  try {
    lockToken = await lockResource(absoluteResourcePath, signal);
  } catch (e) {
    console.warn("LOCK failed, attempting PUT without lock", e);
  }

  const headers: Record<string, string> = {
    "Content-Type": mimeForExt(ext),
  };
  if (lockToken) {
    const inner = lockToken.replace(/^<|>$/g, "");
    headers.If = `(<${inner}>)`;
  }

  const res = await fetch(absoluteResourcePath, {
    ...fetchInit(signal),
    method: "PUT",
    headers,
    body: new Blob([new Uint8Array(bytes)]),
  });

  if (lockToken) {
    try {
      await unlockResource(absoluteResourcePath, lockToken, signal);
    } catch {
      /* ignore */
    }
  }

  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`WebDAV PUT ${res.status}: ${await readErrorBody(res)}`);
  }
}
