import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { activeWgwApiRuntime } from "@/lib/api/wgw/wgw-api-runtime";

/** When true, mail/notes routes load from WeGotWorkspace instead of mock adapters. */
export function wgwLiveApiEnabled(): boolean {
  const runtime = activeWgwApiRuntime();
  if (runtime) return runtime.useLiveApi;
  const v = parseEnvBoolean(import.meta.env.VITE_WGW_USE_LIVE_API as string | undefined);
  if (v !== null) return v;
  // In bundled/runtime environments we should talk to the real API by default.
  return Boolean(import.meta.env.PROD);
}

function parseEnvBoolean(value: string | undefined): boolean | null {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return null;
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return null;
}

/**
 * API root including `/api/v1`. In dev, keep the default so requests hit the Vite proxy
 * (see `vite.config.ts`) and avoid CORS against `wegotworkspace.localhost`.
 */
export function wgwApiBaseUrl(): string {
  const runtime = activeWgwApiRuntime();
  if (runtime?.baseUrl) return runtime.baseUrl;
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
let storageHydrated = false;

const ACCESS_TOKEN_KEY = "wgw.api.access_token";
const REFRESH_TOKEN_KEY = "wgw.api.refresh_token";
const LOGGED_OUT_KEY = "wgw.api.logged_out";

function hasWindowStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function hydrateTokensFromStorage(): void {
  if (storageHydrated) return;
  storageHydrated = true;
  if (!hasWindowStorage()) return;
  try {
    accessToken = window.localStorage.getItem(ACCESS_TOKEN_KEY);
    refreshToken = window.localStorage.getItem(REFRESH_TOKEN_KEY);
  } catch {
    // Ignore storage failures and keep in-memory fallback.
  }
}

function persistTokens(): void {
  if (!hasWindowStorage()) return;
  try {
    if (accessToken) window.localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
    else window.localStorage.removeItem(ACCESS_TOKEN_KEY);
    if (refreshToken) window.localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    else window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
    // Ignore storage failures and keep in-memory fallback.
  }
}

function readLoggedOutMarker(): boolean {
  if (!hasWindowStorage()) return false;
  try {
    return window.localStorage.getItem(LOGGED_OUT_KEY) === "1";
  } catch {
    return false;
  }
}

function setLoggedOutMarker(value: boolean): void {
  if (!hasWindowStorage()) return;
  try {
    if (value) {
      window.localStorage.setItem(LOGGED_OUT_KEY, "1");
    } else {
      window.localStorage.removeItem(LOGGED_OUT_KEY);
    }
  } catch {
    // Ignore storage failures and keep in-memory fallback.
  }
}

export function clearWgwSession(): void {
  accessToken = null;
  refreshToken = null;
  storageHydrated = true;
  persistTokens();
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

function applyTokens(tokens: TokenResponse): void {
  accessToken = tokens.access_token;
  refreshToken = tokens.refresh_token;
  storageHydrated = true;
  persistTokens();
  setLoggedOutMarker(false);
}

/** True when access + refresh tokens are present (localStorage or memory). */
export function wgwHasAuthenticatedSession(): boolean {
  hydrateTokensFromStorage();
  return Boolean(accessToken && refreshToken);
}

/** Current in-memory/storage access token, if available. */
export function wgwCurrentAccessToken(): string | null {
  hydrateTokensFromStorage();
  return accessToken;
}

/** True when the UI may skip the login form (stored session or dev auto-login). */
export function wgwSessionAvailable(): boolean {
  if (wgwHasAuthenticatedSession()) return true;
  if (readLoggedOutMarker()) return false;
  const username = import.meta.env.VITE_WGW_DEV_USERNAME as string | undefined;
  const password = import.meta.env.VITE_WGW_DEV_PASSWORD as string | undefined;
  return Boolean(username?.trim() && password && password.trim());
}

/** Offline / Storybook: accept any credentials without calling `/auth/token`. */
export function wgwEstablishMockSession(): void {
  applyTokens({ access_token: "mock", refresh_token: "mock" });
}

export async function wgwLoginWithCredentials(username: string, password: string): Promise<void> {
  const normalized = username.trim();
  if (!normalized || !password) {
    throw new Error("Username and password are required.");
  }
  if (!wgwLiveApiEnabled()) {
    wgwEstablishMockSession();
    return;
  }
  const res = await postJson("/auth/token", { username: normalized, password });
  const tokens = await readTokenResponse(res);
  applyTokens(tokens);
}

export async function wgwLogout(): Promise<void> {
  hydrateTokensFromStorage();
  setLoggedOutMarker(true);
  try {
    if (refreshToken || accessToken) {
      await postJson(
        "/auth/revoke",
        refreshToken ? { refresh_token: refreshToken } : {},
        accessToken ?? undefined,
      );
    }
  } catch {
    // Best effort: local token cleanup always runs.
  } finally {
    clearWgwSession();
  }
}

/** Obtain tokens using `VITE_WGW_DEV_USERNAME` / `VITE_WGW_DEV_PASSWORD` (local `.env.local` only). */
export async function wgwEnsureSession(): Promise<void> {
  hydrateTokensFromStorage();
  if (accessToken) return;

  if (refreshToken) {
    const refreshed = await wgwTryRefresh();
    if (refreshed && accessToken) return;
  }

  if (readLoggedOutMarker()) {
    throw new Error("Missing auth session. Sign in to continue.");
  }

  const username = import.meta.env.VITE_WGW_DEV_USERNAME as string | undefined;
  const password = import.meta.env.VITE_WGW_DEV_PASSWORD as string | undefined;
  if (!username?.trim() || password === undefined || password === "") {
    throw new Error("Missing auth session. Sign in to continue.");
  }
  await wgwLoginWithCredentials(username.trim(), password);
}

async function wgwTryRefresh(): Promise<boolean> {
  if (!refreshToken) return false;
  try {
    const res = await postJson("/auth/refresh", { refresh_token: refreshToken });
    const tokens = await readTokenResponse(res);
    applyTokens(tokens);
    return true;
  } catch {
    clearWgwSession();
    return false;
  }
}

const TUNNELED_HTTP_METHODS = new Set(["PUT", "PATCH", "DELETE"]);

/**
 * Some Apache/nginx frontends redirect PUT/PATCH/DELETE with 301/302, which browsers
 * follow as GET. Tunnel through POST + Symfony/Laravel method override instead.
 */
function tunnelMutatingHttpMethod(init: RequestInit): RequestInit {
  const method = (init.method ?? "GET").toUpperCase();
  if (!TUNNELED_HTTP_METHODS.has(method)) {
    return init;
  }

  const headers = new Headers(init.headers);
  headers.set("X-HTTP-Method-Override", method);

  return { ...init, method: "POST", headers };
}

export async function wgwFetch(path: string, init: RequestInit = {}): Promise<Response> {
  await wgwEnsureSession();
  const requestInit = tunnelMutatingHttpMethod(init);
  const base = wgwApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  const url = `${base}${p}`;

  const doOnce = (token: string) => {
    const headers = new Headers(requestInit.headers);
    headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...requestInit, headers });
  };

  let res = await doOnce(accessToken!);
  if (res.status === 401) {
    const ok = await wgwTryRefresh();
    if (ok && accessToken) res = await doOnce(accessToken);
  }
  return res;
}

/** Read a short error message from a WGW API error response body. */
export function wgwErrorMessageFromBody(body: string, status: number, statusText = ""): string {
  const fallback = statusText.trim() || `HTTP ${status}`;
  const trimmed = body.trim();
  if (!trimmed) {
    return fallback;
  }
  try {
    const json = JSON.parse(trimmed) as { error?: unknown; message?: unknown };
    const candidate =
      typeof json.error === "string"
        ? json.error
        : typeof json.message === "string"
          ? json.message
          : null;
    if (candidate?.trim()) {
      return candidate.trim();
    }
  } catch {
    // Non-JSON bodies are ignored; /api/v1 routes should always return JSON.
  }
  return fallback;
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

export async function wgwEnsurePluginSession(sessionApiPath: string): Promise<void> {
  if (!wgwLiveApiEnabled()) return;
  let path = sessionApiPath.trim();
  if (path.startsWith("/api/v1")) {
    path = path.slice("/api/v1".length);
  }
  if (!path.startsWith("/")) {
    path = `/${path}`;
  }
  const res = await wgwFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  if (!res.ok) {
    throw new Error(`POST ${path} failed (${res.status})`);
  }
}
