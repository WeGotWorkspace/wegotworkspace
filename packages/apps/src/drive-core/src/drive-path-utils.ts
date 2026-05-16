export function normalizeApiVirtualPath(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === "/") return "/";
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.replace(/\/+$/, "");
}

export function uiPathFromApiPath(path: string, username: string): string {
  const normalized = normalizeApiVirtualPath(path);
  const userRoot = `/users/${username}`;
  if (normalized === "/groups") {
    return "Groups";
  }
  if (normalized.startsWith("/groups/")) {
    return normalized.replace(/^\/groups/, "Groups");
  }
  if (normalized === userRoot) {
    return "My Drive";
  }
  if (normalized.startsWith(`${userRoot}/`)) {
    return `My Drive${normalized.slice(userRoot.length)}`;
  }
  return "My Drive";
}

export function apiPathFromUiPath(path: string, username: string, groupRoots: Set<string>): string {
  const normalized = path.trim().replace(/\/+$/, "");
  const userRoot = `/users/${username}`;
  if (normalized === "My Drive") {
    return userRoot;
  }
  if (normalized === "Groups") {
    return "/groups";
  }
  if (normalized.startsWith("Groups/")) {
    const relative = normalized.slice("Groups/".length);
    return `/groups/${relative}`;
  }
  if (normalized.startsWith("My Drive/")) {
    const relative = normalized.slice("My Drive/".length);
    const [head] = relative.split("/");
    if (head && groupRoots.has(head)) {
      return `/groups/${relative}`;
    }
    return `${userRoot}/${relative}`;
  }
  if (normalized === "Trash" || normalized.startsWith("Trash/")) {
    return userRoot;
  }
  return userRoot;
}
