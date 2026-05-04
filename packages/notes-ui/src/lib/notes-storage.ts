export type StoredNote = {
  id: string;
  notebook: string;
  title: string;
  body: string;
  tags: string[];
  starred?: boolean;
  updatedAt: Date;
  archived?: boolean;
};

type ApiNote = {
  id: string;
  notebook: string;
  title: string;
  body: string;
  tags?: string[];
  starred?: boolean;
  updatedAt?: string;
  archived?: boolean;
};

type TokenPair = {
  access_token: string;
  refresh_token: string;
};

export type DeleteNotebookAction =
  | { kind: "move"; target: string }
  | { kind: "archive" }
  | { kind: "purge" };

export type NotesState = {
  baseUri: string;
  username: string;
  displayName: string;
  logoutUrl: string;
  notesPath: string;
  filesEnabled: boolean;
  distReady: boolean;
};

export type NotesCapabilities = {
  enabled: boolean;
  distReady: boolean;
  baseUri: string;
};

let accessToken: string | null = null;
let refreshToken: string | null = null;

function apiV1BaseUrl(): string {
  const path = window.location.pathname;
  const marker = "/notes/";
  const idx = path.indexOf(marker);
  const basePrefix = idx >= 0 ? path.slice(0, idx) : "";
  return `${basePrefix}/api/v1`;
}

const API_BASE = apiV1BaseUrl().replace(/\/+$/, "");
const AUTH_SESSION_URL = `${API_BASE}/auth/session`;
const AUTH_REFRESH_URL = `${API_BASE}/auth/refresh`;

function parseErrorMessage(raw: string): string {
  const text = raw.trim();
  if (!text) {
    return "Request failed";
  }
  try {
    const json = JSON.parse(text) as { error?: unknown; message?: unknown };
    if (typeof json.error === "string" && json.error.trim() !== "") {
      return json.error;
    }
    if (typeof json.message === "string" && json.message.trim() !== "") {
      return json.message;
    }
  } catch {
    // Not JSON.
  }
  return text;
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
    throw new Error("Could not initialize Notes API session.");
  }
}

async function refreshAccessToken(): Promise<boolean> {
  if (!refreshToken) {
    return false;
  }
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
  if (!response.ok) {
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
    throw new Error("Missing Notes API access token.");
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
  if (response.status !== 401 || !allowRetry) {
    return response;
  }
  const refreshed = await refreshAccessToken();
  if (!refreshed) {
    accessToken = null;
    refreshToken = null;
    await mintTokenFromSession();
  }
  return withAuth(input, init, false);
}

async function api<T>(path: string, opts?: { method?: string; body?: unknown }): Promise<T> {
  const method = (opts?.method ?? (opts?.body === undefined ? "GET" : "POST")).toUpperCase();
  const hasBody = opts?.body !== undefined;
  const response = await withAuth(`${API_BASE}/notes${path}`, {
    method,
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(opts?.body) : undefined,
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(parseErrorMessage(raw));
  }
  return JSON.parse(raw) as T;
}

function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) {
    return [];
  }
  return [...new Set(tags.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()))]
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b));
}

function normalizeNotebook(notebook: string): string {
  const clean = notebook.trim();
  return clean !== "" ? clean : "General";
}

function toStoredNote(note: ApiNote): StoredNote {
  const updatedAt = typeof note.updatedAt === "string" ? new Date(note.updatedAt) : new Date();
  return {
    id: note.id,
    notebook: normalizeNotebook(note.notebook),
    title: typeof note.title === "string" && note.title.trim() !== "" ? note.title : "Untitled",
    body: typeof note.body === "string" ? note.body : "",
    tags: normalizeTags(note.tags),
    starred: !!note.starred,
    archived: !!note.archived,
    updatedAt: Number.isNaN(updatedAt.getTime()) ? new Date() : updatedAt,
  };
}

function noteChanged(local: StoredNote, remote: ApiNote | undefined, archived: boolean): boolean {
  if (!remote) {
    return true;
  }
  if (normalizeNotebook(remote.notebook) !== normalizeNotebook(local.notebook)) {
    return true;
  }
  if ((remote.title ?? "") !== (local.title ?? "")) {
    return true;
  }
  if ((remote.body ?? "") !== (local.body ?? "")) {
    return true;
  }
  if (!!remote.starred !== !!local.starred) {
    return true;
  }
  if (!!remote.archived !== archived) {
    return true;
  }
  const remoteTags = normalizeTags(remote.tags);
  const localTags = normalizeTags(local.tags);
  if (remoteTags.length !== localTags.length) {
    return true;
  }
  return remoteTags.some((tag, idx) => tag !== localTags[idx]);
}

export function notebookListFromNotes(notes: StoredNote[]): string[] {
  return [...new Set(
    notes
      .map((note) => note.notebook.trim())
      .filter((notebook) => notebook.length > 0)
      .sort((a, b) => a.localeCompare(b)),
  )];
}

