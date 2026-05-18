import { useCallback, type Dispatch, type SetStateAction } from "react";
import { FolderInput, Star, StarOff, Trash2 } from "lucide-react";
import { runQueuedBatchAction } from "@/hooks/use-batch-actions";
import type { DeferredApiWriteArgs } from "@/hooks/use-queued-mutation";
import type { BeginOptimisticUpdateFn } from "@/hooks/use-entity-batch-actions";
import {
  applyDriveListing,
  ensureTrashFolder,
  resolveDriveFileApiPath,
} from "@/drive-core/src/drive-batch-utils";
import { apiPathFromUiPath, DRIVE_TRASH_UI_PATH } from "@/drive-core/src/drive-path-utils";
import type { DriveFile, ViewKey } from "@/drive-core/src/drive-models";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";

type QueueMutation = (args: DeferredApiWriteArgs) => void;

type UseDriveBatchActionsArgs = {
  files: DriveFile[];
  setFiles: Dispatch<SetStateAction<DriveFile[]>>;
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  selectionMode: boolean;
  setSelectionMode: Dispatch<SetStateAction<boolean>>;
  activeId: string | null;
  setActiveId: Dispatch<SetStateAction<string | null>>;
  setDetailOpen: Dispatch<SetStateAction<boolean>>;
  starred: Record<string, boolean>;
  setStarred: Dispatch<SetStateAction<Record<string, boolean>>>;
  currentUsername: string;
  groupRootNames: Set<string>;
  operations?: DriveAPIOperations;
  queueMutation: QueueMutation;
  beginOptimisticUpdate: BeginOptimisticUpdateFn<DriveFile>;
  reloadStarredFromServer: () => void;
  setView: Dispatch<SetStateAction<ViewKey>>;
  viewType: ViewKey["type"];
};

