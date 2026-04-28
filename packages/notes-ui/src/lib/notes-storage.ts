import type { NoteFrontmatter } from "./notes-frontmatter";
import { parseMarkdownNote, serializeMarkdownNote } from "./notes-frontmatter";

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

type DavEntry = {
  href: string;
  name: string;
  isCollection: boolean;
  lastModified?: Date;
};

function davRootPath(baseUri: string): string {
  const trimmed = baseUri.trim();
  const prefixed = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

function normalizeRel(relUnderFiles: string): string {
  return relUnderFiles.replace(/^\/+/, "").replace(/\/+/g, "/");
}

function relToPath(baseUri: string, relUnderFiles: string): string {
  const rel = normalizeRel(relUnderFiles)
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  return new URL(`${davRootPath(baseUri)}files/${rel}`, window.location.origin).pathname;
}

async function readErrorBody(res: Response): Promise<string> {
  try {
    const text = await res.text();
    return text.slice(0, 500);
  } catch {
    return "";
  }
}

async function davRequest(path: string, init: RequestInit): Promise<Response> {
  return fetch(path, {
    credentials: "include",
    ...init,
  });
}

function parseDavEntries(xmlText: string): DavEntry[] {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  const responses = Array.from(doc.getElementsByTagNameNS("*", "response"));
  return responses
    .map((response) => {
      const hrefNode = response.getElementsByTagNameNS("*", "href")[0];
      const href = hrefNode?.textContent?.trim() ?? "";
      if (!href) return null;
      const decodedHref = decodeURIComponent(new URL(href, window.location.origin).pathname);
      const segments = decodedHref.split("/").filter(Boolean);
      const name = segments[segments.length - 1] ?? "";
      const hasCollection = response.getElementsByTagNameNS("*", "collection").length > 0;
      const lastModNode = response.getElementsByTagNameNS("*", "getlastmodified")[0];
      const lastModRaw = lastModNode?.textContent?.trim() ?? "";
      const lastModified = lastModRaw ? new Date(lastModRaw) : undefined;
      return {
        href: decodedHref,
        name,
        isCollection: hasCollection,
        lastModified: lastModified && !Number.isNaN(lastModified.getTime()) ? lastModified : undefined,
      } satisfies DavEntry;
    })
    .filter((entry): entry is DavEntry => entry !== null);
}

async function davPropfind(path: string, depth: "0" | "1"): Promise<DavEntry[]> {
  const res = await davRequest(path, {
    method: "PROPFIND",
    headers: {
      Depth: depth,
      "Content-Type": "application/xml; charset=utf-8",
    },
    body: `<?xml version="1.0"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:resourcetype/>
    <d:getlastmodified/>
  </d:prop>
</d:propfind>`,
  });
  if (res.status === 404) {
    return [];
  }
  if (!res.ok && res.status !== 207) {
    throw new Error(`WebDAV PROPFIND ${res.status}: ${await readErrorBody(res)}`);
  }
  return parseDavEntries(await res.text());
}

async function ensureCollection(path: string): Promise<void> {
  const res = await davRequest(path.endsWith("/") ? path : `${path}/`, {
    method: "MKCOL",
  });
  if (res.ok || res.status === 201 || res.status === 204 || res.status === 405 || res.status === 409) {
    return;
  }
  throw new Error(`WebDAV MKCOL ${res.status}: ${await readErrorBody(res)}`);
}

function noteIdFromFileName(name: string): string {
  const withoutExt = name.toLowerCase().endsWith(".md") ? name.slice(0, -3) : name;
  return decodeURIComponent(withoutExt);
}

function notebookRel(username: string, notebook: string): string {
  return `users/${username}/.notes/${notebook}`;
}

function archiveRootRel(username: string): string {
  return `users/${username}/.notes/.archive`;
}

function archiveNotebookRel(username: string, notebook: string): string {
  return `${archiveRootRel(username)}/${notebook}`;
}

function noteRel(username: string, notebook: string, noteId: string): string {
  return `${notebookRel(username, notebook)}/${noteId}.md`;
}

function archiveNoteRel(username: string, notebook: string, noteId: string): string {
  return `${archiveNotebookRel(username, notebook)}/${noteId}.md`;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

async function loadNotebookNotes(
  baseUri: string,
  username: string,
  notebook: string,
  archived: boolean,
): Promise<StoredNote[]> {
  const notebookPath = relToPath(
    baseUri,
    archived ? archiveNotebookRel(username, notebook) : notebookRel(username, notebook),
  );
  const entries = await davPropfind(notebookPath, "1");
  const files = entries.filter((entry) => !entry.isCollection && entry.name.toLowerCase().endsWith(".md"));
  const notes: StoredNote[] = [];
  for (const file of files) {
    const resourcePath = relToPath(
      baseUri,
      archived
        ? archiveNoteRel(username, notebook, noteIdFromFileName(file.name))
        : noteRel(username, notebook, noteIdFromFileName(file.name)),
    );
    const res = await davRequest(resourcePath, { method: "GET" });
    if (!res.ok) continue;
    const markdown = await res.text();
    const parsed = parseMarkdownNote(markdown, file.name.replace(/\.md$/i, ""));
    notes.push({
      id: noteIdFromFileName(file.name),
      notebook,
      title: parsed.frontmatter.title,
      body: parsed.body,
      tags: parsed.frontmatter.tags,
      starred: parsed.frontmatter.starred,
      updatedAt: file.lastModified ?? new Date(),
      archived,
    });
  }

  return notes;
}

export async function loadNotes(baseUri: string, username: string): Promise<StoredNote[]> {
  const notesRootRel = `users/${username}/.notes`;
  const notesRootPath = relToPath(baseUri, notesRootRel);
  await ensureCollection(notesRootPath);
  const archiveRootPath = relToPath(baseUri, archiveRootRel(username));
  await ensureCollection(archiveRootPath);

  const notebookEntries = await davPropfind(notesRootPath, "1");
  const notebookDirs = notebookEntries
    .filter((entry) => entry.isCollection && entry.name !== ".archive")
    .map((entry) => entry.name);

  const archiveEntries = await davPropfind(archiveRootPath, "1");
  const archiveNotebookDirs = archiveEntries.filter((entry) => entry.isCollection).map((entry) => entry.name);

  const notes: StoredNote[] = [];
  for (const notebook of notebookDirs) {
    notes.push(...(await loadNotebookNotes(baseUri, username, notebook, false)));
  }

  for (const notebook of archiveNotebookDirs) {
    notes.push(...(await loadNotebookNotes(baseUri, username, notebook, true)));
  }

  return notes;
}

export function notebookListFromNotes(notes: StoredNote[]): string[] {
  return uniqueStrings(
    notes
      .map((note) => note.notebook.trim())
      .filter((notebook) => notebook.length > 0)
      .sort((a, b) => a.localeCompare(b)),
  );
}

async function putMarkdown(baseUri: string, relUnderFiles: string, markdown: string): Promise<void> {
  const path = relToPath(baseUri, relUnderFiles);
  const res = await davRequest(path, {
    method: "PUT",
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
    body: markdown,
  });
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`WebDAV PUT ${res.status}: ${await readErrorBody(res)}`);
  }
}

