import {
  DRIVE_TRASH_UI_PATH,
  isDriveTrashApiPath,
  isDriveTrashFolderName,
} from "@/drive-core/src/drive-path-utils";
import type { DriveFile, ViewKey } from "@/drive-core/src/drive-models";

export function isDriveUnderTrash(parent: string) {
  return parent === DRIVE_TRASH_UI_PATH || parent.startsWith(`${DRIVE_TRASH_UI_PATH}/`);
}

export function filterDriveVisibleItems({
  files,
  liveSearchResults,
  starredItems,
  starred,
  view,
  searchQuery,
  currentUsername,
  operations,
}: {
  files: DriveFile[];
  liveSearchResults: DriveFile[] | null;
  starredItems: DriveFile[] | null;
  starred: Record<string, boolean>;
  view: ViewKey;
  searchQuery: string;
  currentUsername: string;
  operations: unknown;
}): DriveFile[] {
  const q = searchQuery.trim().toLowerCase();
  const sourceFiles = liveSearchResults ?? files;
  const starredSourceFiles = operations ? (starredItems ?? []) : sourceFiles;
  const filtered = sourceFiles.filter((f) => {
    let inView = false;
    if (liveSearchResults) inView = true;
    else if (view.type === "folder")
      inView =
        f.parent === view.path &&
        !(
          view.path === "My Drive" &&
          f.kind === "folder" &&
          (isDriveTrashFolderName(f.title) ||
            (typeof f.apiPath === "string" &&
              (isDriveTrashApiPath(f.apiPath, currentUsername) ||
                f.apiPath.startsWith("/groups/"))))
        );
    else if (view.type === "recent") inView = !isDriveUnderTrash(f.parent) && f.kind !== "folder";
    else if (view.type === "starred") {
      if (operations) return false;
      inView = !!starred[f.id] && !isDriveUnderTrash(f.parent);
    } else if (view.type === "shared")
      inView = f.parent === "Shared with me" || f.parent.startsWith("Shared with me/");
    if (!inView) return false;
    if (!q) return true;
    const hay = `${f.title} ${f.excerpt}`.toLowerCase();
    return hay.includes(q);
  });
  const starredFiltered =
    view.type === "starred" && operations
      ? starredSourceFiles.filter((f) => {
          if (!starred[f.id] || isDriveUnderTrash(f.parent)) return false;
          if (!q) return true;
          const hay = `${f.title} ${f.excerpt}`.toLowerCase();
          return hay.includes(q);
        })
      : null;
  const items = starredFiltered ?? filtered;
  return items.sort((a, b) => {
    if (a.kind === "folder" && b.kind !== "folder") return -1;
    if (b.kind === "folder" && a.kind !== "folder") return 1;
    return 0;
  });
}
