import { useEffect, useMemo, useState } from "react";
import { Cloud, Folder } from "lucide-react";
import { kindIcon } from "@/drive-core/src/drive-icons";
import { CollectionState } from "@/collection-state/src/collection-state";
import {
  buildDriveFolderPickerBreadcrumbs,
  DRIVE_FOLDER_PICKER_ROOT,
} from "@/drive-core/src/drive-breadcrumbs";
import { driveFileFromEntry } from "@/drive-core/src/drive-file-utils";
import { canMoveDriveItemsToFolder, driveFolderUiPath } from "@/drive-core/src/drive-item-path";
import { DRIVE_MOCK_FILES } from "@/drive-core/src/drive-mock-files";
import {
  apiPathFromUiPath,
  DRIVE_TRASH_UI_PATH,
  isDriveTrashApiPath,
  isDriveTrashFolderName,
} from "@/drive-core/src/drive-path-utils";
import { DriveViewIcon } from "@/drive-core/src/drive-view-icons";
import type { DriveFile, ViewKey } from "@/drive-core/src/drive-models";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import { PathBreadcrumb } from "@/path-breadcrumb/src/path-breadcrumb";
import { DestinationPickerFrame } from "@/destination-picker/src/destination-picker-frame";
import { DestinationPickerList } from "@/destination-picker/src/destination-picker-list";
import "@/drive-core/src/drive-folder-picker.css";

const GROUPS_ROOT = "Groups";

function isTrashPath(path: string) {
  return path === DRIVE_TRASH_UI_PATH || path.startsWith(`${DRIVE_TRASH_UI_PATH}/`);
}

function isTrashPickerFile(file: DriveFile) {
  if (isDriveTrashFolderName(file.title)) return true;
  if (isTrashPath(file.parent)) return true;
  return isTrashPath(driveFolderUiPath(file));
}

function isTrashPickerPath(path: string) {
  return isTrashPath(path);
}

function sharedDriveRootLabel(path: string, labels: DriveUILabels): string {
  const segment = path.split("/").pop();
  return segment && segment !== "Groups" ? segment : labels.sidebarSharedDrives;
}

type PickerRow = {
  kind: "root" | "folder" | "file";
  path: string;
  title: string;
  file?: DriveFile;
  /** False for files and other non-destination rows. */
  selectable: boolean;
};

function filterPickerListingFiles(
  listing: DriveFile[],
  browsePath: string,
  currentUsername: string,
): DriveFile[] {
  return listing.filter((file) => {
    if (isTrashPickerFile(file)) return false;
    if (
      browsePath === "My Drive" &&
      file.kind === "folder" &&
      (isDriveTrashFolderName(file.title) ||
        (typeof file.apiPath === "string" &&
          (isDriveTrashApiPath(file.apiPath, currentUsername) ||
            file.apiPath.startsWith("/groups/"))))
    ) {
      return false;
    }
    return true;
  });
}

