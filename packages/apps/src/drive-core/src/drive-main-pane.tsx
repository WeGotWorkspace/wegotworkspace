import { toast } from "sonner";
import { Cloud } from "lucide-react";
import { CollectionEmptyState } from "@/collection-empty-state/src/collection-empty-state";
import { FileDropOverlay } from "@/file-drop-overlay/src/file-drop-overlay";
import { PathBreadcrumb } from "@/path-breadcrumb/src/path-breadcrumb";
import { ViewModeToggle } from "@/view-mode-toggle/src/view-mode-toggle";
import { SearchBar } from "@/search-bar/src/search-bar";
import { DriveDetailPanel, DriveGridView, DriveListView } from "@/drive-core/src/drive-browser";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import type { useDriveController } from "@/drive-core/src/use-drive-controller";

type DriveController = ReturnType<typeof useDriveController>;

export type DriveMainPaneProps = {
  controller: DriveController;
  operations?: DriveAPIOperations;
};

export function DriveMainPane({ controller, operations }: DriveMainPaneProps) {
  const {
    labels,
    view,
    dropUploadActive,
    setDropUploadActive,
    handleUpload,
    breadcrumbs,
    selectView,
    visibleItems,
    viewMode,
    setViewMode,
    imagePreviewUrls,
    selectedIds,
    starred,
    selectionMode,
    isTouch,
    handleSelect,
    openFile,
    enterSelectionFor,
    toggleStar,
    requestDeleteItem,
    requestRenameItem,
    isItemDragging,
    itemDragHandlers,
    folderDropZoneProps,
    activeId,
    inTrashView,
    detailOpen,
    active,
    setDetailOpen,
    isUnderTrash,
    setConfirmDelete,
    selectionBar,
    searchQuery,
    setSearchQuery,
    searchInputRef,
  } = controller;

  const browserProps = {
    items: visibleItems,
    imagePreviewUrls,
    selectedIds,
    starred,
    selectionMode,
    isTouch,
    isItemDragging,
    itemDragHandlers,
    folderDropZoneProps,
    onSelect: handleSelect,
    onOpen: openFile,
    onLongPress: enterSelectionFor,
    onStar: toggleStar,
    onTrash: requestDeleteItem,
    onRename: requestRenameItem,
  };

  const dropTargetLabel =
    view.type === "folder"
      ? view.path.split("/").pop() || labels.sidebarMyDrive
      : labels.sidebarMyDrive;

  return (
    <section
      className="drive-main-pane"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDropUploadActive(true);
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDropUploadActive(false);
        }
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        setDropUploadActive(false);
        handleUpload(event.dataTransfer.files);
      }}
    >
      {dropUploadActive ? (
        <FileDropOverlay>
          {labels.dropUploadHint} {dropTargetLabel}
        </FileDropOverlay>
      ) : null}

      <div className="drive-main-toolbar">
        <SearchBar
          placeholder={labels.searchPlaceholder}
          value={searchQuery}
          onSearch={setSearchQuery}
          inputRef={searchInputRef}
        />
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          gridLabel={labels.gridView}
          listLabel={labels.listView}
        />
      </div>

      <PathBreadcrumb
        className="drive-main-pane__breadcrumbs"
        items={breadcrumbs}
        onNavigate={(path) => selectView({ type: "folder", path })}
      />

      <div className="drive-main-pane__body">
        <div className="drive-main-pane__scroll">
          {visibleItems.length === 0 ? (
            <CollectionEmptyState icon={<Cloud className="size-12" />}>
              {labels.emptyFolder}
            </CollectionEmptyState>
          ) : viewMode === "grid" ? (
            <DriveGridView {...browserProps} />
          ) : (
            <DriveListView {...browserProps} activeId={activeId} inTrash={inTrashView} />
          )}
        </div>

        {detailOpen && active ? (
          <aside className="drive-detail-aside">
            <DriveDetailPanel
              {...buildDetailPanelProps({
                labels,
                file: active,
                previewSrc: imagePreviewUrls[active.id],
                isStarred: !!starred[active.id],
                operations,
                onClose: () => setDetailOpen(false),
                onStar: () => toggleStar(active.id),
                onShare: () => void controller.copyShareLink(active),
                onDelete: () =>
                  isUnderTrash(active.parent)
                    ? setConfirmDelete({ ids: [active.id], permanent: true })
                    : setConfirmDelete({ ids: [active.id], permanent: false }),
              })}
            />
          </aside>
        ) : null}
      </div>

      {detailOpen && active ? (
        <div className="drive-detail-overlay">
          <DriveDetailPanel
            {...buildDetailPanelProps({
              labels,
              file: active,
              previewSrc: imagePreviewUrls[active.id],
              isStarred: !!starred[active.id],
              operations,
              onClose: () => setDetailOpen(false),
              onStar: () => toggleStar(active.id),
              onShare: () => void controller.copyShareLink(active),
              onDelete: () =>
                isUnderTrash(active.parent)
                  ? setConfirmDelete({ ids: [active.id], permanent: true })
                  : setConfirmDelete({ ids: [active.id], permanent: false }),
              mobile: true,
            })}
          />
        </div>
      ) : null}

      {selectionBar}
    </section>
  );
}

function buildDetailPanelProps({
  labels,
  file,
  previewSrc,
  isStarred,
  operations,
  onClose,
  onStar,
  onShare,
  onDelete,
  mobile,
}: {
  labels: DriveUILabels;
  file: DriveFile;
  previewSrc?: string;
  isStarred: boolean;
  operations?: DriveAPIOperations;
  onClose: () => void;
  onStar: () => void;
  onShare: () => void;
  onDelete: () => void;
  mobile?: boolean;
}) {
  return {
    labels,
    file,
    previewSrc,
    isStarred,
    onClose,
    onStar,
    onShare,
    onDelete,
    mobile,
    onDownload: () => {
      if (operations && file.apiPath && file.kind !== "folder") {
        void operations.downloadFile(file.apiPath).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          toast.error(message);
        });
      }
    },
  };
}