async function deleteResource(baseUri: string, relUnderFiles: string): Promise<void> {
  const res = await davRequest(relToPath(baseUri, relUnderFiles), { method: "DELETE" });
  if (res.ok || res.status === 204 || res.status === 404) {
    return;
  }
  throw new Error(`WebDAV DELETE ${res.status}: ${await readErrorBody(res)}`);
}

export async function syncNotes(
  baseUri: string,
  username: string,
  notes: StoredNote[],
  archivedIds: Set<string>,
): Promise<void> {
  const notesRoot = relToPath(baseUri, `users/${username}/.notes`);
  await ensureCollection(notesRoot);
  const archiveRoot = relToPath(baseUri, archiveRootRel(username));
  await ensureCollection(archiveRoot);

  const activeNotebooks = uniqueStrings(
    notes.filter((note) => !archivedIds.has(note.id)).map((note) => note.notebook).filter(Boolean),
  );
  const archivedNotebooks = uniqueStrings(
    notes.filter((note) => archivedIds.has(note.id)).map((note) => note.notebook).filter(Boolean),
  );

  for (const notebook of activeNotebooks) {
    await ensureCollection(relToPath(baseUri, notebookRel(username, notebook)));
  }
  for (const notebook of archivedNotebooks) {
    await ensureCollection(relToPath(baseUri, archiveNotebookRel(username, notebook)));
  }

  for (const note of notes) {
    const frontmatter: NoteFrontmatter = {
      title: note.title || "Untitled",
      tags: note.tags,
      starred: note.starred,
    };
    const markdown = serializeMarkdownNote(frontmatter, note.body);
    const rel = archivedIds.has(note.id)
      ? archiveNoteRel(username, note.notebook, note.id)
      : noteRel(username, note.notebook, note.id);
    await putMarkdown(baseUri, rel, markdown);
  }

  const existing = await loadNotes(baseUri, username);
  const expected = new Set(
    notes.map((note) => `${archivedIds.has(note.id) ? "archive:" : "active:"}${note.notebook}/${note.id}.md`),
  );
  for (const note of existing) {
    const key = `${note.archived ? "archive:" : "active:"}${note.notebook}/${note.id}.md`;
    if (!expected.has(key)) {
      const rel = note.archived
        ? archiveNoteRel(username, note.notebook, note.id)
        : noteRel(username, note.notebook, note.id);
      await deleteResource(baseUri, rel);
    }
  }
}