function rowsAtBrowsePath(
  moveContextFiles: DriveFile[],
  listingFiles: DriveFile[],
  browsePath: string,
  groupPaths: string[],
  labels: DriveUILabels,
  moveIds: string[],
): PickerRow[] {
  if (browsePath === DRIVE_FOLDER_PICKER_ROOT) {
    const roots: PickerRow[] = [
      {
        kind: "root",
        path: "My Drive",
        title: labels.sidebarMyDrive,
        selectable: canMoveDriveItemsToFolder(moveContextFiles, moveIds, "My Drive").length > 0,
      },
      ...groupPaths.map((path) => ({
        kind: "root" as const,
        path,
        title: sharedDriveRootLabel(path, labels),
        selectable: canMoveDriveItemsToFolder(moveContextFiles, moveIds, path).length > 0,
      })),
    ];
    // Always list roots so users can open "My Drive" or shared drives to pick a subfolder,
    // even when the root itself is not a valid destination (e.g. items already in My Drive).
    return roots;
  }

  if (browsePath === GROUPS_ROOT) {
    return groupPaths
      .map((path) => ({
        kind: "root" as const,
        path,
        title: sharedDriveRootLabel(path, labels),
        selectable: canMoveDriveItemsToFolder(moveContextFiles, moveIds, path).length > 0,
      }))
      .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));
  }

  const folderRows: PickerRow[] = listingFiles
    .filter((file) => file.kind === "folder")
    .map((file) => ({
      kind: "folder" as const,
      file,
      path: driveFolderUiPath(file),
      title: file.title,
      selectable:
        canMoveDriveItemsToFolder(moveContextFiles, moveIds, driveFolderUiPath(file)).length > 0,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

  const fileRows: PickerRow[] = listingFiles
    .filter((file) => file.kind !== "folder")
    .map((file) => ({
      kind: "file" as const,
      file,
      path: file.id,
      title: file.title,
      selectable: false,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }));

  return [...folderRows, ...fileRows];
}

export function DriveFolderPicker({
  labels,
  files,
  groupPaths,
  moveIds,
  initialBrowsePath,
  operations,
  currentUsername,
  groupRootNames,
  onDestinationChange,
}: {
  labels: DriveUILabels;
  /** Items being moved (for destination validation). */
  files: DriveFile[];
  groupPaths: string[];
  moveIds: string[];
  initialBrowsePath: string;
  operations?: DriveAPIOperations;
  currentUsername: string;
  groupRootNames: Set<string>;
  onDestinationChange: (path: string | null) => void;
}) {
  const [browsePath, setBrowsePath] = useState(initialBrowsePath);
  const [listingFiles, setListingFiles] = useState<DriveFile[]>([]);
  const [listingLoading, setListingLoading] = useState(false);
  const [highlightedPath, setHighlightedPath] = useState<string | null>(() =>
    canMoveDriveItemsToFolder(files, moveIds, initialBrowsePath).length > 0
      ? initialBrowsePath
      : null,
  );

  useEffect(() => {
    setBrowsePath(initialBrowsePath);
    setHighlightedPath(
      canMoveDriveItemsToFolder(files, moveIds, initialBrowsePath).length > 0
        ? initialBrowsePath
        : null,
    );
  }, [files, initialBrowsePath, moveIds]);

  useEffect(() => {
    if (browsePath === DRIVE_FOLDER_PICKER_ROOT || browsePath === GROUPS_ROOT) {
      setListingFiles([]);
      setListingLoading(false);
      return;
    }

    if (!operations) {
      const children = DRIVE_MOCK_FILES.filter(
        (file) => file.parent === browsePath && !isTrashPickerFile(file),
      );
      setListingFiles(filterPickerListingFiles(children, browsePath, currentUsername));
      setListingLoading(false);
      return;
    }

    const controller = new AbortController();
    setListingLoading(true);
    void operations
      .listDirectory(apiPathFromUiPath(browsePath, currentUsername, groupRootNames), {
        signal: controller.signal,
      })
      .then((data) => {
        const mapped = data.directory.files.map((entry) =>
          driveFileFromEntry(entry, currentUsername),
        );
        setListingFiles(filterPickerListingFiles(mapped, browsePath, currentUsername));
      })
      .catch(() => {
        if (!controller.signal.aborted) setListingFiles([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setListingLoading(false);
      });

    return () => controller.abort();
  }, [browsePath, operations, currentUsername, groupRootNames]);

  const rows = useMemo(
    () => rowsAtBrowsePath(files, listingFiles, browsePath, groupPaths, labels, moveIds),
    [browsePath, files, listingFiles, groupPaths, labels, moveIds],
  );

  const destinationPath =
    highlightedPath ?? (browsePath !== DRIVE_FOLDER_PICKER_ROOT ? browsePath : null);

  useEffect(() => {
    onDestinationChange(destinationPath);
  }, [destinationPath, onDestinationChange]);

  const breadcrumbItems = useMemo(
    () => buildDriveFolderPickerBreadcrumbs(browsePath, labels),
    [browsePath, labels],
  );

  const breadcrumbView = useMemo<ViewKey>(() => {
    if (browsePath === DRIVE_FOLDER_PICKER_ROOT) {
      return { type: "folder", path: "My Drive" };
    }
    if (browsePath.startsWith(`${GROUPS_ROOT}/`)) {
      return { type: "folder", path: browsePath };
    }
    return { type: "folder", path: browsePath.startsWith("My Drive") ? browsePath : "My Drive" };
  }, [browsePath]);

  const openRow = (path: string) => {
    if (isTrashPickerPath(path)) return;
    setBrowsePath(path);
    setHighlightedPath(canMoveDriveItemsToFolder(files, moveIds, path).length > 0 ? path : null);
  };

  const showEmpty = !listingLoading && rows.length === 0 && browsePath !== DRIVE_FOLDER_PICKER_ROOT;

  const showListingLoading =
    listingLoading && browsePath !== DRIVE_FOLDER_PICKER_ROOT && browsePath !== GROUPS_ROOT;

  return (
    <DestinationPickerFrame
      breadcrumbs={
        <PathBreadcrumb
          size="sm"
          className="destination-picker__breadcrumbs"
          leadingIcon={<DriveViewIcon view={breadcrumbView} className="size-3.5" />}
          items={breadcrumbItems}
          currentPath={browsePath}
          alwaysNavigablePaths={[DRIVE_FOLDER_PICKER_ROOT]}
          onNavigate={(path) => openRow(path)}
        />
      }
    >
      {showListingLoading ? (
        <CollectionState variant="loading">{labels.folderListingLoading}</CollectionState>
      ) : showEmpty ? (
        <CollectionState icon={<Cloud className="size-12" />}>{labels.emptyFolder}</CollectionState>
      ) : rows.length === 0 ? null : (
        <DestinationPickerList
          items={rows.map((row) => {
            const navigable = row.kind === "folder" || row.kind === "root";
            const icon =
              row.kind === "folder" || row.kind === "root" ? (
                <Folder fill="currentColor" fillOpacity={0.18} />
              ) : (
                <span className="[&>svg]:size-4">{row.file ? kindIcon[row.file.kind] : null}</span>
              );

            return {
              id: row.path,
              title: row.title,
              icon,
              selectable: row.selectable,
              navigable,
            };
          })}
          selectedId={highlightedPath}
          onSelect={setHighlightedPath}
          onOpen={openRow}
        />
      )}
    </DestinationPickerFrame>
  );
}
