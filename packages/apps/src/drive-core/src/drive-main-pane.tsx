import { Cloud, Download } from "lucide-react";
import { DriveViewIcon } from "@/drive-core/src/drive-view-icons";
import { useAppToast } from "@/hooks/use-app-toast";
import { CollectionState } from "@/collection-state/src/collection-state";
import { FileDropOverlay } from "@/file-drop-overlay/src/file-drop-overlay";
import { PathBreadcrumb } from "@/path-breadcrumb/src/path-breadcrumb";
import { DriveSearch } from "@/drive-core/src/drive-search";
import { UploadProgress } from "@/upload-progress/src/upload-progress";
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
    requestMoveItem,
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
    uploadProgress,
    folderListingPending,
    listLoading,
  } = controller;

  const showFolderListingBusy =
    view.type === "folder" &&
    !searchQuery.trim() &&
    (folderListingPending || listLoading);

  const { show, showError } = useAppToast();

  const handleDownload = (file: DriveFile) => {
    if (operations && file.apiPath && file.kind !== "folder") {
      void operations.downloadFile(file.apiPath).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        showError(message);
      });
    }
    show("Download started", { icon: <Download className="size-4" /> });
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
    onMove: requestMoveItem,
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

      {searchQuery.trim() ? null : (
        <PathBreadcrumb
          className="drive-main-pane__breadcrumbs"
          leadingIcon={<DriveViewIcon view={view} className="size-[1.125rem]" />}
          items={breadcrumbs}
          currentPath={view.type === "folder" ? view.path : undefined}
          onNavigate={(path) => selectView({ type: "folder", path })}
        />
      )}

      <div className="drive-main-pane__body">
        <div className="drive-main-pane__scroll">
          {showFolderListingBusy ? (
            <CollectionState variant="loading">{labels.folderListingLoading}</CollectionState>
          ) : visibleItems.length === 0 ? (
            <CollectionState icon={<Cloud className="size-12" />}>
              {labels.emptyFolder}
            </CollectionState>
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
                showError,
                onClose: () => setDetailOpen(false),
                onStar: () => toggleStar(active.id),
                onRename: () => requestRenameItem(active),
                onMove: () => requestMoveItem(active),
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
              showError,
              onClose: () => setDetailOpen(false),
              onStar: () => toggleStar(active.id),
              onRename: () => requestRenameItem(active),
              onMove: () => requestMoveItem(active),
              onDelete: () =>
                isUnderTrash(active.parent)
                  ? setConfirmDelete({ ids: [active.id], permanent: true })
                  : setConfirmDelete({ ids: [active.id], permanent: false }),
              mobile: true,
            })}
          />
        </div>
      ) : null}

      {!selectionMode ? (
        <div className="drive-floating-search">
          <DriveSearch
            placeholder={labels.searchPlaceholder}
            value={searchQuery}
            onSearch={setSearchQuery}
            inputRef={searchInputRef}
          />
        </div>
      ) : null}

      {uploadProgress ? (
        <div className="drive-floating-upload">
          <UploadProgress
            label={uploadProgress.label}
            percent={uploadProgress.percent}
            detail={uploadProgress.detail}
            done={uploadProgress.done}
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
  showError,
  onClose,
  onStar,
  onRename,
  onMove,
  onDelete,
  mobile,
}: {
  labels: DriveUILabels;
  file: DriveFile;
  previewSrc?: string;
  isStarred: boolean;
  inTrash: boolean;
  operations?: DriveAPIOperations;
  showError: (message: string) => void;
  onClose: () => void;
  onStar: () => void;
  onRename: () => void;
  onMove: () => void;
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
    onMove,
    onDelete,
    mobile,
    onDownload: () => {
      if (operations && file.apiPath && file.kind !== "folder") {
        void operations.downloadFile(file.apiPath).catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          showError(message);
        });
      }
    },
  };
}
