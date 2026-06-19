import { useCallback, useState } from "react";
import { TooltipProvider } from "@/ui/tooltip";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
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
import type { DriveFile } from "@/drive-core/src/drive-models";
import "@/docs-core/src/docs-workspace.css";
import "@/docs-core/src/docs-home-workspace.css";

export type DocsHomeWorkspaceProps = {
  session: WorkspaceSession;
  /** Injectable browse fetcher (mock in Storybook/Vitest). */
  fetcher?: DocsHomeFetcher;
  /** Called with the drive API path when a row is opened (route navigation lives in `*App`). */
  onOpenFile?: (apiPath: string) => void;
  onLogout?: () => void;
  labels?: Partial<DocsUILabels>;
  className?: string;
};

export function DocsHomeWorkspace({
  session,
  fetcher,
  onOpenFile,
  onLogout,
  labels: labelOverrides,
  className,
}: DocsHomeWorkspaceProps) {
  const labels = mergeDocsLabels(labelOverrides);
  const username = session.user.username ?? "";

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");

  const { files, loading, loadingMore, hasMore, error, loadMore } = useDocsHomeList({
    username,
    query,
    fetcher,
  });

  const handleOpenFile = useCallback(
    (file: DriveFile) => {
      if (file.apiPath) onOpenFile?.(file.apiPath);
    },
    [onOpenFile],
  );

  return (
    <TooltipProvider delayDuration={200}>
      <WorkspaceAppLayout
        className={cn("docs-workspace docs-home-workspace", className)}
        sidebar={
          <AppSidebar
            open={sidebarOpen}
            onCloseMobile={() => setSidebarOpen(false)}
            appSwitchSubtitle="Docs"
            footer={
              <WorkspaceUserFooter
                name={session.user.displayName}
                initials={workspaceUserInitials(session.user)}
                detailLine={session.user.username}
                onLogoutClick={onLogout}
              />
            }
          >
            <></>
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
          />
        }
      />
    </TooltipProvider>
  );
}
