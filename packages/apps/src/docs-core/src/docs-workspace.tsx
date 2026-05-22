import { TooltipProvider } from "@/ui/tooltip";
import { cn } from "@/lib/utils";
import { TextEditor, TEXT_EDITOR_FORMAT_BAR_FULL } from "@/text-editor-core/src";
import { WorkspaceShellHeader } from "@/workspace-shell/src/workspace-shell-header";
import { useDocsController } from "@/docs-core/src/use-docs-controller";
import type { DocsWorkspaceProps } from "@/docs-core/src/docs-workspace-props";
import "@/docs-core/src/docs-workspace.css";

export function DocsWorkspace({
  data,
  session,
  operations,
  filePath = null,
  labels,
  onLogout,
  className,
}: DocsWorkspaceProps) {
  const controller = useDocsController({
    filePath,
    labels,
    operations,
    initialDocument: data.document,
  });

  return (
    <TooltipProvider delayDuration={200}>
      <div className={cn("docs-workspace", className)}>
        <WorkspaceShellHeader
          session={session}
          displayName={session.user.displayName}
          onLogout={onLogout}
        />

        <main className="docs-workspace__main">
          {controller.title ? (
            <div className="docs-workspace__title-bar">
              <h1 className="docs-workspace__title">{controller.title}</h1>
            </div>
          ) : null}

          {controller.loading ? (
            <p className="docs-workspace__loading">Loading…</p>
          ) : controller.loadError ? (
            <div className="docs-workspace__error">
              <p>{controller.labels.loadError}</p>
            </div>
          ) : !controller.hasFile ? (
            <div className="docs-workspace__empty">
              <p className="docs-workspace__empty-title">{controller.labels.emptyTitle}</p>
              <p className="docs-workspace__empty-description">
                {controller.labels.emptyDescription}
              </p>
            </div>
          ) : (
            <div className="docs-workspace__editor">
              <TextEditor
                key={filePath ?? data.document?.apiPath ?? "mock"}
                format="markdown"
                content={controller.content}
                sheetFill
                formatBar={{ groups: TEXT_EDITOR_FORMAT_BAR_FULL, showPrint: true }}
                onUpdate={({ content }) => controller.onContentChange(content)}
              />
            </div>
          )}
        </main>
      </div>
    </TooltipProvider>
  );
}
