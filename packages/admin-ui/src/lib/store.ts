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
    checks: { ok: boolean; label: string; detail: string }[];
    inProgress: boolean;
    lastCheckedAt: string | null;
    lastCheckError: string | null;
    lastResult: { ok: boolean; version: string; message: string; finishedAt: string | null } | null;
  };
  currentUser: string;
  logoutUrl: string;
  csrf: string;
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
  },
  apps: { calendars: true, contacts: true },
  webdav: { sabreUi: true, timezone: "UTC", baseUri: "/", authRealm: "SabreDAV" },
  updates: {
    installedVersion: "0.0.0-dev",
    schemaVersion: 0,
    latest: null,
    updateAvailable: false,
    compatible: true,
    checks: [],
    inProgress: false,
    lastCheckedAt: null,
    lastCheckError: null,
    lastResult: null,
  },
  currentUser: "",
  logoutUrl: "/logout/",
  csrf: "",
};

let state: Settings = DEFAULT_STATE;
let bootstrapped = false;

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

async function api<T>(path: string, body?: unknown): Promise<T> {
  const payloadBody =
    body === undefined
      ? undefined
      : JSON.stringify(
          typeof body === "object" && body !== null && !Array.isArray(body)
            ? { ...(body as Record<string, unknown>), csrf: state.csrf }
            : { value: body, csrf: state.csrf },
        );
  const res = await fetch(`/admin/api/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "include",
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: payloadBody,
  });
  const payload = (await res.json()) as T | { error?: string };
  if (!res.ok) {
    const msg =
      "error" in payload && typeof payload.error === "string" ? payload.error : "Request failed";
    throw new Error(msg);
  }
  return payload as T;
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
    state = await api<Settings>("state");
    emit();
  },
  set: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => {
    const p = typeof patch === "function" ? patch(state) : patch;
    state = { ...state, ...p };
    emit();
  },
  addUser: async (u: Omit<User, "id" | "createdAt"> & { password?: string }) => {
    await api<Settings>("users/create", {
      username: u.username,
      email: u.email,
      displayName: u.displayName,
      password: u.password ?? "",
      groups: u.groups ?? [],
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
    await api<Settings>("users/update", u);
    await store.reload();
  },
  removeUser: async (username: string) => {
    await api<Settings>("users/delete", { username });
    await store.reload();
  },
  addGroup: async (g: Omit<Group, "id">) => {
    await api<Settings>("groups/create", g);
    await store.reload();
  },
  updateGroup: async (groupId: string, displayName: string) => {
    await api<Settings>("groups/update", { groupId, displayName });
    await store.reload();
  },
  removeGroup: async (groupId: string) => {
    await api<Settings>("groups/delete", { groupId });
    await store.reload();
  },
  toggleMembership: async (username: string, groupId: string, enabled: boolean) => {
    await api<Settings>("membership/set", { username, groupId, enabled });
    await store.reload();
  },
  saveSettings: async (payload: Pick<Settings, "mail" | "voice" | "apps" | "webdav">) => {
    await api<Settings>("settings/save", payload);
    await store.reload();
  },
  checkUpdates: async () => {
    const updates = await api<Settings["updates"]>("updates/check", {});
    store.set({ updates });
  },
  applyUpdate: async () => {
    const latest = state.updates.latest;
    if (!latest?.version || !latest.package_url) {
      throw new Error("No update package available");
    }
    await api<{ ok: boolean; message?: string }>("updates/apply", latest);
    await store.reload();
  },
  reloadUpdateState: async () => {
    const updates = await api<Settings["updates"]>("updates/state");
    store.set({ updates });
  },
  readUpdateLog: async () => {
    const log = await api<{ lines: string[] }>("updates/log");
    return log.lines;
  },
};

export function useSettings(): Settings {
  void store.ensureLoaded();
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
