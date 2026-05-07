import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";

/** When true, mail/notes routes load from WeGotWorkspace instead of mock adapters. */
export function wgwLiveApiEnabled(): boolean {
  const v = import.meta.env.VITE_WGW_USE_LIVE_API;
  return v === "1" || v === "true";
}

/**
 * API root including `/api/v1`. In dev, keep the default so requests hit the Vite proxy
 * (see `vite.config.ts`) and avoid CORS against `wegotworkspace.local`.
 */
export function wgwApiBaseUrl(): string {
  const raw = (import.meta.env.VITE_WGW_API_BASE_URL as string | undefined)?.trim();
  return (raw && raw.length > 0 ? raw : "/api/v1").replace(/\/$/, "");
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in?: number;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

export function clearWgwSession(): void {
  accessToken = null;
  refreshToken = null;
}

async function postJson(path: string, body: unknown, auth?: string): Promise<Response> {
  const base = wgwApiBaseUrl();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  return fetch(url, { method: "POST", headers, body: JSON.stringify(body) });
}

async function readTokenResponse(res: Response): Promise<TokenResponse> {
  const text = await res.text();
  let j: unknown;
  try {
    j = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Auth response was not JSON (${res.status})`);
  }
  if (!res.ok) {
    const err =
      j && typeof j === "object" && "error" in j ? String((j as { error: unknown }).error) : text;
    throw new Error(err || `HTTP ${res.status}`);
  }
  const o = j as Record<string, unknown>;
  const at = o.access_token;
  const rt = o.refresh_token;
  if (typeof at !== "string" || typeof rt !== "string") {
    throw new Error("Auth response missing access_token or refresh_token");
  }
  return { access_token: at, refresh_token: rt, expires_in: Number(o.expires_in) || undefined };
}

/** Obtain tokens using `VITE_WGW_DEV_USERNAME` / `VITE_WGW_DEV_PASSWORD` (local `.env.local` only). */
export async function wgwEnsureSession(): Promise<void> {
  if (accessToken) return;

  const username = import.meta.env.VITE_WGW_DEV_USERNAME as string | undefined;
  const password = import.meta.env.VITE_WGW_DEV_PASSWORD as string | undefined;
  if (!username?.trim() || password === undefined || password === "") {
    throw new Error(
      "Live API: set VITE_WGW_DEV_USERNAME and VITE_WGW_DEV_PASSWORD in .env.local (see .env.example).",
    );
  }

  const res = await postJson("/auth/token", { username: username.trim(), password });
  const tokens = await readTokenResponse(res);
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
}

async function wgwTryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await postJson("/auth/refresh", { refresh_token: refreshToken });
    const tokens = await readTokenResponse(res);
    accessToken = tokens.access_token;
    refreshToken = tokens.refresh_token;
    return true;
  } catch {
    clearWgwSession();
    return false;
  }
}

export async function wgwFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await wgwEnsureSession();
  const base = wgwApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${p}`;

  const doOnce = (token: string) => {
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...init, headers });
  };

  let res = await doOnce(accessToken!);
  if (res.status === 401) {
    const ok = await wgwTryRefresh();
    if (ok && accessToken) res = await doOnce(accessToken);
  }
  return res;
}

export async function wgwReadJson(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Expected JSON from ${res.url} (${res.status})`);
  }
}

export async function wgwFetchPrincipal(): Promise<WorkspaceSession> {
  const res = await wgwFetch("/me");
  if (!res.ok) throw new Error(`GET /me failed (${res.status})`);
  const j = (await wgwReadJson(res)) as Record<string, unknown>;
  const meUsername = typeof j.username === "string" ? j.username : "User";

  // Keep identity consistent with Settings when available.
  let settingsUser:
    | {
        username?: string;
        displayName?: string;
        email?: string;
      }
    | undefined;
  try {
    const settingsRes = await wgwFetch("/settings/state");
    if (settingsRes.ok) {
      const settingsJson = (await wgwReadJson(settingsRes)) as Record<string, unknown>;
      const user = settingsJson.user;
      if (user && typeof user === "object") {
        const candidate = user as Record<string, unknown>;
        settingsUser = {
          username: typeof candidate.username === "string" ? candidate.username : undefined,
          displayName:
            typeof candidate.displayName === "string" ? candidate.displayName : undefined,
          email: typeof candidate.email === "string" ? candidate.email : undefined,
        };
      }
    }
  } catch {
    // Optional enrichment only; /me remains the fallback source.
  }

  const username = settingsUser?.username?.trim() || meUsername;
  const explicitDisplayName =
    typeof settingsUser?.displayName === "string"
      ? settingsUser.displayName
      : typeof j.displayName === "string"
        ? j.displayName
        : typeof j.displayname === "string"
          ? j.displayname
          : typeof j.name === "string"
            ? j.name
            : null;
  const normalizedDisplayName =
    explicitDisplayName?.trim() ||
    username
      .trim()
      .split(/[._-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ") ||
    "User";
  const user = {
    displayName: normalizedDisplayName,
    initials: workspaceUserInitials({ displayName: normalizedDisplayName }),
    username,
    email: settingsUser?.email ?? (typeof j.email === "string" ? j.email : undefined),
  };
  return { user, viewerInboxLabel: "me" };
}
