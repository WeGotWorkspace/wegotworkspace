import { useCallback, useEffect, useMemo, useState } from "react";
import { driveFileFromEntry } from "@/drive-core/src/drive-file-utils";
import { driveFolderUiPath } from "@/drive-core/src/drive-item-path";
import { DRIVE_MOCK_FILES } from "@/drive-core/src/drive-mock-files";
import {
  apiPathFromUiPath,
  isDriveTrashApiPath,
  isDriveTrashFolderName,
} from "@/drive-core/src/drive-path-utils";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";

function sortColumnItems(items: DriveFile[]): DriveFile[] {
  return [...items].sort((a, b) => {
    if (a.kind === "folder" && b.kind !== "folder") return -1;
    if (b.kind === "folder" && a.kind !== "folder") return 1;
    return a.title.localeCompare(b.title);
  });
}

function filterFolderChildren(
  items: DriveFile[],
  parentPath: string,
  currentUsername: string,
): DriveFile[] {
  return sortColumnItems(
    items.filter((file) => {
      if (file.parent !== parentPath) return false;
      if (
        parentPath === "My Drive" &&
        file.kind === "folder" &&
        (isDriveTrashFolderName(file.title) ||
          (typeof file.apiPath === "string" &&
            (isDriveTrashApiPath(file.apiPath, currentUsername) ||
              file.apiPath.startsWith("/groups/"))))
      ) {
        return false;
      }
      return true;
    }),
  );
}

export type UseDriveColumnViewArgs = {
  rootPath: string;
  seedItems: readonly DriveFile[];
  allFiles: readonly DriveFile[];
  operations?: DriveAPIOperations;
  currentUsername: string;
  groupRootNames: ReadonlySet<string>;
  resetKey: string;
};

export function useDriveColumnView({
  rootPath,
  seedItems,
  allFiles,
  operations,
  currentUsername,
  groupRootNames,
  resetKey,
}: UseDriveColumnViewArgs) {
  const [columnPaths, setColumnPaths] = useState<string[]>([rootPath]);
  const [itemsByPath, setItemsByPath] = useState<Record<string, DriveFile[]>>({});
  const [loadingPaths, setLoadingPaths] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setColumnPaths([rootPath]);
    setItemsByPath({});
    setLoadingPaths({});
  }, [resetKey, rootPath]);

  useEffect(() => {
    setItemsByPath((prev) => {
      const seeded = filterFolderChildren([...seedItems], rootPath, currentUsername);
      if (seeded.length === 0 && prev[rootPath]) return prev;
      return { ...prev, [rootPath]: seeded };
    });
  }, [currentUsername, rootPath, seedItems]);

  const ensurePathLoaded = useCallback(
    (path: string) => {
      if (itemsByPath[path] || loadingPaths[path]) return;

      const fromMemory = filterFolderChildren([...allFiles], path, currentUsername);
      if (fromMemory.length > 0 || !operations) {
        const mockChildren = !operations
          ? filterFolderChildren(DRIVE_MOCK_FILES, path, currentUsername)
          : fromMemory;
        setItemsByPath((prev) => ({ ...prev, [path]: mockChildren }));
        return;
      }

      const controller = new AbortController();
      setLoadingPaths((prev) => ({ ...prev, [path]: true }));
      void operations
        .listDirectory(apiPathFromUiPath(path, currentUsername, new Set(groupRootNames)), {
          signal: controller.signal,
        })
        .then((data) => {
          const mapped = data.directory.files.map((entry) =>
            driveFileFromEntry(entry, currentUsername),
          );
          setItemsByPath((prev) => ({
            ...prev,
            [path]: filterFolderChildren(mapped, path, currentUsername),
          }));
        })
        .catch(() => {
          if (!controller.signal.aborted) {
            setItemsByPath((prev) => ({ ...prev, [path]: [] }));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setLoadingPaths((prev) => {
              const next = { ...prev };
              delete next[path];
              return next;
            });
          }
        });

      return () => controller.abort();
    },
    [allFiles, currentUsername, groupRootNames, itemsByPath, loadingPaths, operations],
  );

  useEffect(() => {
    for (const path of columnPaths) {
      ensurePathLoaded(path);
    }
  }, [columnPaths, ensurePathLoaded]);

  const openFolder = useCallback((columnIndex: number, file: DriveFile) => {
    const nextPath = driveFolderUiPath(file);
    setColumnPaths((prev) => [...prev.slice(0, columnIndex + 1), nextPath]);
  }, []);

  const columns = useMemo(
    () =>
      columnPaths.map((path) => ({
        path,
        title: path.split("/").pop() ?? path,
        items: itemsByPath[path] ?? [],
        loading: Boolean(loadingPaths[path]),
      })),
    [columnPaths, itemsByPath, loadingPaths],
  );

  return { columns, openFolder };
}
