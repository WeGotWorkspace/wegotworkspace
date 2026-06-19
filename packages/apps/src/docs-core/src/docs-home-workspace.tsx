import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { TooltipProvider } from "@/ui/tooltip";
import { Button } from "@/button/src/button";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials, type WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { ViewMode } from "@/view-mode-toggle/src/view-mode-toggle";
import { cn } from "@/lib/utils";
import { mergeDocsLabels, type DocsUILabels } from "@/docs-core/src/docs-labels";
import { DocsHomePane } from "@/docs-core/src/docs-home-pane";
import { useDocsHomeList, type DocsHomeFetcher } from "@/docs-core/src/use-docs-home-list";
import {
  buildDocsHomeDrives,
  collectGroupRoots,
  mergeGroupRoots,
  resolveNewDocumentName,
} from "@/docs-core/src/docs-home-drives";
import { useDocsHomeSidebarModel } from "@/docs-core/src/use-docs-home-sidebar-model";
import { useDocsHomeActions } from "@/docs-core/src/use-docs-home-actions";
import { DocsHomeModals } from "@/docs-core/src/docs-home-modals";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import type { DriveFile } from "@/drive-core/src/drive-models";
import "@/docs-core/src/docs-workspace.css";
import "@/docs-core/src/docs-home-workspace.css";

export type DocsHomeWorkspaceProps = {
  session: WorkspaceSession;
  /** Injectable browse fetcher (mock in Storybook/Vitest). */
  fetcher?: DocsHomeFetcher;
  /** Live drive operations powering row actions (star/download/rename/move/trash). */
  operations?: DriveAPIOperations;
  /** Called with the drive API path when a row is opened (route navigation lives in `*App`). */
  onOpenFile?: (apiPath: string) => void;
  /**
   * Called with the new document's drive API path when "New document" is clicked.
   * The `*App` layer owns creating the file and navigating to the Docs editor.
   */
  onCreateDocument?: (apiPath: string) => void;
  onLogout?: () => void;
  labels?: Partial<DocsUILabels>;
  className?: string;
};

export function DocsHomeWorkspace({
  session,
  fetcher,
  operations,
  onOpenFile,
  onCreateDocument,
  onLogout,
  labels: labelOverrides,
  className,
}: DocsHomeWorkspaceProps) {
  const labels = mergeDocsLabels(labelOverrides);
  const username = session.user.username ?? "";

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const [selectedDrivePrefix, setSelectedDrivePrefix] = useState<string | null>(null);
  const [knownGroupRoots, setKnownGroupRoots] = useState<string[]>([]);

  const { files, loading, loadingMore, hasMore, error, loadMore, reload } = useDocsHomeList({
    username,
    query,
    pathPrefix: selectedDrivePrefix ?? undefined,
    fetcher,
  });

  const actions = useDocsHomeActions({
    operations,
    files,
    username,
    groupRoots: knownGroupRoots,
    reload,
  });

  useEffect(() => {
    const discovered = collectGroupRoots(files);
    if (discovered.length === 0) return;
    setKnownGroupRoots((prev) => mergeGroupRoots(prev, discovered));
  }, [files]);

  const drives = useMemo(
    () => buildDocsHomeDrives(username, knownGroupRoots, labels.homeMyDrive),
    [username, knownGroupRoots, labels.homeMyDrive],
  );

  const selectDrive = useCallback((pathPrefix: string | null) => {
    setSelectedDrivePrefix(pathPrefix);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  }, []);

  const { primaryItems, driveItems } = useDocsHomeSidebarModel({
    labels,
    drives,
    selectedDrivePrefix,
    selectDrive,
  });

  const handleOpenFile = useCallback(
    (file: DriveFile) => {
      if (file.apiPath) onOpenFile?.(file.apiPath);
    },
    [onOpenFile],
  );

  const handleCreateDocument = useCallback(() => {
    const handle = username.trim();
    if (!handle || !onCreateDocument) return;
    const userRoot = `/users/${handle}`;
    void (async () => {
      const name = await resolveNewDocumentName(operations, userRoot, files);
      onCreateDocument(`${userRoot}/${name}`);
    })();
  }, [files, onCreateDocument, operations, username]);

  return (
    <TooltipProvider delayDuration={200}>
      <WorkspaceAppLayout
        className={cn("docs-workspace docs-home-workspace", className)}
        sidebar={
          <AppSidebar
            open={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
            appSwitchSubtitle="Docs"
            primaryButton={
              onCreateDocument ? (
                <Button
                  label={labels.homeNewDocument}
                  icon={<Plus />}
                  size="lg"
                  pill
                  variant="primary"
                  className="w-full"
                  onClick={handleCreateDocument}
                />
              ) : undefined
            }
            footer={
              <WorkspaceUserFooter
                name={session.user.displayName}
                initials={workspaceUserInitials(session.user)}
                detailLine={session.user.username}
                onLogoutClick={onLogout}
              />
            }
          >
            <SidebarSection items={primaryItems} />
            {driveItems.length > 0 ? (
              <SidebarSection title={labels.homeDrivesSection} items={driveItems} />
            ) : null}
          </AppSidebar>
        }
        main={
          <DocsHomePane
            labels={labels}
            files={files}
            loading={loading}
            loadingMore={loadingMore}
            hasMore={hasMore}
            error={error}
            query={query}
            onQueryChange={setQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            onLoadMore={loadMore}
            onOpenFile={handleOpenFile}
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen((open) => !open)}
            starred={actions.starred}
            onStar={actions.onStar}
            onDownload={actions.onDownload}
            onRename={actions.onRename}
            onMove={actions.onMove}
            onTrash={actions.onTrash}
          />
        }
      />
      <DocsHomeModals
        actions={actions}
        labels={labels}
        files={files}
        username={username}
        groupRoots={knownGroupRoots}
        operations={operations}
      />
    </TooltipProvider>
  );
}