export function useDriveBatchActions({
  files,
  setFiles,
  selectedIds,
  setSelectedIds,
  selectionMode,
  setSelectionMode,
  activeId,
  setActiveId,
  setDetailOpen,
  starred,
  setStarred,
  currentUsername,
  groupRootNames,
  operations,
  queueMutation,
  beginOptimisticUpdate,
  reloadStarredFromServer,
  setView,
  viewType,
}: UseDriveBatchActionsArgs) {
  const clearSelectionForIds = useCallback(
    (ids: string[]) => {
      setSelectedIds((prev) => prev.filter((id) => !ids.includes(id)));
      setSelectionMode(false);
      if (activeId && ids.includes(activeId)) {
        setActiveId(null);
        setDetailOpen(false);
      }
    },
    [activeId, setActiveId, setDetailOpen, setSelectedIds, setSelectionMode],
  );

  const moveToTrash = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const rows = files.filter((file) => ids.includes(file.id));
      if (rows.length === 0) return;

      const previousFiles = files;
      const previousSelectedIds = selectedIds;

      setFiles((prev) =>
        prev.map((file) =>
          ids.includes(file.id) ? { ...file, parent: DRIVE_TRASH_UI_PATH } : file,
        ),
      );
      clearSelectionForIds(ids);

      runQueuedBatchAction({
        queueMutation,
        key: `drive:trash:${ids.slice().sort().join(",")}`,
        toastMessage: `Moved ${ids.length} to Trash`,
        icon: <Trash2 className="size-4" />,
        execute: async (signal) => {
          if (!operations) return;
          await ensureTrashFolder(operations, currentUsername, groupRootNames, signal);
          const destination = apiPathFromUiPath(DRIVE_TRASH_UI_PATH, currentUsername, groupRootNames);
          let nextData: DriveUIData | null = null;
          for (const file of rows) {
            const from = resolveDriveFileApiPath(file, currentUsername, groupRootNames);
            nextData = await operations.renameItem(
              { destination, from, to: file.title },
              { signal },
            );
          }
          if (nextData) {
            applyDriveListing(nextData, currentUsername, setFiles, setView);
          }
        },
        rollback: () => {
          setFiles(previousFiles);
          setSelectedIds(previousSelectedIds);
          if (previousSelectedIds.length > 0) setSelectionMode(true);
        },
        undoToastMessage: "Move to trash undone.",
      });
    },
    [
      clearSelectionForIds,
      currentUsername,
      files,
      groupRootNames,
      operations,
      queueMutation,
      selectedIds,
      setFiles,
      setSelectedIds,
      setSelectionMode,
      setView,
    ],
  );

  const reallyDelete = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const rows = files.filter((file) => ids.includes(file.id));
      if (rows.length === 0) return;

      const previousFiles = files;
      const previousSelectedIds = selectedIds;

      setFiles((prev) => prev.filter((file) => !ids.includes(file.id)));
      clearSelectionForIds(ids);

      runQueuedBatchAction({
        queueMutation,
        key: `drive:delete:${ids.slice().sort().join(",")}`,
        toastMessage: `Deleted ${ids.length} file${ids.length === 1 ? "" : "s"}`,
        icon: <Trash2 className="size-4" />,
        execute: async (signal) => {
          if (!operations) return;
          const paths = rows.map((file) =>
            resolveDriveFileApiPath(file, currentUsername, groupRootNames),
          );
          const nextData = await operations.deleteItems(paths, { signal });
          applyDriveListing(nextData, currentUsername, setFiles, setView);
        },
        rollback: () => {
          setFiles(previousFiles);
          setSelectedIds(previousSelectedIds);
          if (previousSelectedIds.length > 0) setSelectionMode(true);
        },
        undoToastMessage: "Deletion undone.",
      });
    },
    [
      clearSelectionForIds,
      currentUsername,
      files,
      groupRootNames,
      operations,
      queueMutation,
      selectedIds,
      setFiles,
      setSelectedIds,
      setSelectionMode,
      setView,
    ],
  );

  const batchStar = useCallback(() => {
    if (selectedIds.length === 0) return;
    const rows = files.filter((file) => selectedIds.includes(file.id));
    if (rows.length === 0) return;

    const nextValue = !selectedIds.every((id) => starred[id]);
    const previousStarred = { ...starred };
    const toastIcon = nextValue ? (
      <Star className="size-4" fill="currentColor" />
    ) : (
      <StarOff className="size-4" />
    );

    setStarred((state) => {
      const next = { ...state };
      selectedIds.forEach((id) => {
        next[id] = nextValue;
      });
      return next;
    });

    runQueuedBatchAction({
      queueMutation,
      key: `drive:batch-star:${selectedIds.slice().sort().join(",")}`,
      toastMessage: `${nextValue ? "Starred" : "Unstarred"} ${selectedIds.length}`,
      icon: toastIcon,
      execute: async (signal) => {
        if (!operations) return;
        await Promise.all(
          rows.map((file) =>
            operations.setStar(
              { path: resolveDriveFileApiPath(file, currentUsername, groupRootNames), starred: nextValue },
              { signal },
            ),
          ),
        );
        if (viewType === "starred") reloadStarredFromServer();
      },
      rollback: () => {
        setStarred(previousStarred);
        if (viewType === "starred") reloadStarredFromServer();
      },
      undoToastMessage: "Star changes undone.",
    });
  }, [
    currentUsername,
    files,
    groupRootNames,
    operations,
    queueMutation,
    reloadStarredFromServer,
    selectedIds,
    setStarred,
    starred,
    viewType,
  ]);

  const moveToFolder = useCallback(
    (ids: string[], parent: string) => {
      if (ids.length === 0) return;
      const { rollback } = beginOptimisticUpdate({
        ids,
        updater: (file) => ({ ...file, parent }),
      });

      runQueuedBatchAction({
        queueMutation,
        key: `drive:move:${parent}:${ids.slice().sort().join(",")}`,
        toastMessage: `Moved ${ids.length} to ${parent.split("/").pop()}`,
        icon: <FolderInput className="size-4" />,
        execute: async (signal) => {
          if (!operations) return;
          const destination = apiPathFromUiPath(parent, currentUsername, groupRootNames);
          const items = files.filter((file) => ids.includes(file.id));
          let nextData: DriveUIData | null = null;
          for (const file of items) {
            const from = resolveDriveFileApiPath(file, currentUsername, groupRootNames);
            nextData = await operations.renameItem(
              { destination, from, to: file.title },
              { signal },
            );
          }
          if (nextData) {
            applyDriveListing(nextData, currentUsername, setFiles, setView);
          }
        },
        rollback,
        undoToastMessage: "Move undone.",
      });
    },
    [
      beginOptimisticUpdate,
      currentUsername,
      files,
      groupRootNames,
      operations,
      queueMutation,
      setFiles,
      setView,
    ],
  );

  return { moveToTrash, reallyDelete, batchStar, moveToFolder };
}
