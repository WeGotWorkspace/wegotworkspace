import { toast } from "sonner";
import {
  Upload,
  Cloud,
  ChevronRight,
  FolderPlus,
  Plus,
  FileText,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { TooltipProvider } from "@/ui/tooltip";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials, type WorkspaceSession } from "@/lib/workspace/workspace-session";
import { ViewHeader } from "@/view-header/src/view-header";
import { cn } from "@/lib/utils";
import { DriveDetailPanel, DriveGridView, DriveListView } from "@/drive-core/src/drive-browser";
import { DriveViewHeaderActions } from "@/drive-core/src/drive-view-header-actions";
import { DriveViewModeToggle } from "@/drive-core/src/drive-view-mode-toggle";
import { useDriveController } from "@/drive-core/src/use-drive-controller";
import { useDriveSidebarModel } from "@/drive-core/src/use-drive-sidebar-model";
import type { DriveWorkspaceProps } from "@/drive-core/src/drive-workspace-props";
import { DriveWorkspaceModals } from "@/drive-core/src/drive-workspace-modals";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import "@/drive-core/src/drive-workspace.css";

export function DriveWorkspace({
  data,
  session,
  operations,
  listLoading = false,
  onLogout,
  className,
}: DriveWorkspaceProps) {
  const controller = useDriveController({ data, session, operations, listLoading });
  const { primarySidebarItems, groupSidebarItems } = useDriveSidebarModel({
    labels: controller.labels,
    view: controller.view,
    sidebarGroupPaths: controller.sidebarGroupPaths,
    selectView: controller.selectView,
    sidebarDropZoneProps: controller.sidebarDropZoneProps,
    moveToFolder: controller.moveToFolder,
  });

  return (
    <TooltipProvider delayDuration={300}>
      <WorkspaceAppLayout
        className={cn("drive-workspace", className)}
        sidebar={
          <DriveSidebar
            controller={controller}
            session={session}
            onLogout={onLogout}
            primarySidebarItems={primarySidebarItems}
            groupSidebarItems={groupSidebarItems}
          />
        }
        mainHeader={
          <DriveMainHeader controller={controller} operations={operations} />
        }
        main={<DriveMain controller={controller} operations={operations} />}
      />
      <DriveWorkspaceModals controller={controller} />
      <input
        ref={controller.fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          controller.handleUpload(e.target.files);
          e.target.value = "";
        }}
      />
    </TooltipProvider>
  );
}

type DriveController = ReturnType<typeof useDriveController>;

function DriveSidebar({
  controller,
  session,
  onLogout,
  primarySidebarItems,
  groupSidebarItems,
}: {
  controller: DriveController;
  session: WorkspaceSession;
  onLogout?: () => void;
  primarySidebarItems: ReturnType<typeof useDriveSidebarModel>["primarySidebarItems"];
  groupSidebarItems: ReturnType<typeof useDriveSidebarModel>["groupSidebarItems"];
}) {
  const { labels, sidebarOpen, setSidebarOpen, createFolder, createBlank, fileInputRef } =
    controller;

  return (
    <AppSidebar
      open={sidebarOpen}
      onCloseMobile={() => setSidebarOpen(false)}
      footer={
        <WorkspaceUserFooter
          name={session.user.displayName}
          initials={workspaceUserInitials(session.user)}
          detailLine={session.user.username}
          onLogoutClick={onLogout}
          linkHoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)]"
        />
      }
      primaryButton={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className="drive-new-button">
              <Plus className="size-4" /> {labels.newButton}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" sideOffset={8} className="min-w-[14rem]">
            <DropdownMenuItem onClick={createFolder} className="cursor-pointer gap-2.5 py-2">
              <FolderPlus className="size-4 opacity-70" />
              <span>{labels.newFolder}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer gap-2.5 py-2"
            >
              <Upload className="size-4 opacity-70" />
              <span>{labels.uploadFiles}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => createBlank("doc")}
              className="cursor-pointer gap-2.5 py-2"
            >
              <FileText className="size-4 opacity-70" />
              <span>{labels.newDocument}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => createBlank("sheet")}
              className="cursor-pointer gap-2.5 py-2"
            >
              <FileSpreadsheet className="size-4 opacity-70" />
              <span>{labels.newSpreadsheet}</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => createBlank("slides")}
              className="cursor-pointer gap-2.5 py-2"
            >
              <Presentation className="size-4 opacity-70" />
              <span>{labels.newPresentation}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <SidebarSection items={primarySidebarItems} />
      {groupSidebarItems.length > 0 ? (
        <SidebarSection title={labels.sidebarGroups} items={groupSidebarItems} />
      ) : null}
    </AppSidebar>
  );
}

