import { useSyncExternalStore } from "react";

export type User = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  groups: string[];
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  displayName: string;
};

export type Settings = {
  users: User[];
  groups: Group[];
  mail: {
    imapHost: string;
    imapPort: number;
    imapSecurity: "none" | "starttls" | "ssl";
    smtpHost: string;
    smtpPort: number;
    smtpSecurity: "none" | "starttls" | "ssl";
  };
  voice: {
    signalingUrl: string;
    stunUrls: string;
    turnUrls: string;
    turnUsername: string;
    turnPassword: string;
    forceRelay: boolean;
  };
  apps: {
    calendars: boolean;
    contacts: boolean;
  };
  webdav: {
    sabreUi: boolean;
    timezone: string;
    baseUri: string;
    authRealm: string;
  };
  updates: {
    installedVersion: string;
    schemaVersion: number;
    latest: {
      version?: string;
      package_url?: string;
      checksum_sha256?: string;
      notes_url?: string;
      min_php?: string;
      [key: string]: unknown;
    } | null;
    updateAvailable: boolean;
    compatible: boolean;
    backups: {
      name: string;
      sizeBytes: number;
      modifiedAt: string | null;
      fromVersion: string | null;
      toVersion: string | null;
      format?: "zip" | "legacy_dir";
      downloadable?: boolean;
    }[];
    checks: { ok: boolean; label: string; detail: string; status?: "ok" | "fail" | "unknown" }[];
    inProgress: boolean;
    phase: string | null;
    current: { from: string; to: string; at: string } | null;
    download: {
      downloadedBytes: number;
      totalBytes: number | null;
      percent: number | null;
      updatedAt: string;
    } | null;
    phaseProgress: {
      completed: number;
      total: number;
      percent: number;
      updatedAt: string;
    } | null;
    cancelRequested: boolean;
    cancelAllowed: boolean;
    lastCheckedAt: string | null;
    lastCheckError: string | null;
    lastResult: { ok: boolean; version: string; message: string; finishedAt: string | null } | null;
  };
  currentUser: string;
  logoutUrl: string;
};

const DEFAULT_STATE: Settings = {
  users: [],
  groups: [],
  mail: {
    imapHost: "",
    imapPort: 993,
    imapSecurity: "ssl",
    smtpHost: "",
    smtpPort: 465,
    smtpSecurity: "ssl",
  },
  voice: {
    signalingUrl: "",
    stunUrls: "",
    turnUrls: "",
    turnUsername: "",
    turnPassword: "",
    forceRelay: false,
  },
  apps: { calendars: true, contacts: true },
  webdav: { sabreUi: true, timezone: "UTC", baseUri: "/", authRealm: "SabreDAV" },
  updates: {
    installedVersion: "0.0.0-dev",
    schemaVersion: 0,
    latest: null,
    updateAvailable: false,
    compatible: true,
    backups: [],
    checks: [],
    inProgress: false,
    phase: null,
    current: null,
    download: null,
    phaseProgress: null,
    cancelRequested: false,
    cancelAllowed: false,
    lastCheckedAt: null,
    lastCheckError: null,
    lastResult: null,
  },
  currentUser: "",
  logoutUrl: "/logout/",
};

let state: Settings = DEFAULT_STATE;
let bootstrapped = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function apiV1BaseUrl(): string {
  const path = window.location.pathname;
  const marker = "/admin/";
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

function parseErrorMessage(raw: string): string {
  const t = raw.trim();
  if (!t) {
    return "Request failed";
  }
  try {
    const json = JSON.parse(t) as { error?: unknown; message?: unknown };
    if (typeof json.error === "string" && json.error.trim() !== "") {
      return json.error;
    }
    if (typeof json.message === "string" && json.message.trim() !== "") {
      return json.message;
    }
  } catch {
    /* not JSON */
  }
  return t;
}

async function mintTokenFromSession(): Promise<void> {
  const res = await fetch(AUTH_SESSION_URL, {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" },
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(parseErrorMessage(raw));
  }
  const payload = JSON.parse(raw) as TokenPair;
  accessToken = payload.access_token ?? null;
  refreshToken = payload.refresh_token ?? null;
  if (!accessToken || !refreshToken) {
    throw new Error("Could not initialize admin API session.");
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) {
    return false;
  }
  const res = await fetch(AUTH_REFRESH_URL, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const raw = await res.text();
  if (!res.ok) {
    return false;
  }
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
    throw new Error("Missing API access token.");
  }
  return accessToken;
}

async function withAuth(input: RequestInfo | URL, init?: RequestInit, allowRetry = true): Promise<Response> {
  const token = await ensureAccessToken();
  const res = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });
  if (res.status !== 401 || !allowRetry) {
    return res;
  }
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    accessToken = null;
    refreshToken = null;
    await mintTokenFromSession();
  }
  return withAuth(input, init, false);
}

