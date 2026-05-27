"use client";

const ACCESS_TOKEN_KEY = "wgw.api.access_token";

/** Virtual drive path for the REST API, e.g. {@code /users/alice/report.docx}. */
export function officeApiPathFromWebdavPathname(pathname: string): string {
  const idx = pathname.indexOf("/files/");
  if (idx === -1) {
    throw new Error("Not a WebDAV files path.");
  }
  const rel = pathname.slice(idx + "/files/".length).replace(/^\/+/, "");

  return `/${rel}`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  return btoa(binary);
}

function readAccessToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);

  return token && token.trim() !== "" ? token.trim() : null;
}

/**
 * Persist document bytes via {@code PUT /api/v1/office/documents} (Laravel + Flysystem).
 */
export async function saveOfficeDocumentViaApi(
  webdavPathname: string,
  bytes: Uint8Array,
  apiPath = "/api/v1/office/documents",
  signal?: AbortSignal,
): Promise<void> {
  const token = readAccessToken();
  if (!token) {
    throw new Error("Missing API access token; sign in from the workspace shell first.");
  }

  const path = officeApiPathFromWebdavPathname(webdavPathname);
  const res = await fetch(apiPath, {
    method: "PUT",
    credentials: "include",
    signal,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      path,
      content_base64: bytesToBase64(bytes),
    }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = (await res.json()) as { error?: string };
      detail = typeof body.error === "string" ? body.error : "";
    } catch {
      try {
        detail = (await res.text()).slice(0, 300);
      } catch {
        /* ignore */
      }
    }
    throw new Error(
      detail !== ""
        ? `API save failed (${res.status}): ${detail}`
        : `API save failed (${res.status})`,
    );
  }
}
