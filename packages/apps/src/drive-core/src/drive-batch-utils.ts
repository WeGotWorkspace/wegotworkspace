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

export async function ensureTrashFolder(
  operations: DriveAPIOperations,
  username: string,
  groupRoots: Set<string>,
  signal?: AbortSignal,
) {
  const userRoot = apiPathFromUiPath("My Drive", username, groupRoots);
  try {
    await operations.createFolder({ cwd: userRoot, name: DRIVE_TRASH_DIR_NAME }, { signal });
  } catch {
    // Folder may already exist.
  }
}