async function api<T>(url: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  const method = (opts?.method ?? (opts?.body === undefined ? "GET" : "POST")).toUpperCase();
  const hasBody = opts?.body !== undefined;
  const res = await withAuth(url, {
    method,
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(opts?.body) : undefined,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(parseErrorMessage(raw));
  }
  return JSON.parse(raw) as T;
}

export const store = {
  get: () => state,
  subscribe: (l: () => void) => {
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  },
  ensureLoaded: async () => {
    if (bootstrapped) {
      return;
    }
    bootstrapped = true;
    await store.reload();
  },
  reload: async () => {
    state = await api<Settings>(`${API_BASE}/admin/state`);
    emit();
  },
  set: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => {
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    emit();
  },
  addUser: async (u: Omit<User, "id" | "createdAt"> & { password?: string }) => {
    await api<{ ok: boolean }>(`${API_BASE}/admin/users`, {
      method: "POST",
      body: {
        username: u.username,
        email: u.email,
        displayName: u.displayName,
        password: u.password ?? "",
        groups: u.groups ?? [],
      },
    });
    await store.reload();
  },
  updateUser: async (u: {
    username: string;
    email: string;
    displayName: string;
    password?: string;
    groups: string[];
  }) => {
    await api<{ ok: boolean }>(`${API_BASE}/admin/users/${encodeURIComponent(u.username)}`, {
      method: "PATCH",
      body: {
        displayName: u.displayName,
        email: u.email,
        password: u.password ?? "",
        groups: u.groups ?? [],
      },
    });
    await store.reload();
  },
  removeUser: async (username: string) => {
    await api<{ ok: boolean }>(`${API_BASE}/admin/users/${encodeURIComponent(username)}`, {
      method: "DELETE",
    });
    await store.reload();
  },
  addGroup: async (g: Omit<Group, "id">) => {
    await api<{ ok: boolean }>(`${API_BASE}/admin/groups`, {
      method: "POST",
      body: {
        slug: g.name,
        displayName: g.displayName,
      },
    });
    await store.reload();
  },
  updateGroup: async (groupId: string, displayName: string) => {
    const slug = groupId.replace(/^principals\/groups\//, "");
    await api<{ ok: boolean }>(`${API_BASE}/admin/groups/${encodeURIComponent(slug)}`, {
      method: "PATCH",
      body: { displayName },
    });
    await store.reload();
  },
  removeGroup: async (groupId: string) => {
    const slug = groupId.replace(/^principals\/groups\//, "");
    await api<{ ok: boolean }>(`${API_BASE}/admin/groups/${encodeURIComponent(slug)}`, {
      method: "DELETE",
    });
    await store.reload();
  },
  toggleMembership: async (username: string, groupId: string, enabled: boolean) => {
    const slug = groupId.replace(/^principals\/groups\//, "");
    if (enabled) {
      await api<{ ok: boolean }>(
        `${API_BASE}/admin/groups/${encodeURIComponent(slug)}/members/${encodeURIComponent(username)}`,
        { method: "PUT", body: {} },
      );
    } else {
      const token = await ensureAccessToken();
      const res = await fetch(
        `${API_BASE}/admin/groups/${encodeURIComponent(slug)}/members/${encodeURIComponent(username)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      if (!res.ok) {
        throw new Error(parseErrorMessage(await res.text()));
      }
    }
    await store.reload();
  },
  saveSettings: async (payload: Pick<Settings, "mail" | "voice" | "apps" | "webdav">) => {
    const voiceTurnUrls = [
      ...String(payload.voice.stunUrls ?? "")
        .split(/[\r\n,]+/)
        .map((v) => v.trim())
        .filter(Boolean),
      ...String(payload.voice.turnUrls ?? "")
        .split(/[\r\n,]+/)
        .map((v) => v.trim())
        .filter(Boolean),
    ];
    await api<{ ok: boolean }>(`${API_BASE}/admin/settings`, {
      method: "PUT",
      body: {
        values: {
        mail_imap_host: payload.mail.imapHost,
        mail_imap_port: payload.mail.imapPort,
        mail_imap_security: payload.mail.imapSecurity,
        mail_smtp_host: payload.mail.smtpHost,
        mail_smtp_port: payload.mail.smtpPort,
        mail_smtp_security: payload.mail.smtpSecurity,
        voice_signaling_url: payload.voice.signalingUrl,
        voice_turn_url: voiceTurnUrls.join(", "),
        voice_turn_username: payload.voice.turnUsername,
        voice_turn_credential: payload.voice.turnPassword,
        voice_force_relay: payload.voice.forceRelay,
        browser_plugin: payload.webdav.sabreUi,
        timezone: payload.webdav.timezone,
        base_uri: payload.webdav.baseUri,
        auth_realm: payload.webdav.authRealm,
        calendar_enabled: payload.apps.calendars,
          contacts_enabled: payload.apps.contacts,
        },
      },
    });
    await store.reload();
  },
  checkUpdates: async () => {
    const updates = await api<Settings["updates"]>(`${API_BASE}/admin/updates/check`, {
      method: "POST",
      body: {},
    });
    store.set({ updates });
  },
  applyUpdate: async () => {
    let latest = state.updates.latest;
    if (!latest?.version || !latest.package_url) {
      await store.checkUpdates();
      latest = state.updates.latest;
    }
    if (!latest?.version || !latest.package_url) {
      throw new Error(
        state.updates.lastCheckError ||
          "No update package available. Run Check now and verify feed metadata.",
      );
    }
    const result = await api<{ ok: boolean; message?: string }>(`${API_BASE}/admin/updates/apply`, {
      method: "POST",
      body: latest,
    });
    await store.reload();
    return result;
  },
  cancelUpdate: async () => {
    const updates = await api<Settings["updates"]>(`${API_BASE}/admin/updates/cancel`, {
      method: "POST",
      body: {},
    });
    store.set({ updates });
  },
  reloadUpdateState: async () => {
    const updates = await api<Settings["updates"]>(`${API_BASE}/admin/updates/state`);
    store.set({ updates });
  },
  readUpdateLog: async () => {
    const log = await api<{ lines: string[] }>(`${API_BASE}/admin/updates/log`);
    return log.lines;
  },
  clearUpdateLog: async () => {
    const token = await ensureAccessToken();
    const res = await fetch(`${API_BASE}/admin/updates/log`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      throw new Error(parseErrorMessage(await res.text()));
    }
    return [];
  },
  deleteBackup: async (name: string) => {
    const token = await ensureAccessToken();
    const res = await fetch(`${API_BASE}/admin/updates/backups/${encodeURIComponent(name)}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    const raw = await res.text();
    if (!res.ok) {
      throw new Error(parseErrorMessage(raw));
    }
    const updates = JSON.parse(raw) as Settings["updates"];
    store.set({ updates });
  },
  downloadBackup: async (name: string) => {
    const token = await ensureAccessToken();
    const res = await fetch(`${API_BASE}/admin/updates/backups/${encodeURIComponent(name)}`, {
      method: "GET",
      credentials: "include",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!res.ok) {
      throw new Error(parseErrorMessage(await res.text()));
    }
    const blob = await res.blob();
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(href);
  },
};

export function useSettings(): Settings {
  void store.ensureLoaded();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
