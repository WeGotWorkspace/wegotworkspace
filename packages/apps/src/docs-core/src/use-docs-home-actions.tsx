import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Pencil, Star, StarOff, Trash2 } from "lucide-react";
import { runQueuedBatchAction } from "@/hooks/use-batch-actions";
import { useQueuedMutation } from "@/hooks/use-queued-mutation";
import { useAppToast } from "@/hooks/use-app-toast";
import { readBrowserOnline } from "@/lib/offline/core/browser-online";
import {
  captureOfflineDocsTrashSnapshot,
  type DocsTrashUndoSnapshot,
  undoOfflineDocsTrash,
} from "@/lib/offline/docs/docs-hybrid-operations";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { ensureTrashFolder, resolveDriveFileApiPath } from "@/drive-core/src/drive-batch-utils";
import {
  apiPathFromUiPath,
  DRIVE_TRASH_UI_PATH,
  normalizeApiVirtualPath,
} from "@/drive-core/src/drive-path-utils";
import { parentAndName } from "@/lib/files/api-path";
import { joinFileNameForRename, splitFileNameForRename } from "@/lib/files/filename-rename";

const WRITE_QUEUE_DELAY_MS = 2500;

export type DocsHomeRenameState = { id: string; extension: string };
export type DocsHomeMoveState = { ids: string[] };
export type DocsHomeDeleteState = { ids: string[] };

type UseDocsHomeActionsArgs = {
  /** Live drive operations (star/download/rename/move/trash). Undefined in mock-only shells. */
  operations?: DriveAPIOperations;
  /** Currently loaded home files (used to resolve ids → api paths). */
  files: DriveFile[];
  /** Current user handle, for resolving My Drive / group api paths on move. */
  username: string;
  /** Known group roots, so move destinations under `Groups/*` resolve correctly. */
  groupRoots: string[];
  /** When set, enables offline trash undo (outbox + listing cache reversal). */
  offlineUsername?: string | null;
  /** Refresh the home list after a mutation that changes the listing. */
  reload: () => void;
};

