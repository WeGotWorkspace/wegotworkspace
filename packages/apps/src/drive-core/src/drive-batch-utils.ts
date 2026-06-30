import {
  apiPathFromUiPath,
  DRIVE_TRASH_DIR_NAME,
  normalizeApiVirtualPath,
  uiPathFromApiPath,
} from "@/drive-core/src/drive-path-utils";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import { driveFileFromEntry } from "@/drive-core/src/drive-file-utils";
import type { Dispatch, SetStateAction } from "react";
import type { ViewKey } from "@/drive-core/src/drive-models";

export function resolveDriveFileApiPath(
  file: DriveFile,
  username: string,
  groupRoots: Set<string>,
): string {
  if (file.apiPath) return normalizeApiVirtualPath(file.apiPath);
  const parentApi = apiPathFromUiPath(file.parent, username, groupRoots);
  return normalizeApiVirtualPath(`${parentApi}/${file.title}`);
}

export function applyDriveListing(
  nextData: DriveUIData,
  username: string,
  setFiles: Dispatch<SetStateAction<DriveFile[]>>,
  setView: Dispatch<SetStateAction<ViewKey>>,
) {
  setFiles(nextData.directory.files.map((entry) => driveFileFromEntry(entry, username)));
  setView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, username) });
}

function mapDriveListingEntries(nextData: DriveUIData, username: string): DriveFile[] {
  return nextData.directory.files.map((entry) => driveFileFromEntry(entry, username));
}

/** Keep optimistically moved items visible when opening a folder before listing refresh catches up. */
export function mergeDriveFolderListing(
  previousFiles: DriveFile[],
  nextData: DriveUIData,
  username: string,
): DriveFile[] {
  const folderPath = uiPathFromApiPath(nextData.cwd, username);
  const serverFiles = mapDriveListingEntries(nextData, username);
  const serverIds = new Set(serverFiles.map((file) => file.id));
  const staged = previousFiles.filter(
    (file) => file.parent === folderPath && !serverIds.has(file.id),
  );
  return [...serverFiles, ...staged];
}

export async function reloadDriveFolderListing(
  operations: DriveAPIOperations,
  folderPath: string,
  username: string,
  groupRoots: Set<string>,
  setFiles: Dispatch<SetStateAction<DriveFile[]>>,
  signal?: AbortSignal,
) {
  const nextData = await operations.changeDir(apiPathFromUiPath(folderPath, username, groupRoots), {
    signal,
  });
  setFiles((previous) => mergeDriveFolderListing(previous, nextData, username));
}

export async function ensureTrashFolder(
  operations: DriveAPIOperations,
  username: string,
  groupRoots: Set<string>,
  signal?: AbortSignal,
) {
  const userRoot = apiPathFromUiPath("My Drive", username, groupRoots);
  if (operations.listAllDirectoryEntries) {
    try {
      const entries = await operations.listAllDirectoryEntries(userRoot, { signal });
      if (entries.some((entry) => entry.name === DRIVE_TRASH_DIR_NAME)) return;
    } catch {
      // fall through to create
    }
  }
  try {
    await operations.createFolder({ cwd: userRoot, name: DRIVE_TRASH_DIR_NAME }, { signal });
  } catch {
    // Folder may already exist.
  }
}
