import { useCallback, useEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Code2, Printer } from "lucide-react";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { IconButton } from "@/button/src/button";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { DocsOutlineSidebar } from "@/docs-core/src/docs-outline-sidebar";
import { focusOutlineHeading, parseMarkdownOutline } from "@/docs-core/src/docs-outline";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { cn } from "@/lib/utils";
import { TooltipProvider } from "@/ui/tooltip";
import { ViewHeader } from "@/view-header/src/view-header";
import { TEXT_EDITOR_FORMAT_BAR_FULL } from "@/text-editor-core/src/text-editor-format-bar-config";
import { printTextEditorSheet } from "@/text-editor-core/src/text-editor-print";
import { LaatsteTestCollabEditor } from "@/text-editor-core/laatste-test-collab/laatste-test-collab-editor";
import { LaatsteTestCollabPresence } from "@/text-editor-core/laatste-test-collab/laatste-test-collab-presence";
import { useLaatsteTestCollab } from "@/text-editor-core/laatste-test-collab/use-laatste-test-collab";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";

import "@/docs-core/src/docs-workspace.css";

const DOCUMENT_TITLE = "together.md";

export type LaatsteTestDocsCollabWorkspaceProps = {
  userName: string;
  autoJoin?: boolean;
};

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function LaatsteTestDocsCollabWorkspace({
  userName,
  autoJoin = true,
}: LaatsteTestDocsCollabWorkspaceProps) {
  const labels = docsLabels;
  const session = useMemo(
    () => ({
      ...mockWorkspaceSession,
      user: {
        ...mockWorkspaceSession.user,
        displayName: userName,
        username: userName.toLowerCase().replace(/\s+/g, "."),
      },
    }),
    [userName],
  );

  const {
    session: collabSession,
    joined,
    status,
    docStatus,
    peers,
    linkCount,
    join,
    leave,
    onMarkdownChange,
  } = useLaatsteTestCollab({ userName, autoJoin });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewSource, setViewSource] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [activeOutlineIndex, setActiveOutlineIndex] = useState<number | null>(null);

  const outline = useMemo(() => parseMarkdownOutline(markdown), [markdown]);

  const handleMarkdownChange = useCallback(
    (getMarkdown: () => string) => {
      onMarkdownChange(getMarkdown);
      setMarkdown(getMarkdown());
    },
    [onMarkdownChange],
  );

  const handleOutlineSelect = useCallback(
    (index: number) => {
      setActiveOutlineIndex(index);
      if (editor) focusOutlineHeading(editor, index);
      if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
        setSidebarOpen(false);
      }
    },
    [editor],
  );

  const wordCount = useMemo(() => countWords(markdown), [markdown]);
  const characterCount = markdown.length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-screen flex-col">
        <div className="shrink-0 border-b bg-amber-50 px-4 py-2 text-xs text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
          <strong>Laatste-test collab demo</strong> — open this story twice with different names
          (Alex / Sam). Signaling: <code>laatste-test/signal.php</code> on :8081.{" "}
          <span className="text-amber-900/80 dark:text-amber-200/90">
            {status}
            {docStatus ? ` · ${docStatus}` : ""} · {linkCount} link(s)
          </span>
          {!autoJoin ? (
            <span className="ml-2">
              <button
                type="button"
                className="underline"
                disabled={joined}
                onClick={() => void join()}
              >
                Join
              </button>
              {" · "}
              <button
                type="button"
                className="underline"
                disabled={!joined}
                onClick={() => void leave()}
              >
                Leave
              </button>
            </span>
          ) : null}
        </div>

        <WorkspaceAppLayout
          className={cn("docs-workspace", "min-h-0 flex-1")}
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
                />
              }
            >
              <DocsOutlineSidebar
                labels={labels}
                items={outline}
                activeIndex={activeOutlineIndex}
                onSelect={handleOutlineSelect}
              />
            </AppSidebar>
          }
          mainHeader={
            <ViewHeader
              title={DOCUMENT_TITLE}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((open) => !open)}
              actions={
                <div className="docs-workspace__header-actions">
                  {collabSession ? (
                    <LaatsteTestCollabPresence
                      localUser={collabSession.user}
                      peers={peers}
                      className="mr-1"
                    />
                  ) : null}
                  <IconButton
                    label={viewSource ? labels.hideSource : labels.viewSource}
                    icon={<Code2 />}
                    size="sm"
                    variant="subtle"
                    active={viewSource}
                    aria-pressed={viewSource}
                    disabled={!editor}
                    className={cn(viewSource && "docs-workspace__source-toggle--active")}
                    onClick={() => setViewSource((on) => !on)}
                  />
                  <IconButton
                    label={labels.print}
                    icon={<Printer />}
                    size="sm"
                    variant="subtle"
                    disabled={!editor}
                    onClick={() => printTextEditorSheet(editor)}
                  />
                </div>
              }
            />
          }
          main={
            <div className="docs-workspace__editor">
              {collabSession ? (
                <LaatsteTestCollabEditor
                  ydoc={collabSession.ydoc}
                  awareness={collabSession.awareness}
                  user={collabSession.user}
                  sheetFill
                  viewSource={viewSource}
                  formatBar={{ groups: TEXT_EDITOR_FORMAT_BAR_FULL, showPrint: false }}
                  onMarkdownChange={handleMarkdownChange}
                  onEditorReady={setEditor}
                />
              ) : (
                <p className="docs-workspace__loading p-8">Joining collaboration mesh…</p>
              )}
              <footer className="docs-workspace__stats-footer" aria-live="polite">
                <span className="tag rounded-md px-2 py-1 text-xs font-medium">
                  {labels.statsWords(wordCount)}
                </span>
                <span className="tag rounded-md px-2 py-1 text-xs font-medium">
                  {labels.statsCharacters(characterCount)}
                </span>
              </footer>
            </div>
          }
        />
      </div>
    </TooltipProvider>
  );
}
