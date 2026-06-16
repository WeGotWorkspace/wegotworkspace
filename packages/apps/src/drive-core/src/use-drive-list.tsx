import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { useAppToast } from "@/hooks/use-app-toast";
import { useIsTouch } from "@/hooks/use-is-touch";
import { useSelectionResetOnKeyChange } from "@/hooks/use-selection-reset-on-key-change";
import { useWorkspaceListController } from "@/hooks/use-workspace-list-controller";
import { findDrivePluginForExtension } from "@/drive-core/src/drive-plugin-utils";
import { filterDriveVisibleItems } from "@/drive-core/src/drive-visible-items";
import { extensionFromFileName } from "@/drive-core/src/drive-file-utils";
import type { DriveFile } from "@/drive-core/src/drive-models";
import {
  DOCS_EDITOR_EXTENSIONS,
  SPREADSHEET_EDITOR_EXTENSIONS,
} from "@/drive-core/src/drive-models";
import type { DriveShellState } from "@/drive-core/src/use-drive-shell";

const WRITE_QUEUE_DELAY_MS = 2500;

export type UseDriveListArgs = {
  shell: DriveShellState;
  onOpenDocsFile?: (apiPath: string) => void;
  onOpenSpreadsheetFile?: (apiPath: string) => void;
};

export function useDriveList({ shell, onOpenDocsFile, onOpenSpreadsheetFile }: UseDriveListArgs) {
  const {
    files,
    setFiles,
    liveSearchResults,
    starredItems,
    starred,
    view,
    searchQuery,
    currentUsername,
    operations,
    viewResetKey,
    selectView,
    data,
    ensurePluginSessionBeforeNavigate,
  } = shell;

  const { showError } = useAppToast();
  const showMutationError = useCallback(
    (fallback = "Could not sync this change. Please try again.") => showError(fallback),
    [showError],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [imagePreviewUrls, setImagePreviewUrls] = useState<Record<string, string>>({});
  const imagePreviewUrlsRef = useRef<Record<string, string>>({});
  const recentOpenRef = useRef<{ key: string; at: number } | null>(null);
  const isTouch = useIsTouch();
  const lastTouchTapRef = useRef<{ id: string; at: number } | null>(null);

  const visibleItems = useMemo(
    () =>
      filterDriveVisibleItems({
        files,
        liveSearchResults,
        starredItems,
        starred,
        view,
        searchQuery,
        currentUsername,
        operations,
      }),
    [
      currentUsername,
      files,
      liveSearchResults,
      operations,
      searchQuery,
      starred,
      starredItems,
      view,
    ],
  );

  const visibleIds = useMemo(() => visibleItems.map((file) => file.id), [visibleItems]);

  const {
    selectedIds,
    setSelectedIds,
    selectionMode,
    setSelectionMode,
    handleSelect: listHandleSelect,
    enterSelectionFor,
    exitSelection,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    beginOptimisticUpdate,
    queueMutation,
    undoLatest,
    navigateListByKeyboard,
  } = useWorkspaceListController<DriveFile>({
    items: files,
    setItems: setFiles,
    visibleIds,
    activeId: activeId ?? "",
    setActiveId: (id) => setActiveId(id),
    onPrimarySelect: (id) => setActiveId(id),
    onMutationError: showMutationError,
    queueDelayMs: WRITE_QUEUE_DELAY_MS,
  });

  useSelectionResetOnKeyChange({
    resetKey: viewResetKey,
    setSelectedIds,
    setSelectionMode,
  });

  useEffect(() => {
    setActiveId(null);
    setDetailOpen(false);
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
    const openKey = f.apiPath ?? `${f.parent}/${f.title}`;
    const now = Date.now();
    const recent = recentOpenRef.current;
    if (recent && recent.key === openKey && now - recent.at < 700) {
      return;
    }
    recentOpenRef.current = { key: openKey, at: now };

    if (f.kind === "folder") {
      const next = f.parent === "" ? f.title : `${f.parent}/${f.title}`;
      selectView({ type: "folder", path: next });
    } else {
      const ext = extensionFromFileName(f.title);
      if (f.apiPath && DOCS_EDITOR_EXTENSIONS.has(ext) && onOpenDocsFile) {
        onOpenDocsFile(f.apiPath);
        return;
      }
      if (f.apiPath && SPREADSHEET_EDITOR_EXTENSIONS.has(ext) && onOpenSpreadsheetFile) {
        onOpenSpreadsheetFile(f.apiPath);
        return;
      }
      if (f.apiPath) {
        const plugin = findDrivePluginForExtension(data.plugins, ext);
        if (plugin?.drive?.openFileRoute && plugin.drive.openFileQueryParam) {
          const rel = f.apiPath.replace(/^\/+/, "");
          const qp = new URLSearchParams({ [plugin.drive.openFileQueryParam]: rel });
          const target = `${plugin.drive.openFileRoute}?${qp.toString()}`;
          ensurePluginSessionBeforeNavigate(plugin.integration?.sessionApiPath, () => {
            window.open(target, "_blank", "noopener,noreferrer");
          });
          return;
        }
      }
      if (f.apiPath && operations) {
        const popup = window.open("about:blank", "_blank", "noopener,noreferrer");
        void operations
          .readFileBlob(f.apiPath)
          .then((blob) => {
            const url = URL.createObjectURL(blob);
            if (popup && !popup.closed) {
              popup.location.href = url;
            } else {
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = f.title || "download";
              anchor.style.display = "none";
              document.body.appendChild(anchor);
              anchor.click();
              anchor.remove();
            }
            window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
          })
          .catch(() => {
            if (popup && !popup.closed) popup.close();
            setActiveId(f.id);
            setSelectedIds([f.id]);
            setDetailOpen(true);
          });
        return;
      }
      setActiveId(f.id);
      setSelectedIds([f.id]);
      setDetailOpen(true);
    }
  };

  const handleSelect = useCallback(
    (id: string, e: ReactMouseEvent) => {
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
      listHandleSelect(id, e);
    },
    [isTouch, listHandleSelect, openFile, selectionMode, visibleItems],
  );

  const fileById = (id: string) =>
    (liveSearchResults?.find((file) => file.id === id) ?? files.find((file) => file.id === id)) ||
    null;

  const dropZoneProps = sidebarDropZoneProps;

  return {
    activeId,
    setActiveId,
    selectedIds,
    setSelectedIds,
    detailOpen,
    setDetailOpen,
    selectionMode,
    setSelectionMode,
    viewMode,
    setViewMode,
    visibleItems,
    active,
    imagePreviewUrls,
    isTouch,
    openFile,
    handleSelect,
    enterSelectionFor,
    exitSelection,
    fileById,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    dropZoneProps,
    beginOptimisticUpdate,
    queueMutation,
    undoLatest,
    navigateListByKeyboard,
  };
}

export type DriveListState = ReturnType<typeof useDriveList>;