export async function syncNotes(
  _baseUri: string,
  _username: string,
  notes: StoredNote[],
  archivedIds: Set<string>,
  notebooks: string[] = [],
): Promise<void> {
  const remote = await api<{ items: ApiNote[] }>("/items");
  const remoteById = new Map(remote.items.map((note) => [note.id, note]));
  const expectedIds = new Set(notes.map((note) => note.id));

  for (const note of notes) {
    const archived = archivedIds.has(note.id);
    const remoteNote = remoteById.get(note.id);
    if (!noteChanged(note, remoteNote, archived)) {
      continue;
    }
    await api<{ ok: boolean; item: ApiNote }>(`/items/${encodeURIComponent(note.id)}`, {
      method: "PUT",
      body: {
        notebook: normalizeNotebook(note.notebook),
        title: note.title || "Untitled",
        body: note.body ?? "",
        tags: normalizeTags(note.tags),
        starred: !!note.starred,
        archived,
      },
    });
  }

  for (const remoteNote of remote.items) {
    if (expectedIds.has(remoteNote.id)) {
      continue;
    }
    await api<{ ok: boolean }>(`/items/${encodeURIComponent(remoteNote.id)}`, {
      method: "DELETE",
      body: {
        notebook: normalizeNotebook(remoteNote.notebook),
        archived: !!remoteNote.archived,
      },
    });
  }

  const remoteNotebooks = await api<{ items: { name: string; activeCount: number; archivedCount: number }[] }>(
    "/notebooks",
  );
  const desiredNotebooks = new Set(
    [...notebooks, ...notes.map((note) => normalizeNotebook(note.notebook))]
      .map((name) => name.trim())
      .filter(Boolean),
  );

  for (const name of desiredNotebooks) {
    if (remoteNotebooks.items.some((item) => item.name === name)) {
      continue;
    }
    await api<{ ok: boolean; name: string }>("/notebooks", {
      method: "POST",
      body: { name },
    });
  }
}

export async function loadNotes(_baseUri: string, _username: string): Promise<StoredNote[]> {
  const payload = await api<{ items: ApiNote[] }>("/items");
  return payload.items.map(toStoredNote);
}

export async function loadNotesState(): Promise<NotesState> {
  return api<NotesState>("/state");
}

export async function loadNotesCapabilities(): Promise<NotesCapabilities> {
  return api<NotesCapabilities>("/capabilities");
}

export async function createNote(note: {
  id: string;
  notebook: string;
  title: string;
  body: string;
  tags: string[];
  starred?: boolean;
  archived?: boolean;
}): Promise<StoredNote> {
  const payload = await api<{ ok: boolean; item: ApiNote }>("/items", {
    method: "POST",
    body: {
      id: note.id,
      notebook: normalizeNotebook(note.notebook),
      title: note.title || "Untitled",
      body: note.body ?? "",
      tags: normalizeTags(note.tags),
      starred: !!note.starred,
      archived: !!note.archived,
    },
  });
  return toStoredNote(payload.item);
}

export async function archiveNote(id: string): Promise<StoredNote> {
  const payload = await api<{ ok: boolean; item: ApiNote }>(`/items/${encodeURIComponent(id)}/archive`, {
    method: "POST",
    body: {},
  });
  return toStoredNote(payload.item);
}

export async function restoreNote(id: string): Promise<StoredNote> {
  const payload = await api<{ ok: boolean; item: ApiNote }>(`/items/${encodeURIComponent(id)}/restore`, {
    method: "POST",
    body: {},
  });
  return toStoredNote(payload.item);
}

export async function createNotebook(name: string): Promise<void> {
  const normalized = normalizeNotebook(name);
  await api<{ ok: boolean; name: string }>("/notebooks", {
    method: "POST",
    body: { name: normalized },
  });
}

export async function renameNotebook(from: string, to: string): Promise<void> {
  const source = normalizeNotebook(from);
  const target = normalizeNotebook(to);
  if (source === target) {
    return;
  }
  await api<{ ok: boolean; from: string; to: string }>(`/notebooks/${encodeURIComponent(source)}`, {
    method: "PATCH",
    body: { name: target },
  });
}

export async function deleteNotebook(name: string, action: DeleteNotebookAction): Promise<void> {
  const notebook = normalizeNotebook(name);
  if (action.kind === "archive") {
    await api<{ ok: boolean; mode: string }>(`/notebooks/${encodeURIComponent(notebook)}`, {
      method: "DELETE",
      body: { mode: "archive" },
    });
    return;
  }

  if (action.kind === "purge") {
    await api<{ ok: boolean; mode: string }>(`/notebooks/${encodeURIComponent(notebook)}`, {
      method: "DELETE",
      body: { mode: "purge" },
    });
    return;
  }

  await api<{ ok: boolean; mode: string }>(`/notebooks/${encodeURIComponent(notebook)}`, {
    method: "DELETE",
    body: {
      mode: "move",
      target: action.target === "__unassigned__" ? "Unassigned" : normalizeNotebook(action.target),
    },
  });
}
