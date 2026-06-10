/** Normalize a virtual API path (`/users/alice/foo` style). */
export function normalizeApiVirtualPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "");
}

export function parentAndName(path: string): { destination: string; from: string } {
  const normalized = normalizeApiVirtualPath(path);
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return { destination: "/", from: normalized.replace(/^\//, "") };
  return { destination: normalized.slice(0, idx), from: normalized.slice(idx + 1) };
}

export function pathFromDirectoryEntry(entry: { path: string }): string {
  return normalizeApiVirtualPath(entry.path);
}