export function useDocsHomeActions({
  operations,
  files,
  username,
  groupRoots,
  offlineUsername = null,
  reload,
}: UseDocsHomeActionsArgs) {
  const { show, showError } = useAppToast();
  const showMutationError = useCallback(
    (fallback = "Could not move this file to Trash.") => showError(fallback),
    [showError],
  );
  const { queueMutation, undoLatest } = useQueuedMutation({
    delayMs: WRITE_QUEUE_DELAY_MS,
    onMutationError: showMutationError,
  });
  const [hiddenFileIds, setHiddenFileIds] = useState<Set<string>>(() => new Set());

  const filesById = useMemo(() => {
    const map = new Map<string, DriveFile>();
    for (const file of files) map.set(file.id, file);
    return map;
  }, [files]);
  const fileById = useCallback((id: string) => filesById.get(id), [filesById]);

  const groupRootNames = useMemo(() => new Set(groupRoots), [groupRoots]);

  const [starredPaths, setStarredPaths] = useState<Set<string>>(new Set());
  const [renameState, setRenameState] = useState<DocsHomeRenameState | null>(null);
  const [renameName, setRenameName] = useState("");
  const [moveState, setMoveState] = useState<DocsHomeMoveState | null>(null);
  const [deleteState, setDeleteState] = useState<DocsHomeDeleteState | null>(null);

  useEffect(() => {
    if (!operations) return;
    const controller = new AbortController();
    void operations
      .listStars({ signal: controller.signal })
      .then((paths) => {
        if (controller.signal.aborted) return;
        setStarredPaths(new Set(paths.map((path) => normalizeApiVirtualPath(path))));
      })
      .catch(() => {});
    return () => controller.abort();
  }, [operations]);

  /** Star map keyed by file id (search ids differ from api paths, so resolve per file). */
  const starred = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const file of files) {
      if (file.apiPath && starredPaths.has(normalizeApiVirtualPath(file.apiPath))) {
        map[file.id] = true;
      }
    }
    return map;
  }, [files, starredPaths]);

  const onStar = useCallback(
    (id: string) => {
      const file = fileById(id);
      const apiPath = file?.apiPath ? normalizeApiVirtualPath(file.apiPath) : null;
      if (!apiPath) return;
      const next = !starredPaths.has(apiPath);
      setStarredPaths((prev) => {
        const updated = new Set(prev);
        if (next) updated.add(apiPath);
        else updated.delete(apiPath);
        return updated;
      });
      show(next ? "Starred" : "Unstarred", {
        icon: next ? (
          <Star className="size-4" fill="currentColor" />
        ) : (
          <StarOff className="size-4" />
        ),
      });
      if (!operations) return;
      void operations.setStar({ path: apiPath, starred: next }).catch(() => {
        setStarredPaths((prev) => {
          const updated = new Set(prev);
          if (next) updated.delete(apiPath);
          else updated.add(apiPath);
          return updated;
        });
        showError("Could not update star.");
      });
    },
    [fileById, operations, show, showError, starredPaths],
  );

  const onDownload = useCallback(
    (file: DriveFile) => {
      if (!operations || !file.apiPath) return;
      void operations
        .downloadFile(file.apiPath)
        .then(() => show("Download started", { icon: <Download className="size-4" /> }))
        .catch((error: unknown) => {
          showError(error instanceof Error ? error.message : "Could not download this file.");
        });
    },
    [operations, show, showError],
  );

  const onRename = useCallback((file: DriveFile) => {
    const { baseName, extension, hasExtension } = splitFileNameForRename(file.title);
    setRenameState({ id: file.id, extension: hasExtension ? extension : "" });
    setRenameName(baseName);
  }, []);

  const closeRename = useCallback(() => {
    setRenameState(null);
    setRenameName("");
  }, []);

  const submitRename = useCallback(() => {
    if (!renameState) return;
    const file = fileById(renameState.id);
    const apiPath = file?.apiPath ? normalizeApiVirtualPath(file.apiPath) : null;
    const nextName = renameState.extension
      ? joinFileNameForRename(renameName, renameState.extension)
      : renameName.trim();
    if (!file || !apiPath || !nextName || nextName === file.title) {
      closeRename();
      return;
    }
    closeRename();
    if (!operations) return;
    const { destination } = parentAndName(apiPath);
    void operations
      .renameItem({ destination, from: apiPath, to: nextName })
      .then(() => {
        show(`Renamed to “${nextName}”`, { icon: <Pencil className="size-4" /> });
        reload();
      })
      .catch((error: unknown) => {
        showError(error instanceof Error ? error.message : "Could not rename this file.");
      });
  }, [closeRename, fileById, operations, reload, renameName, renameState, show, showError]);

  const onMove = useCallback((file: DriveFile) => setMoveState({ ids: [file.id] }), []);
  const closeMove = useCallback(() => setMoveState(null), []);

  const requestMoveSelected = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setMoveState({ ids });
  }, []);

  const confirmMove = useCallback(
    (destinationUiPath: string) => {
      const state = moveState;
      closeMove();
      if (!state || !operations) return;
      const rows = state.ids
        .map((id) => fileById(id))
        .filter((file): file is DriveFile => !!file?.apiPath);
      if (rows.length === 0) return;
      const destination = apiPathFromUiPath(destinationUiPath, username, groupRootNames);
      void (async () => {
        try {
          for (const file of rows) {
            const apiPath = normalizeApiVirtualPath(file.apiPath!);
            await operations.renameItem({ destination, from: apiPath, to: file.title });
          }
          show(rows.length === 1 ? `Moved “${rows[0]!.title}”` : `Moved ${rows.length} files`);
          reload();
        } catch (error: unknown) {
          showError(error instanceof Error ? error.message : "Could not move this file.");
        }
      })();
    },
    [closeMove, fileById, groupRootNames, moveState, operations, reload, show, showError, username],
  );

  const onTrash = useCallback((file: DriveFile) => setDeleteState({ ids: [file.id] }), []);
  const closeDelete = useCallback(() => setDeleteState(null), []);

  const requestDeleteSelected = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setDeleteState({ ids });
  }, []);

  const confirmTrash = useCallback(() => {
    const state = deleteState;
    closeDelete();
    if (!state || !operations) return;
    const rows = state.ids
      .map((id) => fileById(id))
      .filter((file): file is DriveFile => !!file?.apiPath);
    if (rows.length === 0) return;

    const ids = rows.map((file) => file.id);
    setHiddenFileIds((prev) => {
      const next = new Set(prev);
      for (const id of ids) next.add(id);
      return next;
    });

    let completed = false;
    let offlineSnapshots: DocsTrashUndoSnapshot[] = [];

    const rollbackUi = () => {
      setHiddenFileIds((prev) => {
        const next = new Set(prev);
        for (const id of ids) next.delete(id);
        return next;
      });
      reload();
    };

    const revertTrash = async () => {
      if (offlineUsername && !readBrowserOnline()) {
        for (const snapshot of offlineSnapshots) {
          await undoOfflineDocsTrash(offlineUsername, snapshot);
        }
        reload();
        return;
      }
      for (const file of rows) {
        const from = resolveDriveFileApiPath(
          { ...file, parent: DRIVE_TRASH_UI_PATH },
          username,
          groupRootNames,
        );
        const destination = apiPathFromUiPath(file.parent, username, groupRootNames);
        await operations.renameItem({ destination, from, to: file.title });
      }
      reload();
    };

    const undo = () => {
      rollbackUi();
      if (completed) {
        void revertTrash().catch(() => undefined);
      }
    };

    runQueuedBatchAction({
      queueMutation,
      key: `docs:trash:${ids.slice().sort().join(",")}`,
      toastMessage:
        rows.length === 1
          ? `Moved “${rows[0]!.title}” to Trash`
          : `Moved ${rows.length} files to Trash`,
      icon: <Trash2 className="size-4" />,
      undoToastMessage: "Move to trash undone.",
      rollback: undo,
      executeImmediately: true,
      execute: async (signal) => {
        if (offlineUsername) {
          offlineSnapshots = await Promise.all(
            rows.map((file) => captureOfflineDocsTrashSnapshot(offlineUsername, file.apiPath!)),
          );
        }
        await ensureTrashFolder(operations, username, groupRootNames, signal);
        const destination = apiPathFromUiPath(DRIVE_TRASH_UI_PATH, username, groupRootNames);
        for (const file of rows) {
          const apiPath = normalizeApiVirtualPath(file.apiPath!);
          await operations.renameItem({ destination, from: apiPath, to: file.title }, { signal });
        }
        completed = true;
        reload();
      },
    });
  }, [
    closeDelete,
    deleteState,
    fileById,
    groupRootNames,
    offlineUsername,
    operations,
    queueMutation,
    reload,
    username,
  ]);

  const batchStar = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const rows = ids
        .map((id) => fileById(id))
        .filter((file): file is DriveFile => !!file?.apiPath);
      if (rows.length === 0) return;

      const nextValue = !ids.every((id) => {
        const file = fileById(id);
        const apiPath = file?.apiPath ? normalizeApiVirtualPath(file.apiPath) : null;
        return apiPath ? starredPaths.has(apiPath) : false;
      });

      setStarredPaths((prev) => {
        const updated = new Set(prev);
        for (const file of rows) {
          const apiPath = normalizeApiVirtualPath(file.apiPath!);
          if (nextValue) updated.add(apiPath);
          else updated.delete(apiPath);
        }
        return updated;
      });
      show(nextValue ? "Starred" : "Unstarred", {
        icon: nextValue ? (
          <Star className="size-4" fill="currentColor" />
        ) : (
          <StarOff className="size-4" />
        ),
      });
      if (!operations) return;
      void (async () => {
        try {
          await Promise.all(
            rows.map((file) =>
              operations.setStar({
                path: normalizeApiVirtualPath(file.apiPath!),
                starred: nextValue,
              }),
            ),
          );
        } catch {
          setStarredPaths((prev) => {
            const updated = new Set(prev);
            for (const file of rows) {
              const apiPath = normalizeApiVirtualPath(file.apiPath!);
              if (nextValue) updated.delete(apiPath);
              else updated.add(apiPath);
            }
            return updated;
          });
          showError("Could not update star.");
        }
      })();
    },
    [fileById, operations, show, showError, starredPaths],
  );

  return {
    starred,
    fileById,
    hiddenFileIds,
    undoLatest,
    onStar,
    onDownload,
    onRename,
    onMove,
    onTrash,
    renameState,
    renameName,
    setRenameName,
    submitRename,
    closeRename,
    moveState,
    closeMove,
    confirmMove,
    deleteState,
    closeDelete,
    confirmTrash,
    batchStar,
    requestMoveSelected,
    requestDeleteSelected,
  };
}

export type DocsHomeActions = ReturnType<typeof useDocsHomeActions>;