function DriveMainHeader({
  controller,
  operations,
}: {
  controller: DriveController;
  operations?: DriveAPIOperations;
}) {
  void operations;
  const {
    labels,
    sidebarOpen,
    setSidebarOpen,
    viewLabel,
    selectionMode,
    selectedIds,
    visibleItems,
    viewMode,
    setViewMode,
    detailOpen,
    setDetailOpen,
    inTrashView,
    setConfirmDelete,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    uploadProgress,
  } = controller;

  return (
    <>
      <header className="drive-main-header">
        <ViewHeader
          sidebarOpen={sidebarOpen}
          onToggleSidebar={() => setSidebarOpen((v) => !v)}
          title={viewLabel}
          subtitle={
            selectionMode || selectedIds.length > 1
              ? `${selectedIds.length} Selected`
              : `${visibleItems.length} Items`
          }
          actions={
            <div className="drive-header-actions">
              <DriveViewModeToggle
                labels={labels}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
              <DriveViewHeaderActions
                labels={labels}
                detailOpen={detailOpen}
                onToggleDetail={() => setDetailOpen((v) => !v)}
                inTrashView={inTrashView}
                hasVisibleItems={visibleItems.length > 0}
                onEmptyTrash={() =>
                  setConfirmDelete({
                    ids: visibleItems.map((f) => f.id),
                    permanent: true,
                  })
                }
              />
            </div>
          }
          searchPlaceholder={labels.searchPlaceholder}
          searchValue={searchQuery}
          onSearchInput={setSearchQuery}
          searchInputRef={searchInputRef}
        />
      </header>
      {uploadProgress ? (
        <div className="drive-upload-progress">
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="drive-upload-progress__label">{uploadProgress.label}</span>
            <span className="drive-upload-progress__percent">{uploadProgress.percent}%</span>
          </div>
          <div className="drive-upload-progress__track">
            <div
              className={cn(
                "drive-upload-progress__fill",
                uploadProgress.done
                  ? "drive-upload-progress__fill--done"
                  : "drive-upload-progress__fill--active",
              )}
              style={{ width: `${uploadProgress.percent}%` }}
            />
          </div>
          <p className="drive-upload-progress__detail">{uploadProgress.detail}</p>
        </div>
      ) : null}
    </>
  );
}

function DriveMain({
  controller,
  operations,
}: {
  controller: DriveController;
  operations?: DriveAPIOperations;
}) {
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
        <div className="drive-drop-overlay">
          <div className="drive-drop-overlay__card">
            {labels.dropUploadHint}{" "}
            {view.type === "folder" ? view.path.split("/").pop() || labels.sidebarMyDrive : labels.sidebarMyDrive}
          </div>
        </div>
      ) : null}

      <nav className="drive-breadcrumbs" aria-label="Breadcrumb">
        {breadcrumbs.map((b, i) => {
          const isLast = i === breadcrumbs.length - 1;
          return (
            <span key={i} className="flex items-center gap-1 shrink-0">
              {i > 0 ? <ChevronRight className="drive-breadcrumb-separator" /> : null}
              {isLast || !b.path ? (
                <span className="drive-breadcrumb-current">{b.label}</span>
              ) : (
                <button
                  type="button"
                  onClick={() => selectView({ type: "folder", path: b.path! })}
                  className="drive-breadcrumb-link"
                >
                  {b.label}
                </button>
              )}
            </span>
          );
        })}
      </nav>

      <div className="flex-1 flex min-h-0">
        <div className="flex-1 overflow-y-auto min-w-0">
          {visibleItems.length === 0 ? (
            <div className="drive-empty-state">
              <Cloud className="drive-empty-state__icon" />
              {labels.emptyFolder}
            </div>
          ) : viewMode === "grid" ? (
            <DriveGridView {...browserProps} />
          ) : (
            <DriveListView {...browserProps} activeId={activeId} inTrash={inTrashView} />
          )}
        </div>

        {detailOpen && active ? (
          <aside className="drive-detail-aside">
            <DriveDetailPanel
              labels={labels}
              file={active}
              previewSrc={imagePreviewUrls[active.id]}
              isStarred={!!starred[active.id]}
              onClose={() => setDetailOpen(false)}
              onDownload={() => {
                if (operations && active.apiPath && active.kind !== "folder") {
                  void operations.downloadFile(active.apiPath).catch((error: unknown) => {
                    const message = error instanceof Error ? error.message : String(error);
                    toast.error(message);
                  });
                }
              }}
              onStar={() => toggleStar(active.id)}
              onShare={() => void controller.copyShareLink(active)}
              onDelete={() =>
                isUnderTrash(active.parent)
                  ? setConfirmDelete({ ids: [active.id], permanent: true })
                  : setConfirmDelete({ ids: [active.id], permanent: false })
              }
            />
          </aside>
        ) : null}
      </div>

      {detailOpen && active ? (
        <div className="drive-detail-overlay">
          <DriveDetailPanel
            labels={labels}
            file={active}
            previewSrc={imagePreviewUrls[active.id]}
            isStarred={!!starred[active.id]}
            onClose={() => setDetailOpen(false)}
            onDownload={() => {
              if (operations && active.apiPath && active.kind !== "folder") {
                void operations.downloadFile(active.apiPath).catch((error: unknown) => {
                  const message = error instanceof Error ? error.message : String(error);
                  toast.error(message);
                });
              }
            }}
            onStar={() => toggleStar(active.id)}
            onShare={() => void controller.copyShareLink(active)}
            onDelete={() =>
              isUnderTrash(active.parent)
                ? setConfirmDelete({ ids: [active.id], permanent: true })
                : setConfirmDelete({ ids: [active.id], permanent: false })
            }
            mobile
          />
        </div>
      ) : null}

      {selectionBar}
    </section>
  );
}
