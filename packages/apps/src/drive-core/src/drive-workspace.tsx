import { TooltipProvider } from "@/ui/tooltip";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials, type WorkspaceSession } from "@/lib/workspace/workspace-session";
import { ViewHeader } from "@/view-header/src/view-header";
import { ViewModeToggle } from "@/view-mode-toggle/src/view-mode-toggle";
import { downloadWgwUnifiedSearchRecord, type WgwUnifiedSearchResult } from "@/lib/api/wgw/search";
import { cn } from "@/lib/utils";
import { DriveMainPane } from "@/drive-core/src/drive-main-pane";
import { DriveNewMenu } from "@/drive-core/src/drive-new-menu";
import { UnifiedSearchApiDropdown } from "@/unified-search-dropdown/src/unified-search-api-dropdown";
import type { DriveFile, FileKind } from "@/drive-core/src/drive-models";
import { useDriveController } from "@/drive-core/src/use-drive-controller";
import { useDriveSidebarModel } from "@/drive-core/src/use-drive-sidebar-model";
import type { DriveWorkspaceProps } from "@/drive-core/src/drive-workspace-props";
import { DriveWorkspaceModals } from "@/drive-core/src/drive-workspace-modals";
import "@/drive-core/src/drive-workspace.css";

export function DriveWorkspace({
  data,
  session,
  operations,
  listLoading = false,
  view,
  onViewChange,
  onOpenDocsFile,
  onLogout,
  className,
}: DriveWorkspaceProps) {
  const controller = useDriveController({
    data,
    session,
    operations,
    listLoading,
    view,
    onViewChange,
    onOpenDocsFile,
  });
  const { primarySidebarItems, groupSidebarItems } = useDriveSidebarModel({
    labels: controller.labels,
    view: controller.view,
    sidebarGroupPaths: controller.sidebarGroupPaths,
    selectView: controller.selectView,
    sidebarDropZoneProps: controller.sidebarDropZoneProps,
    commitMoveToFolder: controller.commitMoveToFolder,
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
            onOpenDocsFile={onOpenDocsFile}
            primarySidebarItems={primarySidebarItems}
            groupSidebarItems={groupSidebarItems}
          />
        }
        mainHeader={
          <DriveMainHeader controller={controller} unifiedSearchEnabled={Boolean(operations)} />
        }
        main={<DriveMainPane controller={controller} operations={operations} />}
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
  onOpenDocsFile,
  primarySidebarItems,
  groupSidebarItems,
}: {
  controller: DriveController;
  session: WorkspaceSession;
  onLogout?: () => void;
  onOpenDocsFile?: (apiPath: string) => void;
  primarySidebarItems: ReturnType<typeof useDriveSidebarModel>["primarySidebarItems"];
  groupSidebarItems: ReturnType<typeof useDriveSidebarModel>["groupSidebarItems"];
}) {
  const {
    labels,
    sidebarOpen,
    setSidebarOpen,
    createFolder,
    createMarkdown,
    createFromTemplate,
    newFileTemplates,
    fileInputRef,
  } = controller;

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
        <DriveNewMenu
          labels={labels}
          onCreateFolder={createFolder}
          onUploadFiles={() => fileInputRef.current?.click()}
          onCreateMarkdown={onOpenDocsFile ? createMarkdown : undefined}
          newFileTemplates={newFileTemplates}
          onCreateTemplate={createFromTemplate}
        />
      }
    >
      <SidebarSection items={primarySidebarItems} />
      {groupSidebarItems.length > 0 ? (
        <SidebarSection title={labels.sidebarSharedDrives} items={groupSidebarItems} />
      ) : null}
    </AppSidebar>
  );
}

function DriveMainHeader({
  controller,
  unifiedSearchEnabled,
}: {
  controller: DriveController;
  unifiedSearchEnabled: boolean;
}) {
  const {
    labels,
    sidebarOpen,
    setSidebarOpen,
    viewLabel,
    selectionMode,
    selectedIds,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    searchInputRef,
    selectView,
    openFile,
  } = controller;

  const handleSearchResultSelect = (result: WgwUnifiedSearchResult) => {
    void (async () => {
      try {
        if (result.sourceType === "caldav" || result.sourceType === "carddav") {
          await downloadWgwUnifiedSearchRecord({
            sourceType: result.sourceType,
            sourceKey: result.sourceKey,
          });
          return;
        }

        if (result.sourceType !== "file") return;
        const normalized = normalizeVirtualPathFromSourceKey(result.sourceKey);
        if (!normalized) return;

        if (result.category === "folder") {
          selectView({ type: "folder", path: normalized });
          return;
        }
        openFile(fileFromSearchResult(result, normalized));
      } catch {
        const normalized = normalizeVirtualPathFromSourceKey(result.sourceKey);
        if (!normalized) return;
        selectView({ type: "folder", path: parentVirtualPath(normalized) });
      }
    })();
  };

  return (
    <ViewHeader
      sidebarOpen={sidebarOpen}
      onToggleSidebar={() => setSidebarOpen((v) => !v)}
      title={searchQuery.trim() ? labels.searchViewTitle : viewLabel}
      subtitle={
        selectionMode || selectedIds.length > 1 ? `${selectedIds.length} Selected` : undefined
      }
      searchPlaceholder={labels.searchPlaceholder}
      searchValue={searchQuery}
      onSearchInput={setSearchQuery}
      searchInputRef={searchInputRef}
      searchContent={
        unifiedSearchEnabled ? (
          <UnifiedSearchApiDropdown
            className="drive-main-header__search-dropdown"
            query={searchQuery}
            limit={10}
            onSelect={handleSearchResultSelect}
          />
        ) : null
      }
      actions={
        <ViewModeToggle
          value={viewMode}
          onChange={setViewMode}
          gridLabel={labels.gridView}
          listLabel={labels.listView}
        />
      }
    />
  );
}

function normalizeVirtualPathFromSourceKey(sourceKey: string): string | null {
  const key = sourceKey.trim().replace(/^\/+/, "");
  if (!key) return null;
  return `/${key}`;
}

function parentVirtualPath(path: string): string {
  const normalized = path.trim().replace(/\/+$/, "");
  const idx = normalized.lastIndexOf("/");
  if (idx <= 0) return "/";
  return normalized.slice(0, idx);
}

function apiPathFromSourceKey(sourceKey: string): string | null {
  const key = sourceKey.trim().replace(/^\/+/, "");
  if (!key) return null;
  return `/${key}`;
}

function fileFromSearchResult(result: WgwUnifiedSearchResult, normalizedPath: string): DriveFile {
  const title = result.title || normalizedPath.split("/").pop() || result.sourceKey;
  const parent = parentVirtualPath(normalizedPath);
  const apiPath = apiPathFromSourceKey(result.sourceKey) ?? undefined;
  const kind = fileKindFromCategory(result.category);

  return {
    id: `search:${result.sourceType}:${result.sourceKey}`,
    category: result.category ?? "File",
    date: "",
    title,
    excerpt: result.snippet ?? "",
    body: [],
    notebook: "",
    tags: [],
    wordCount: 0,
    parent,
    kind,
    size: result.size > 0 ? String(result.size) : "—",
    apiPath,
  };
}

function fileKindFromCategory(category?: string | null): FileKind {
  if (category === "folder") return "folder";
  if (category === "image") return "image";
  if (category === "audio") return "audio";
  if (category === "video") return "video";
  if (category === "archive") return "archive";
  if (category === "document" || category === "spreadsheet" || category === "presentation") {
    return "doc";
  }

  return "file";
}
