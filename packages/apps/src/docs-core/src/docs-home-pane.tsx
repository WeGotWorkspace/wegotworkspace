import { useMemo } from "react";
import { FileText } from "lucide-react";
import { Button } from "@/button/src/button";
import { CollectionState } from "@/collection-state/src/collection-state";
import { ViewHeader } from "@/view-header/src/view-header";
import { ViewModeToggle, type ViewMode } from "@/view-mode-toggle/src/view-mode-toggle";
import { DriveGridView, DriveListView } from "@/drive-core/src/drive-browser";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { driveLabels } from "@/drive-core/src/drive-labels";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";

const noop = () => {};

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
}: DocsHomePaneProps) {
  const filesById = useMemo(() => {
    const map = new Map<string, DriveFile>();
    for (const file of files) map.set(file.id, file);
    return map;
  }, [files]);

  const openById = (id: string) => {
    const file = filesById.get(id);
    if (file) onOpenFile(file);
  };

  const browserProps = {
    items: files,
    imagePreviewUrls: {},
    selectedIds: [] as string[],
    starred: {} as Record<string, boolean>,
    labels: driveLabels,
    searchActive: false,
    inTrash: false,
    selectionMode: false,
    isTouch: false,
    showLocationColumn: true,
    isItemDragging: () => false,
    itemDragHandlers: () => ({ onDragStart: noop, onDragEnd: noop }),
    folderDropZoneProps: () => ({}),
    onSelect: (id: string) => openById(id),
    onOpen: onOpenFile,
    onLongPress: noop,
    onStar: noop,
    onDownload: noop,
    onRename: noop,
    onMove: noop,
    onTrash: noop,
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
                activeId={null}
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
