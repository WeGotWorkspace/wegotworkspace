import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Star, StarOff, Upload, FolderPlus, Pencil } from "lucide-react";
import { useAppToast } from "@/hooks/use-app-toast";
import { useEntityBatchActions } from "@/hooks/use-entity-batch-actions";
import { useIsTouch } from "@/hooks/use-is-touch";
import { useQueuedMutation } from "@/hooks/use-queued-mutation";
import { useSidebarListDrag } from "@/hooks/use-sidebar-list-drag";
import { canMoveDriveItemsToFolder } from "@/drive-core/src/drive-item-path";
import { useDriveBatchActions } from "@/drive-core/src/use-drive-batch-actions";
import { driveLabels } from "@/drive-core/src/drive-labels";
import { useDriveSelectionBar } from "@/drive-core/src/use-drive-selection-bar";
import { wgwEnsureOfficeSession } from "@/lib/api/wgw/http";
import type { DriveAPIOperations, DriveUIData, DriveUploadProgress } from "@/drive-core/src/drive-types";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { DRIVE_MOCK_FILES } from "@/drive-core/src/drive-mock-files";
import type { DriveFile, FileKind, ViewKey } from "@/drive-core/src/drive-models";
import { OFFICE_EDITOR_EXTENSIONS } from "@/drive-core/src/drive-models";
import { mergeDriveFolderListing, resolveDriveFileApiPath } from "@/drive-core/src/drive-batch-utils";
import {
  apiPathFromUiPath,
  DRIVE_TRASH_UI_PATH,
  isDriveTrashApiPath,
  isDriveTrashFolderName,
  normalizeApiVirtualPath,
  normalizeDriveFolderUiPath,
  uiPathFromApiPath,
} from "@/drive-core/src/drive-path-utils";
import { buildDriveFolderBreadcrumbs } from "@/drive-core/src/drive-breadcrumbs";
import {
  driveFileFromEntry,
  extensionFromFileName,
  formatBytesCompact,
} from "@/drive-core/src/drive-file-utils";

export type UseDriveControllerArgs = {
  data: DriveUIData;
  session: WorkspaceSession;
  operations?: DriveAPIOperations;
  listLoading?: boolean;
  view?: ViewKey;
  onViewChange?: (view: ViewKey) => void;
};

const WRITE_QUEUE_DELAY_MS = 2500;

