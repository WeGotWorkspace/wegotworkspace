import { useCallback, useMemo, useRef, useState } from "react";
import type { Dispatch, MouseEvent as ReactMouseEvent, SetStateAction } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/button/src/button";
import { CollectionState } from "@/collection-state/src/collection-state";
import { ViewHeader } from "@/view-header/src/view-header";
import { ViewModeToggle, type ViewMode } from "@/view-mode-toggle/src/view-mode-toggle";
import { useIsTouch } from "@/hooks/use-is-touch";
import { useWorkspaceListController } from "@/hooks/use-workspace-list-controller";
import { useWorkspaceListKeyboardShortcuts } from "@/hooks/use-workspace-list-keyboard-shortcuts";
import { DriveGridView, DriveListView } from "@/drive-core/src/drive-browser";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { driveLabels } from "@/drive-core/src/drive-labels";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";

const noop = () => {};
/** The home list is server-driven; the controller never mutates items locally. */
const noopSetItems: Dispatch<SetStateAction<DriveFile[]>> = () => {};

export type DocsHomePaneProps = {
  labels: DocsUILabels;
  files: DriveFile[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: string | null;
  query: string;
  onQueryChange: (query: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onLoadMore: () => void;
  onOpenFile: (file: DriveFile) => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  /** Star map keyed by file id. Defaults to empty when actions are not wired. */
  starred?: Record<string, boolean>;
  onStar?: (id: string) => void;
  onDownload?: (file: DriveFile) => void;
  onRename?: (file: DriveFile) => void;
  onMove?: (file: DriveFile) => void;
  onTrash?: (file: DriveFile) => void;
};

export function DocsHomePane({
  labels,
  files,
  loading,
  loadingMore,
  hasMore,
  error,
  query,
  onQueryChange,
  viewMode,
  onViewModeChange,
  onLoadMore,
  onOpenFile,
  sidebarOpen,
  onToggleSidebar,
  starred,
  onStar,
  onDownload,
  onRename,
  onMove,
  onTrash,
}: DocsHomePaneProps) {
  const filesById = useMemo(() => {
    const map = new Map<string, DriveFile>();
    for (const file of files) map.set(file.id, file);
    return map;
  }, [files]);

  const isTouch = useIsTouch();
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const lastTouchTapRef = useRef<{ id: string; at: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const visibleIds = useMemo(() => files.map((file) => file.id), [files]);

  // Reuse Drive's shared list controller so select/drag/keyboard behave identically.
  const {
    selectedIds,
    selectionMode,
    handleSelect: listHandleSelect,
    enterSelectionFor,
    isItemDragging,
    itemDragHandlers,
    navigateListByKeyboard,
    undoLatest,
  } = useWorkspaceListController<DriveFile>({
    items: files,
    setItems: noopSetItems,
    visibleIds,
    activeId: activeId ?? "",
    setActiveId: (id) => setActiveId(id),
    onPrimarySelect: (id) => setActiveId(id),
    onMutationError: noop,
  });

  const openFile = useCallback((file: DriveFile) => onOpenFile(file), [onOpenFile]);

  // Mirror use-drive-list: single click selects; a quick second tap on touch opens.
  const handleSelect = useCallback(
    (id: string, event: ReactMouseEvent) => {
      if (isTouch && !selectionMode && !event.shiftKey && !event.metaKey && !event.ctrlKey) {
        const now = Date.now();
        const lastTap = lastTouchTapRef.current;
        if (lastTap && lastTap.id === id && now - lastTap.at < 350) {
          const tapped = filesById.get(id);
          if (tapped) {
            lastTouchTapRef.current = null;
            openFile(tapped);
            return;
          }
        }
        lastTouchTapRef.current = { id, at: now };
      } else if (!isTouch) {
        lastTouchTapRef.current = null;
      }
      listHandleSelect(id, event);
    },
    [filesById, isTouch, listHandleSelect, openFile, selectionMode],
  );

  const requestDeleteSelection = useCallback(() => {
    if (!onTrash) return;
    const id = selectedIds[0] ?? activeId;
    const target = id ? filesById.get(id) : undefined;
    if (target) onTrash(target);
  }, [activeId, filesById, onTrash, selectedIds]);

  useWorkspaceListKeyboardShortcuts({
    searchInputRef,
    selectedCount: selectedIds.length,
    onRequestDeleteSelection: requestDeleteSelection,
    onNavigateList: navigateListByKeyboard,
    onUndoQueuedAction: undoLatest,
  });

  const browserProps = {
    items: files,
    imagePreviewUrls: {},
    selectedIds,
    starred: starred ?? {},
    labels: driveLabels,
    searchActive: false,
    inTrash: false,
    selectionMode,
    isTouch,
    showLocationColumn: true,
    isItemDragging,
    itemDragHandlers,
    folderDropZoneProps: () => ({}),
    onSelect: handleSelect,
    onOpen: openFile,
    onLongPress: enterSelectionFor,
    onStar: onStar ?? noop,
    onDownload: onDownload ?? noop,
    onRename: onRename ?? noop,
    onMove: onMove ?? noop,
    onTrash: onTrash ?? noop,
  };

  return (
    <section className="docs-home-pane">
      <div className="docs-home-pane__header">
        <ViewHeader
          title={labels.homeTitle}
          sidebarOpen={sidebarOpen}
          onToggleSidebar={onToggleSidebar}
          searchPlaceholder={labels.homeSearchPlaceholder}
          searchValue={query}
          onSearchInput={onQueryChange}
          searchInputRef={searchInputRef}
          actions={
            <ViewModeToggle
              value={viewMode}
              onChange={onViewModeChange}
              gridLabel={driveLabels.gridView}
              listLabel={driveLabels.listView}
            />
          }
        />
      </div>

      <div className="docs-home-pane__body drive-workspace">
        {loading ? (
          <CollectionState variant="loading">{labels.homeLoading}</CollectionState>
        ) : error ? (
          <CollectionState icon={<FileText className="size-12" />}>{error}</CollectionState>
        ) : files.length === 0 ? (
          <CollectionState icon={<FileText className="size-12" />}>
            {labels.homeEmpty}
          </CollectionState>
        ) : (
          <>
            {viewMode === "grid" ? (
              <DriveGridView {...browserProps} />
            ) : (
              <DriveListView
                {...browserProps}
                activeId={activeId}
                showKindColumn={false}
                locationColumnLabel={labels.homeLocationColumn}
              />
            )}
            {hasMore ? (
              <div className="docs-home-pane__load-more">
                <Button
                  variant="subtle"
                  size="sm"
                  label={labels.homeLoadMore}
                  disabled={loadingMore}
                  aria-busy={loadingMore}
                  onClick={onLoadMore}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    </section>
  );
}
