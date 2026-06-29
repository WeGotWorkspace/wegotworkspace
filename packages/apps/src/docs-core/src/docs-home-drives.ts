/**
 * Pure helpers backing the Docs home sidebar "Drives" section and the
 * "Create new document" action.
 *
 * The browse API has no path filter of its own beyond an optional `path_prefix`
 * scope (see `useDocsHomeList`), so the *list* of shared drives shown in the
 * sidebar is derived from whatever results have loaded — mirroring how Drive
 * discovers `knownGroupRoots` from loaded files. Selecting a drive then scopes
 * the browse server-side via its `pathPrefix`, which keeps pagination correct.
 */
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import { suggestNewMarkdownFileName } from "@/drive-core/src/drive-file-utils";

const NEW_DOCUMENT_BASE = "Untitled";

/** A selectable drive in the Docs home sidebar. `pathPrefix` scopes the browse. */
export type DocsHomeDrive = {
  /** Stable selection key; equal to `pathPrefix`. */
  key: string;
  /** Sidebar display label (e.g. "My Drive" or the group name). */
  label: string;
  /** Storage-key prefix passed to the browse API (e.g. `users/alice`, `groups/team`). */
  pathPrefix: string;
};

/** Extract sorted, unique group roots from loaded files' `/groups/{root}/…` api paths. */
export function collectGroupRoots(files: readonly DriveFile[]): string[] {
  const roots = new Set<string>();
  for (const file of files) {
    const apiPath = file.apiPath;
    if (!apiPath || !apiPath.startsWith("/groups/")) continue;
    const [root] = apiPath.slice("/groups/".length).split("/");
    if (root) roots.add(root);
  }
  return Array.from(roots).sort((a, b) => a.localeCompare(b));
}

/** Union two group-root lists (keeps the set growing as more pages load). */
export function mergeGroupRoots(previous: readonly string[], next: readonly string[]): string[] {
  const merged = new Set(previous);
  for (const root of next) merged.add(root);
  return Array.from(merged).sort((a, b) => a.localeCompare(b));
}

/**
 * Build the Drives list: "My Drive" (when the user is known) followed by each
 * discovered shared (group) drive.
 */
export function buildDocsHomeDrives(
  username: string,
  groupRoots: readonly string[],
  myDriveLabel: string,
): DocsHomeDrive[] {
  const drives: DocsHomeDrive[] = [];
  const handle = username.trim();
  if (handle) {
    drives.push({ key: `users/${handle}`, label: myDriveLabel, pathPrefix: `users/${handle}` });
  }
  for (const root of groupRoots) {
    drives.push({ key: `groups/${root}`, label: root, pathPrefix: `groups/${root}` });
  }
  return drives;
}

export function resolveDocsHomeCreateDialogBrowsePath(selectedDrivePrefix: string | null): string {
  if (selectedDrivePrefix?.startsWith("groups/")) {
    const root = selectedDrivePrefix.slice("groups/".length);
    return root ? `Groups/${root}` : "My Drive";
  }
  return "My Drive";
}

/**
 * API path for a brand-new Markdown document in the user's My Drive, using a
 * unique `Untitled.md`-style name against the currently loaded files.
 *
 * Note: this only checks the *loaded* results, so it can collide with an
 * existing `Untitled.md` that hasn't been paged in. Prefer
 * {@link resolveNewDocumentName} which checks the live directory listing.
 */
export function newDocumentApiPath(username: string, files: readonly DriveFile[]): string | null {
  const handle = username.trim();
  if (!handle) return null;
  const name = suggestNewMarkdownFileName(files);
  return `/users/${handle}/${name}`;
}

/**
 * First free `Untitled.md` / `Untitled N.md` (then `Untitled 2.md`, `Untitled
 * 3.md`, …) name not present in `existingNames`. Matches the increment used by
 * Drive's {@link suggestNewMarkdownFileName} so the two flows stay consistent.
 */
export function nextUntitledMarkdownName(existingNames: Iterable<string>): string {
  const taken = new Set<string>();
  for (const name of existingNames) {
    if (typeof name === "string" && name.trim()) taken.add(name.trim().toLowerCase());
  }
  let candidate = `${NEW_DOCUMENT_BASE}.md`;
  let index = 2;
  while (taken.has(candidate.toLowerCase())) {
    candidate = `${NEW_DOCUMENT_BASE} ${index}.md`;
    index += 1;
  }
  return candidate;
}

/**
 * Timestamp-suffixed name used only when the live directory listing fails — it
 * is effectively guaranteed not to clobber an existing file, so we never
 * overwrite even when we cannot enumerate the directory.
 */
export function fallbackUntitledMarkdownName(now: Date = new Date()): string {
  const stamp = now.toISOString().slice(0, 19).replace("T", " ").replace(/:/g, "-");
  return `${NEW_DOCUMENT_BASE} ${stamp}.md`;
}

/**
 * Resolve a collision-free file name for a new document in `userRoot`.
 *
 * With live drive operations, lists the actual directory and picks the next
 * free `Untitled` name (never overwriting an existing file); if that listing
 * throws, falls back to a timestamped name. Without operations (mock/Storybook),
 * derives the name from the already-loaded files.
 */
export async function resolveNewDocumentName(
  operations: Pick<DriveAPIOperations, "listDirectory"> | undefined,
  userRoot: string,
  loadedFiles: readonly DriveFile[],
): Promise<string> {
  if (operations) {
    try {
      const state = await operations.listDirectory(userRoot);
      const names = state.directory.files.map((entry) => entry.name);
      return nextUntitledMarkdownName(names);
    } catch {
      return fallbackUntitledMarkdownName();
    }
  }
  return nextUntitledMarkdownName(
    loadedFiles.filter((file) => file.kind !== "folder").map((file) => file.title),
  );
}
