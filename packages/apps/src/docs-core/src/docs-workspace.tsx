import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Code2, Pencil, Printer } from "lucide-react";
import { TooltipProvider } from "@/ui/tooltip";
import { IconButton } from "@/button/src/button";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials, type WorkspaceSession } from "@/lib/workspace/workspace-session";
import { ViewHeader } from "@/view-header/src/view-header";
import { printTextEditorSheet } from "@/text-editor-core/src/text-editor-print";
import { cn } from "@/lib/utils";
import { DocsMainPane } from "@/docs-core/src/docs-main-pane";
import { DocsOutlineSidebar } from "@/docs-core/src/docs-outline-sidebar";
import { DocsWorkspaceModals } from "@/docs-core/src/docs-workspace-modals";
import { focusOutlineHeading, parseMarkdownOutline } from "@/docs-core/src/docs-outline";
import { useDocsController } from "@/docs-core/src/use-docs-controller";
import type { DocsWorkspaceProps } from "@/docs-core/src/docs-workspace-props";
import "@/docs-core/src/docs-workspace.css";

type DocsController = ReturnType<typeof useDocsController>;

export function DocsWorkspace({
  data,
  session,
  operations,
  filePath = null,
  labels,
  onLogout,
  onFileRenamed,
  className,
}: DocsWorkspaceProps) {
  const controller = useDocsController({
    filePath,
    labels,
    operations,
    initialDocument: data.document,
    onFileRenamed,
  });

  const fileKey = filePath ?? data.document?.apiPath ?? "mock";

  return (
    <TooltipProvider delayDuration={200}>
      <DocsWorkspaceShell
        className={className}
        controller={controller}
        fileKey={fileKey}
        session={session}
        onLogout={onLogout}
      />
      <DocsWorkspaceModals controller={controller} />
    </TooltipProvider>
  );
}

function DocsWorkspaceShell({
  className,
  controller,
  fileKey,
  session,
  onLogout,
}: {
  className?: string;
  controller: DocsController;
  fileKey: string;
  session: WorkspaceSession;
  onLogout?: () => void;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [viewSource, setViewSource] = useState(false);
  const [activeOutlineIndex, setActiveOutlineIndex] = useState<number | null>(null);

  useEffect(() => {
    setViewSource(false);
  }, [fileKey]);

  const outline = useMemo(() => parseMarkdownOutline(controller.content), [controller.content]);

  const handleOutlineSelect = useCallback(
    (index: number) => {
      setActiveOutlineIndex(index);
      if (editor) focusOutlineHeading(editor, index);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        controller.setSidebarOpen(false);
      }
    },
    [controller, editor],
  );

  return (
    <WorkspaceAppLayout
      className={cn("docs-workspace", className)}
      sidebar={
        <DocsSidebar
          controller={controller}
          session={session}
          outline={outline}
          activeOutlineIndex={activeOutlineIndex}
          onOutlineSelect={handleOutlineSelect}
          onLogout={onLogout}
        />
      }
      mainHeader={
        <>
          <DocsMainHeader
            controller={controller}
            editor={editor}
            viewSource={viewSource}
            onToggleViewSource={() => setViewSource((on) => !on)}
          />
        </>
      }
      main={
        <DocsMainPane
          controller={controller}
          fileKey={fileKey}
          viewSource={viewSource}
          onEditorReady={setEditor}
        />
      }
    />
  );
}

function DocsSidebar({
  controller,
  session,
  outline,
  activeOutlineIndex,
  onOutlineSelect,
  onLogout,
}: {
  controller: DocsController;
  session: WorkspaceSession;
  outline: ReturnType<typeof parseMarkdownOutline>;
  activeOutlineIndex: number | null;
  onOutlineSelect: (index: number) => void;
  onLogout?: () => void;
}) {
  return (
    <AppSidebar
      open={controller.sidebarOpen}
      onCloseMobile={() => controller.setSidebarOpen(false)}
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
      <DocsOutlineSidebar
        labels={controller.labels}
        items={outline}
        activeIndex={activeOutlineIndex}
        onSelect={onOutlineSelect}
      />
    </AppSidebar>
  );
}

function DocsMainHeader({
  controller,
  editor,
  viewSource,
  onToggleViewSource,
}: {
  controller: DocsController;
  editor: Editor | null;
  viewSource: boolean;
  onToggleViewSource: () => void;
}) {
  const title = controller.title || controller.labels.emptyTitle;

  return (
    <ViewHeader
      title={title}
      sidebarOpen={controller.sidebarOpen}
      onToggleSidebar={() => controller.setSidebarOpen((open) => !open)}
      actions={
        controller.hasFile ? (
          <div className="docs-workspace__header-actions">
            <IconButton
              label={viewSource ? controller.labels.hideSource : controller.labels.viewSource}
              icon={<Code2 />}
              size="sm"
              variant="subtle"
              active={viewSource}
              aria-pressed={viewSource}
              disabled={!editor}
              className={viewSource ? "docs-workspace__source-toggle--active" : undefined}
              onClick={onToggleViewSource}
            />
            <IconButton
              label={controller.labels.print}
              icon={<Printer />}
              size="sm"
              variant="subtle"
              disabled={!editor}
              onClick={() => printTextEditorSheet(editor)}
            />
            <IconButton
              label={controller.labels.rename}
              icon={<Pencil />}
              size="sm"
              variant="subtle"
              disabled={!controller.canRename}
              onClick={controller.openRenameDialog}
            />
          </div>
        ) : null
      }
    />
  );
}
