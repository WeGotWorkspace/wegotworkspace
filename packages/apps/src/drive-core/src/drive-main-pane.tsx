import { toast } from "sonner";
import { Cloud, Download } from "lucide-react";
import { CollectionEmptyState } from "@/collection-empty-state/src/collection-empty-state";
import { FileDropOverlay } from "@/file-drop-overlay/src/file-drop-overlay";
import { PathBreadcrumb } from "@/path-breadcrumb/src/path-breadcrumb";
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

  const handleDownload = (file: DriveFile) => {
    if (operations && file.apiPath && file.kind !== "folder") {
      void operations.downloadFile(file.apiPath).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        toast.error(message);
      });
    }
    toast("Download started", { icon: <Download className="size-4" /> });
  };

  const browserProps = {
    items: visibleItems,
    imagePreviewUrls,
    selectedIds,
    starred,
    labels,
    inTrash: inTrashView,
    selectionMode,
    isTouch,
    isItemDragging,
    itemDragHandlers,
    folderDropZoneProps,
    onSelect: handleSelect,
    onOpen: openFile,
    onLongPress: enterSelectionFor,
    onStar: toggleStar,
    onDownload: handleDownload,
    onRename: requestRenameItem,
    onTrash: requestDeleteItem,
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
            <DriveListView {...browserProps} activeId={activeId} />
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
                inTrash: inTrashView,
                operations,
                onClose: () => setDetailOpen(false),
                onStar: () => toggleStar(active.id),
                onRename: () => requestRenameItem(active),
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
              inTrash: inTrashView,
              operations,
              onClose: () => setDetailOpen(false),
              onStar: () => toggleStar(active.id),
              onRename: () => requestRenameItem(active),
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
  inTrash,
  operations,
  onClose,
  onStar,
  onRename,
  onDelete,
  mobile,
}: {
  labels: DriveUILabels;
  file: DriveFile;
  previewSrc?: string;
  isStarred: boolean;
  inTrash: boolean;
  operations?: DriveAPIOperations;
  onClose: () => void;
  onStar: () => void;
  onRename: () => void;
  onDelete: () => void;
  mobile?: boolean;
}) {
  return {
    labels,
    file,
    previewSrc,
    isStarred,
    inTrash,
    onClose,
    onStar,
    onRename,
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
