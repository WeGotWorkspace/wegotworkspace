import { useEffect, useState, type TransitionEvent } from "react";
import { Cloud, Download } from "lucide-react";
import { DriveViewIcon } from "@/drive-core/src/drive-view-icons";
import { useAppToast } from "@/hooks/use-app-toast";
import { CollectionState } from "@/collection-state/src/collection-state";
import { FileDropOverlay } from "@/file-drop-overlay/src/file-drop-overlay";
import { PathBreadcrumb } from "@/path-breadcrumb/src/path-breadcrumb";
import { UploadProgress } from "@/upload-progress/src/upload-progress";
import { cn } from "@/lib/utils";
import { DriveDetailPanel, DriveGridView, DriveListView } from "@/drive-core/src/drive-browser";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import type { ActionBarAction } from "@/action-bar/src/action-bar";
import type { useDriveController } from "@/drive-core/src/use-drive-controller";

type DriveController = ReturnType<typeof useDriveController>;

export type DriveMainPaneProps = {
  controller: DriveController;
  operations?: DriveAPIOperations;
  openFile?: (file: DriveFile) => void;
  offlinePendingSyncIds?: ReadonlySet<string>;
  extraFileActions?: (file: DriveFile) => ActionBarAction[];
};

export function DriveMainPane({
  controller,
  operations,
  openFile: openFileOverride,
  offlinePendingSyncIds,
  extraFileActions,
}: DriveMainPaneProps) {
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
    uploadProgress,
    folderListingPending,
    listLoading,
  } = controller;

  const showFolderListingBusy =
    view.type === "folder" && !searchQuery.trim() && (folderListingPending || listLoading);

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

  const searchActive = Boolean(searchQuery.trim());

  const browserProps = {
    items: visibleItems,
    imagePreviewUrls,
    selectedIds,
    starred,
    labels,
    searchActive,
    inTrash: inTrashView,
    selectionMode,
    isTouch,
    isItemDragging,
    itemDragHandlers,
    folderDropZoneProps,
    onSelect: handleSelect,
    onOpen: openFileOverride ?? openFile,
    onLongPress: enterSelectionFor,
    onStar: toggleStar,
    onDownload: handleDownload,
    onRename: requestRenameItem,
    onMove: requestMoveItem,
    onTrash: requestDeleteItem,
    offlinePendingSyncIds,
    extraFileActions,
  };

  const dropTargetLabel =
    view.type === "folder"
      ? view.path.split("/").pop() || labels.sidebarMyDrive
      : labels.sidebarMyDrive;

  const showMobileDetail = Boolean(detailOpen && active);
  const [mobileOverlayMount, setMobileOverlayMount] = useState(false);
  const [mobileOverlayVisible, setMobileOverlayVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setMobileOverlayMount(false);
      setMobileOverlayVisible(false);
      return;
    }
    if (!showMobileDetail) {
      setMobileOverlayVisible(false);
      return;
    }
    setMobileOverlayMount(true);
    let innerFrame: number | undefined;
    const outerFrame = requestAnimationFrame(() => {
      innerFrame = requestAnimationFrame(() => setMobileOverlayVisible(true));
    });
    return () => {
      cancelAnimationFrame(outerFrame);
      if (innerFrame !== undefined) cancelAnimationFrame(innerFrame);
    };
  }, [showMobileDetail, active]);

  const handleMobileOverlayTransitionEnd = (event: TransitionEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.propertyName !== "transform") return;
    if (!mobileOverlayVisible) {
      setMobileOverlayMount(false);
    }
  };

  return (
    <section
      className={cn(
        "drive-main-pane",
        mobileOverlayVisible && "drive-main-pane--mobile-detail-open",
      )}
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

      {mobileOverlayMount && active ? (
        <div
          className={cn(
            "drive-detail-overlay",
            mobileOverlayVisible ? "translate-x-0" : "translate-x-full",
          )}
          onTransitionEnd={handleMobileOverlayTransitionEnd}
        >
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
