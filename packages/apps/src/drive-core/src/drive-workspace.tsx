import { TooltipProvider } from "@/ui/tooltip";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials, type WorkspaceSession } from "@/lib/workspace/workspace-session";
import { ViewHeader } from "@/view-header/src/view-header";
import { UploadProgress } from "@/upload-progress/src/upload-progress";
import { cn } from "@/lib/utils";
import { DriveMainPane } from "@/drive-core/src/drive-main-pane";
import { DriveNewMenu } from "@/drive-core/src/drive-new-menu";
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
        mainHeader={<DriveMainHeader controller={controller} />}
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
        <DriveNewMenu
          labels={labels}
          onCreateFolder={createFolder}
          onUploadFiles={() => fileInputRef.current?.click()}
          onCreateBlank={createBlank}
        />
      }
    >
      <SidebarSection items={primarySidebarItems} />
      {groupSidebarItems.length > 0 ? (
        <SidebarSection title={labels.sidebarGroups} items={groupSidebarItems} />
      ) : null}
    </AppSidebar>
  );
}

function DriveMainHeader({ controller }: { controller: DriveController }) {
  const {
    sidebarOpen,
    setSidebarOpen,
    viewLabel,
    selectionMode,
    selectedIds,
    visibleItems,
    uploadProgress,
  } = controller;

  return (
    <>
      <ViewHeader
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
        title={viewLabel}
        subtitle={
          selectionMode || selectedIds.length > 1
            ? `${selectedIds.length} Selected`
            : `${visibleItems.length} Items`
        }
      />
      {uploadProgress ? (
        <UploadProgress
          label={uploadProgress.label}
          percent={uploadProgress.percent}
          detail={uploadProgress.detail}
          done={uploadProgress.done}
        />
      ) : null}
    </>
  );
}