export function useDriveController({
  data,
  session,
  operations,
  listLoading = false,
  view: controlledView,
  onViewChange,
}: UseDriveControllerArgs) {
  const { show, showError } = useAppToast();
  const showMutationError = useCallback(
    (fallback = "Could not sync this change. Please try again.") => showError(fallback),
    [showError],
  );

  const launchOfficeEditor = useCallback((params: URLSearchParams) => {
    const target = `/office/editor?${params.toString()}`;
    void wgwEnsureOfficeSession()
      .catch(() => {
        // Best effort: navigation still proceeds and server auth gate handles fallback.
      })
      .finally(() => {
        window.location.assign(target);
      });
  }, []);

  const currentUsername = data.user.username || session.user.username || "";
  const [files, setFiles] = useState<DriveFile[]>(
    operations
      ? data.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername))
      : DRIVE_MOCK_FILES,
  );
  const [internalView, setInternalView] = useState<ViewKey>({ type: "folder", path: "My Drive" });
  const isViewControlled = onViewChange !== undefined;
  const view = controlledView ?? internalView;
  const commitView = useCallback(
    (next: ViewKey) => {
      const normalized =
        next.type === "folder" ? { ...next, path: normalizeDriveFolderUiPath(next.path) } : next;
      if (isViewControlled) onViewChange!(normalized);
      else setInternalView(normalized);
    },
    [isViewControlled, onViewChange],
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastClickedId, setLastClickedId] = useState<string | null>(null);
  const [starred, setStarred] = useState<Record<string, boolean>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renameDialog, setRenameDialog] = useState<null | { id: string }>(null);
  const [renameName, setRenameName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<null | { ids: string[]; permanent: boolean }>(
    null,
  );
  const [moveDialog, setMoveDialog] = useState<{ ids: string[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [liveSearchResults, setLiveSearchResults] = useState<DriveFile[] | null>(null);
  const [starredItems, setStarredItems] = useState<DriveFile[] | null>(null);
  const [knownGroupRoots, setKnownGroupRoots] = useState<string[]>([]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const [dropUploadActive, setDropUploadActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    label: string;
    percent: number;
    detail: string;
    done: boolean;
  } | null>(null);
  const imagePreviewUrlsRef = useRef<Record<string, string>>({});
  const uploadProgressResetTimerRef = useRef<number | null>(null);
  const starredLoadVersionRef = useRef(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const syncedFolderPathRef = useRef<string | null>(null);

  useEffect(() => {
    const discovered = new Set<string>();
    for (const file of files) {
      if (!file.apiPath || !file.apiPath.startsWith("/groups/")) continue;
      const relative = file.apiPath.slice("/groups/".length);
      const [root] = relative.split("/");
      if (root) discovered.add(root);
    }
    if (discovered.size === 0) return;
    setKnownGroupRoots((prev) => {
      const next = new Set(prev);
      discovered.forEach((root) => next.add(root));
      return Array.from(next).sort((a, b) => a.localeCompare(b));
    });
  }, [files]);

  const groupRootNames = useMemo(() => new Set(knownGroupRoots), [knownGroupRoots]);
  const sidebarGroupPaths = useMemo(
    () => knownGroupRoots.map((root) => `Groups/${root}`),
    [knownGroupRoots],
  );

  const folderViewPath = view.type === "folder" ? view.path : null;

  useEffect(() => {
    if (!operations) return;
    const cwdPath = uiPathFromApiPath(data.cwd, currentUsername);
    if (isViewControlled && folderViewPath !== null && folderViewPath !== cwdPath) {
      return;
    }
    setFiles(data.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)));
    syncedFolderPathRef.current = folderViewPath ?? cwdPath;
    if (!isViewControlled) {
      commitView({ type: "folder", path: cwdPath });
    }
  }, [commitView, currentUsername, data, folderViewPath, isViewControlled, operations]);

  useEffect(() => {
    if (!operations || folderViewPath === null) return;
    if (syncedFolderPathRef.current === folderViewPath) return;

    const controller = new AbortController();
    void operations
      .changeDir(apiPathFromUiPath(folderViewPath, currentUsername, groupRootNames), {
        signal: controller.signal,
      })
      .then((nextData) => {
        const resolvedPath = uiPathFromApiPath(nextData.cwd, currentUsername);
        syncedFolderPathRef.current = resolvedPath;
        setFiles((previous) => mergeDriveFolderListing(previous, nextData, currentUsername));
        if (resolvedPath !== folderViewPath) {
          commitView({ type: "folder", path: resolvedPath });
        }
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const message = error instanceof Error ? error.message : String(error);
        showError(message);
      });

    return () => controller.abort();
  }, [
    commitView,
    currentUsername,
    folderViewPath,
    groupRootNames,
    operations,
    showError,
  ]);

  const selectView = useCallback(
    (v: ViewKey) => {
      if (v.type === "folder") {
        syncedFolderPathRef.current = null;
      }
      commitView(v);
      setLiveSearchResults(null);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        setSidebarOpen(false);
      }
    },
    [commitView],
  );

  const loadStarredItemsFromPaths = useCallback(
    (paths: string[]) => {
      if (!operations) {
        setStarredItems(null);
        return;
      }
      const requestVersion = starredLoadVersionRef.current + 1;
      starredLoadVersionRef.current = requestVersion;
      if (paths.length === 0) {
        setStarredItems([]);
        return;
      }
      void operations
        .listEntriesByPaths(paths)
        .then((entries) => {
          if (requestVersion !== starredLoadVersionRef.current) return;
          setStarredItems(entries.map((entry) => driveFileFromEntry(entry, currentUsername)));
        })
        .catch((error: unknown) => {
          if (requestVersion !== starredLoadVersionRef.current) return;
          const message = error instanceof Error ? error.message : String(error);
          showError(message);
        });
    },
    [operations, currentUsername],
  );

  const reloadStarredFromServer = useCallback(() => {
    if (!operations) return;
    void operations
      .listStars()
      .then((paths) => {
        const next: Record<string, boolean> = {};
        for (const path of paths) {
          next[path] = true;
        }
        setStarred(next);
        loadStarredItemsFromPaths(paths);
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showError(message);
      });
  }, [operations, loadStarredItemsFromPaths]);

  useEffect(() => {
    if (!operations) return;
    const query = searchQuery.trim();
    if (!query) {
      setLiveSearchResults(null);
      return;
    }
    let cancelled = false;
    const timeout = window.setTimeout(() => {
      void operations
        .search(query, { limit: 200 })
        .then((entries) => {
          if (!cancelled) {
            setLiveSearchResults(
              entries.map((entry) => driveFileFromEntry(entry, currentUsername)),
            );
          }
        })
        .catch((error: unknown) => {
          if (cancelled) return;
          const message = error instanceof Error ? error.message : String(error);
          showError(message);
        });
    }, 180);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [operations, searchQuery, currentUsername]);

  const isTouch = useIsTouch();
  const lastTouchTapRef = useRef<{ id: string; at: number } | null>(null);

  useEffect(() => {
    if (!operations) {
      setStarredItems(null);
      return;
    }
    reloadStarredFromServer();
  }, [operations, currentUsername, reloadStarredFromServer]);

  const inTrashView = view.type === "folder" && view.path === DRIVE_TRASH_UI_PATH;

  const isUnderTrash = (parent: string) =>
    parent === DRIVE_TRASH_UI_PATH || parent.startsWith(`${DRIVE_TRASH_UI_PATH}/`);

  const visibleItems = useMemo(() => {
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
      else if (view.type === "recent") inView = !isUnderTrash(f.parent) && f.kind !== "folder";
      else if (view.type === "starred") {
        if (operations) return false;
        inView = !!starred[f.id] && !isUnderTrash(f.parent);
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
            if (!starred[f.id] || isUnderTrash(f.parent)) return false;
            if (!q) return true;
            const hay = `${f.title} ${f.excerpt}`.toLowerCase();
            return hay.includes(q);
          })
        : null;
    const items = starredFiltered ?? filtered;
    // folders first
    return items.sort((a, b) => {
      if (a.kind === "folder" && b.kind !== "folder") return -1;
      if (b.kind === "folder" && a.kind !== "folder") return 1;
      return 0;
    });
  }, [files, liveSearchResults, operations, searchQuery, starred, starredItems, view]);

  const { beginOptimisticUpdate } = useEntityBatchActions<DriveFile>({
    items: files,
    setItems: setFiles,
    visibleIds: visibleItems.map((file) => file.id),
    activeId: activeId ?? "",
    setActiveId,
  });
  const { queueMutation } = useQueuedMutation({
    delayMs: WRITE_QUEUE_DELAY_MS,
    onMutationError: showMutationError,
  });
  const { moveToTrash, reallyDelete, batchStar, moveToFolder } = useDriveBatchActions({
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
    view,
    viewType: view.type,
  });

  const breadcrumbs = useMemo(() => {
    if (view.type !== "folder") {
      return [
        {
          label:
            view.type === "recent"
              ? "Recent"
              : view.type === "starred"
                ? "Starred"
                : "Shared with me",
          path: null as string | null,
        },
      ];
    }
    return buildDriveFolderBreadcrumbs(view.path, driveLabels);
  }, [driveLabels, view]);

  const viewLabel = breadcrumbs[breadcrumbs.length - 1].label;
  const viewResetKey = view.type === "folder" ? `${view.type}:${view.path}` : view.type;

  useEffect(() => {
    setSelectedIds([]);
    setActiveId(null);
    setSelectionMode(false);
    setDetailOpen(false);
    setRenameDialog(null);
    lastTouchTapRef.current = null;
  }, [viewResetKey]);

  useEffect(() => {
    if (!operations || viewMode !== "grid") return;
    const previewableItems = visibleItems.filter(
      (file) => (file.kind === "image" || file.kind === "video") && !!file.apiPath,
    );
    let cancelled = false;
    for (const file of previewableItems) {
      if (imagePreviewUrlsRef.current[file.id]) continue;
      void operations
        .readFileBlob(file.apiPath!)
        .then((blob) => {
          if (cancelled) return;
          const url = URL.createObjectURL(blob);
          setImagePreviewUrls((prev) => {
            if (prev[file.id]) {
              URL.revokeObjectURL(url);
              return prev;
            }
            const next = { ...prev, [file.id]: url };
            imagePreviewUrlsRef.current = next;
            return next;
          });
        })
        .catch(() => {
          // Ignore preview fetch failures; tile falls back to icon.
        });
    }
    return () => {
      cancelled = true;
    };
  }, [operations, viewMode, visibleItems]);

  useEffect(() => {
    const keepIds = new Set(
      viewMode === "grid"
        ? visibleItems
            .filter((file) => (file.kind === "image" || file.kind === "video") && !!file.apiPath)
            .map((file) => file.id)
        : [],
    );
    setImagePreviewUrls((prev) => {
      let changed = false;
      const next: Record<string, string> = {};
      for (const [id, url] of Object.entries(prev)) {
        if (keepIds.has(id)) next[id] = url;
        else {
          URL.revokeObjectURL(url);
          changed = true;
        }
      }
      if (!changed && Object.keys(next).length === Object.keys(prev).length) return prev;
      imagePreviewUrlsRef.current = next;
      return next;
    });
  }, [viewMode, visibleItems]);

  useEffect(() => {
    return () => {
      for (const url of Object.values(imagePreviewUrlsRef.current)) {
        URL.revokeObjectURL(url);
      }
      imagePreviewUrlsRef.current = {};
      if (uploadProgressResetTimerRef.current !== null) {
        window.clearTimeout(uploadProgressResetTimerRef.current);
      }
    };
  }, []);

  const active = activeId
    ? ((liveSearchResults?.find((f) => f.id === activeId) ??
        files.find((f) => f.id === activeId) ??
        null) as DriveFile | null)
    : null;

  useEffect(() => {
    if (
      !operations ||
      !detailOpen ||
      !active ||
      (active.kind !== "image" && active.kind !== "video") ||
      !active.apiPath
    )
      return;
    if (imagePreviewUrlsRef.current[active.id]) return;
    let cancelled = false;
    void operations
      .readFileBlob(active.apiPath)
      .then((blob) => {
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        setImagePreviewUrls((prev) => {
          if (prev[active.id]) {
            URL.revokeObjectURL(url);
            return prev;
          }
          const next = { ...prev, [active.id]: url };
          imagePreviewUrlsRef.current = next;
          return next;
        });
      })
      .catch(() => {
        // Keep icon fallback in detail panel.
      });
    return () => {
      cancelled = true;
    };
  }, [operations, detailOpen, active]);

  const openFile = (f: DriveFile) => {
    if (f.kind === "folder") {
      const next = f.parent === "" ? f.title : `${f.parent}/${f.title}`;
      selectView({ type: "folder", path: next });
    } else {
      const officeExt = extensionFromFileName(f.title);
      if (f.apiPath && OFFICE_EDITOR_EXTENSIONS.has(officeExt)) {
        const rel = f.apiPath.replace(/^\/+/, "");
        const qp = new URLSearchParams({ file: rel });
        launchOfficeEditor(qp);
        return;
      }
      setActiveId(f.id);
      setSelectedIds([f.id]);
      setDetailOpen(true);
    }
  };

  const handleSelect = (id: string, e: React.MouseEvent) => {
    if (isTouch && !selectionMode && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      const now = Date.now();
      const lastTap = lastTouchTapRef.current;
      if (lastTap && lastTap.id === id && now - lastTap.at < 350) {
        const tappedItem = visibleItems.find((file) => file.id === id);
        if (tappedItem) {
          lastTouchTapRef.current = null;
          openFile(tappedItem);
          return;
        }
      }
      lastTouchTapRef.current = { id, at: now };
    } else if (!isTouch) {
      lastTouchTapRef.current = null;
    }

    if (selectionMode) {
      setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
      setLastClickedId(id);
      return;
    }
    if (e.shiftKey && lastClickedId) {
      const ids = visibleItems.map((f) => f.id);
      const a = ids.indexOf(lastClickedId);
      const b = ids.indexOf(id);
      if (a === -1 || b === -1) setSelectedIds([id]);
      else {
        const [s, eIdx] = a < b ? [a, b] : [b, a];
        setSelectedIds(ids.slice(s, eIdx + 1));
      }
    } else if (e.metaKey || e.ctrlKey) {
      setSelectedIds((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
      setLastClickedId(id);
    } else {
      setSelectedIds([id]);
      setLastClickedId(id);
      setActiveId(id);
    }
  };

  const enterSelectionFor = (id: string) => {
    setSelectionMode(true);
    setSelectedIds((p) => (p.includes(id) ? p : [...p, id]));
  };
  const exitSelection = () => {
    setSelectionMode(false);
    setSelectedIds(activeId ? [activeId] : []);
  };

  const fileById = (id: string) =>
    (liveSearchResults?.find((file) => file.id === id) ?? files.find((file) => file.id === id)) ||
    null;

  const toggleStar = (id: string) => {
    const target = fileById(id);
    if (!target) return;
    const beforeStarred = !!starred[id];
    const nextValue = !beforeStarred;
    setStarred((s) => ({ ...s, [id]: nextValue }));
    if (!operations) {
      show(nextValue ? "Starred" : "Unstarred", {
        icon: nextValue ? (
          <Star className="size-4" fill="currentColor" />
        ) : (
          <StarOff className="size-4" />
        ),
      });
      return;
    }
    const apiPath = resolveDriveFileApiPath(target, currentUsername, groupRootNames);
    queueMutation({
      key: `drive:star:${id}`,
      toastMessage: nextValue ? "Starred" : "Unstarred",
      icon: nextValue ? (
        <Star className="size-4" fill="currentColor" />
      ) : (
        <StarOff className="size-4" />
      ),
      execute: async (signal) => {
        await operations.setStar({ path: apiPath, starred: nextValue }, { signal });
        if (view.type === "starred") reloadStarredFromServer();
      },
      undo: () => {
        setStarred((s) => ({ ...s, [id]: beforeStarred }));
        if (view.type === "starred") reloadStarredFromServer();
      },
      onError: () => {
        setStarred((s) => ({ ...s, [id]: beforeStarred }));
        if (view.type === "starred") reloadStarredFromServer();
      },
      undoToastMessage: "Star change undone.",
    });
  };

  const { isItemDragging, itemDragHandlers, sidebarDropZoneProps, dropZoneProps } =
    useSidebarListDrag(selectedIds);

  const commitMoveToFolder = useCallback(
    (ids: string[], destinationPath: string) => {
      const movable = canMoveDriveItemsToFolder(files, ids, destinationPath);
      if (movable.length > 0) moveToFolder(movable, destinationPath);
    },
    [files, moveToFolder],
  );

  const folderDropZoneProps = useCallback(
    (destinationPath: string) =>
      dropZoneProps(destinationPath, (ids) => commitMoveToFolder(ids, destinationPath)),
    [commitMoveToFolder, dropZoneProps],
  );

  const requestDeleteSelected = () => {
    if (selectedIds.length === 0) return;
    setConfirmDelete({ ids: selectedIds, permanent: inTrashView });
  };
  const requestDeleteItem = (file: DriveFile) => {
    setConfirmDelete({ ids: [file.id], permanent: isUnderTrash(file.parent) });
  };
  const requestRenameItem = (file: DriveFile) => {
    setRenameDialog({ id: file.id });
    setRenameName(file.title);
  };
  const openMoveDialog = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    setMoveDialog({ ids });
  }, []);
  const requestMoveSelected = () => openMoveDialog(selectedIds);
  const requestMoveItem = (file: DriveFile) => openMoveDialog([file.id]);
  const submitRenameItem = () => {
    if (!renameDialog) return;
    const file = fileById(renameDialog.id);
    if (!file) {
      setRenameDialog(null);
      return;
    }
    const nextName = renameName.trim();
    if (!nextName || nextName === file.title) {
      setRenameDialog(null);
      return;
    }
    const previousName = file.title;
    setFiles((prev) =>
      prev.map((item) => (item.id === file.id ? { ...item, title: nextName } : item)),
    );
    setRenameDialog(null);
    setRenameName("");
    show(`Renamed to “${nextName}”`, { icon: <Pencil className="size-4" /> });
    if (!operations) return;
    const destination = apiPathFromUiPath(file.parent, currentUsername, groupRootNames);
    const fromPath = file.apiPath ?? normalizeApiVirtualPath(`${destination}/${previousName}`);
    void operations
      .renameItem({
        destination,
        from: fromPath,
        to: nextName,
      })
      .then((nextData) => {
        setFiles(
          nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
        );
        commitView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
      })
      .catch((error: unknown) => {
        setFiles((prev) =>
          prev.map((item) => (item.id === file.id ? { ...item, title: previousName } : item)),
        );
        const message = error instanceof Error ? error.message : String(error);
        showError(message);
      });
  };
  const handleUpload = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const selected = Array.from(fileList);
    const targetParent = view.type === "folder" ? view.path : "My Drive";
    const showProgress = (progress: DriveUploadProgress) => {
      const totalBytes = Math.max(1, progress.totalBytes);
      const percent = Math.min(100, Math.round((progress.uploadedBytes / totalBytes) * 100));
      const fileLabel =
        progress.currentFileName.trim() !== ""
          ? `Uploading ${progress.currentFileName}`
          : "Uploading files";
      const detail = `${formatBytesCompact(progress.uploadedBytes)} / ${formatBytesCompact(progress.totalBytes)} · ${progress.filesCompleted}/${progress.filesTotal} files`;
      setUploadProgress({ label: fileLabel, percent, detail, done: false });
    };
    if (uploadProgressResetTimerRef.current !== null) {
      window.clearTimeout(uploadProgressResetTimerRef.current);
      uploadProgressResetTimerRef.current = null;
    }
    setUploadProgress({
      label:
        selected.length === 1
          ? `Uploading ${selected[0]!.name}`
          : `Uploading ${selected.length} files`,
      percent: 0,
      detail: `0 / ${formatBytesCompact(selected.reduce((sum, file) => sum + file.size, 0))}`,
      done: false,
    });
    if (operations) {
      void operations
        .checkUploadReady()
        .then(() =>
          operations.uploadFiles(
            {
              cwd: apiPathFromUiPath(targetParent, currentUsername, groupRootNames),
              files: selected,
            },
            { onProgress: showProgress },
          ),
        )
        .then((nextData) => {
          setFiles(
            nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
          );
          commitView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
          setUploadProgress({
            label: `Uploaded ${selected.length} file${selected.length === 1 ? "" : "s"}`,
            percent: 100,
            detail: "Upload complete",
            done: true,
          });
          uploadProgressResetTimerRef.current = window.setTimeout(() => {
            setUploadProgress(null);
            uploadProgressResetTimerRef.current = null;
          }, 1400);
          show(`Uploaded ${selected.length} file${selected.length === 1 ? "" : "s"}`, {
            icon: <Upload className="size-4" />,
          });
        })
        .catch((error: unknown) => {
          setUploadProgress(null);
          const message = error instanceof Error ? error.message : String(error);
          showError(message);
        });
      return;
    }
    const created: DriveFile[] = selected.map((file, i) => {
      const kind: FileKind = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : file.type.startsWith("audio/")
            ? "audio"
            : /zip|tar|gzip/.test(file.type)
              ? "archive"
              : /pdf|text|document/.test(file.type)
                ? "doc"
                : "file";
      const sizeKb = file.size / 1024;
      const size = sizeKb > 1024 ? `${(sizeKb / 1024).toFixed(1)} MB` : `${Math.round(sizeKb)} KB`;
      return {
        id: `f-${Date.now()}-${i}`,
        notebook: `${kind[0].toUpperCase()}${kind.slice(1)} · ${size}`,
        category: kind,
        date: "Now",
        title: file.name,
        excerpt: `Uploaded just now · ${size}`,
        body: [],
        tags: [],
        wordCount: 0,
        parent: targetParent,
        kind,
        size,
      };
    });
    setFiles((p) => [...created, ...p]);
    setUploadProgress({
      label: `Uploaded ${created.length} file${created.length === 1 ? "" : "s"}`,
      percent: 100,
      detail: "Upload complete",
      done: true,
    });
    uploadProgressResetTimerRef.current = window.setTimeout(() => {
      setUploadProgress(null);
      uploadProgressResetTimerRef.current = null;
    }, 1200);
    show(`Uploaded ${created.length} file${created.length === 1 ? "" : "s"}`, {
      icon: <Upload className="size-4" />,
    });
  };

  const createFolder = () => {
    setNewFolderName("");
    setNewFolderDialogOpen(true);
  };

  const submitCreateFolder = () => {
    const v = newFolderName.trim();
    if (!v) return;
    const targetParent = view.type === "folder" ? view.path : "My Drive";
    const id = `f-${Date.now()}`;
    setFiles((p) => [
      {
        id,
        notebook: "Folder",
        category: "Folder",
        date: "Now",
        title: v,
        excerpt: "0 items",
        body: [],
        tags: [],
        wordCount: 0,
        parent: targetParent,
        kind: "folder",
        size: "—",
      },
      ...p,
    ]);
    show(`Folder “${v}” created`, { icon: <FolderPlus className="size-4" /> });
    setNewFolderDialogOpen(false);
    setNewFolderName("");
    if (operations) {
      void operations
        .createFolder({
          cwd: apiPathFromUiPath(targetParent, currentUsername, groupRootNames),
          name: v,
        })
        .then((nextData) => {
          setFiles(
            nextData.directory.files.map((entry) => driveFileFromEntry(entry, currentUsername)),
          );
          commitView({ type: "folder", path: uiPathFromApiPath(nextData.cwd, currentUsername) });
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          showError(message);
        });
    }
  };

  const createBlank = (kind: "doc" | "sheet" | "slides") => {
    const editorKind = kind === "doc" ? "docx" : kind === "sheet" ? "xlsx" : "pptx";
    const qp = new URLSearchParams({ new: editorKind });
    launchOfficeEditor(qp);
  };

  useEffect(() => {
    const isMac =
      typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const inField =
        !!target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName));
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (!inField && e.key === "/")) {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (inField) return;
      if (e.key === "Escape" && detailOpen) {
        setDetailOpen(false);
        return;
      }
      const macDelete = isMac && (e.key === "Backspace" || (e.metaKey && e.key === "Backspace"));
      const winDelete = !isMac && e.key === "Delete";
      if ((macDelete || winDelete) && selectedIds.length > 0) {
        e.preventDefault();
        setConfirmDelete({ ids: selectedIds, permanent: inTrashView });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIds, detailOpen, inTrashView]);

  const { selectionBar } = useDriveSelectionBar({
    labels: driveLabels,
    files,
    selectedIds,
    selectionMode,
    activeId,
    inTrashView,
    operations,
    exitSelection,
    batchStar,
    requestDeleteSelected,
    requestMoveSelected,
  });

  return {
    labels: driveLabels,
    launchOfficeEditor,
    currentUsername,
    files, setFiles,
    view,
    setView: commitView,
    activeId, setActiveId,
    selectedIds, setSelectedIds,
    lastClickedId, setLastClickedId,
    starred, setStarred,
    sidebarOpen, setSidebarOpen,
    detailOpen, setDetailOpen,
    selectionMode, setSelectionMode,
    viewMode, setViewMode,
    newFolderDialogOpen, setNewFolderDialogOpen,
    newFolderName, setNewFolderName,
    renameDialog, setRenameDialog,
    renameName, setRenameName,
    confirmDelete, setConfirmDelete,
    moveDialog, setMoveDialog,
    searchQuery, setSearchQuery,
    liveSearchResults,
    starredItems,
    knownGroupRoots,
    imagePreviewUrls,
    dropUploadActive, setDropUploadActive,
    uploadProgress,
    fileInputRef,
    searchInputRef,
    isTouch,
    inTrashView,
    isUnderTrash,
    visibleItems,
    breadcrumbs,
    viewLabel,
    viewResetKey,
    active,
    groupRootNames,
    sidebarGroupPaths,
    openFile,
    handleSelect,
    enterSelectionFor,
    exitSelection,
    fileById,
    toggleStar,
    batchStar,
    moveToTrash,
    moveToFolder,
    commitMoveToFolder,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    folderDropZoneProps,
    selectionBar,
    requestDeleteSelected,
    requestDeleteItem,
    requestMoveSelected,
    requestMoveItem,
    openMoveDialog,
    requestRenameItem,
    submitRenameItem,
    reallyDelete,
    handleUpload,
    createFolder,
    submitCreateFolder,
    createBlank,
    selectView,
    listLoading,
    operations,
  };
}
