import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Code2, Printer } from "lucide-react";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { IconButton } from "@/button/src/button";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { docsEditorFormatFromFileName } from "@/docs-core/src/docs-editor-format";
import { DocsOutlineSidebar } from "@/docs-core/src/docs-outline-sidebar";
import { Tag } from "@/tag/src/tag";
import { focusOutlineHeading, parseMarkdownOutline } from "@/docs-core/src/docs-outline";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { cn } from "@/lib/utils";
import { useConnectivity } from "@/hooks/use-connectivity";
import { TooltipProvider } from "@/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";
import { ViewHeader } from "@/view-header/src/view-header";
import { getTextEditorContent } from "@/text-editor-core/src/text-editor-content";
import { TEXT_EDITOR_FORMAT_BAR_FULL } from "@/text-editor-core/src/text-editor-format-bar-config";
import { printTextEditorSheet } from "@/text-editor-core/src/text-editor-print";
import { DocsCollabEditor } from "./docs-collab-editor";
import { DocsCollabPresence } from "./docs-collab-presence";
import type { DocsCollabWireOperations } from "./docs-collab-wire";
import { useDocsCollab } from "./use-docs-collab";
import type { DocsCollabUrls } from "./use-docs-collab";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";

import "@/docs-core/src/docs-workspace.css";

const USERNAME_PROMPT = "Your display name";

export type DocsCollabWorkspaceProps = {
  /** When set (e.g. tests), skips the on-load `window.prompt`. */
  userName?: string;
  /** Optional document title shown in the header (defaults to together.md). */
  documentTitle?: string;
  /** Optional transport/doc endpoints for step-by-step backend migration testing. */
  urls?: DocsCollabUrls;
  /** Auth + RTC fetch for live API; defaults to offline mesh. */
  wire?: DocsCollabWireOperations;
};

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function promptForUserName(): string | null {
  const input = window.prompt(USERNAME_PROMPT);
  if (input === null) return null;
  const trimmed = input.trim();
  return trimmed || null;
}

function defaultTitleFromRoom(room: string | undefined): string {
  const normalized = room?.trim().replace(/\/+$/, "");
  if (!normalized) return "document.md";
  const slash = normalized.lastIndexOf("/");
  const name = slash >= 0 ? normalized.slice(slash + 1) : normalized;
  return name || "document.md";
}

export function DocsCollabWorkspace({
  userName: userNameProp,
  documentTitle,
  urls,
  wire,
}: DocsCollabWorkspaceProps = {}) {
  const [userName, setUserName] = useState<string | null>(() => userNameProp?.trim() || null);
  const [promptDismissed, setPromptDismissed] = useState(false);

  useLayoutEffect(() => {
    if (userNameProp?.trim()) {
      setUserName(userNameProp.trim());
      return;
    }
    if (userName !== null || promptDismissed) return;
    const name = promptForUserName();
    setPromptDismissed(true);
    if (name) setUserName(name);
  }, [userNameProp, userName, promptDismissed]);

  if (!userName) {
    return (
      <div className="docs-workspace flex min-h-screen items-center justify-center">
        <p className="docs-workspace__loading px-6 text-center">
          {promptDismissed ? "A display name is required to join." : "Loading…"}
        </p>
      </div>
    );
  }

  return (
    <DocsCollabWorkspaceInner
      userName={userName}
      documentTitle={documentTitle}
      urls={urls}
      wire={wire}
    />
  );
}

function DocsCollabWorkspaceInner({
  userName,
  documentTitle,
  urls,
  wire,
}: {
  userName: string;
  documentTitle?: string;
  urls?: DocsCollabUrls;
  wire?: DocsCollabWireOperations;
}) {
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
    peers,
    connectingPeers,
    warningPeers,
    docStatus,
    pendingSync,
    failedSync,
    onMarkdownChange,
    registerMarkdownGetter,
  } = useDocsCollab({
    userName,
    autoJoin: true,
    urls,
    wire,
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewSource, setViewSource] = useState(false);
  const [sourceClosedDialogOpen, setSourceClosedDialogOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [activeOutlineIndex, setActiveOutlineIndex] = useState<number | null>(null);
  const resolvedDocumentTitle = documentTitle?.trim() || defaultTitleFromRoom(urls?.room);
  const editorFormat = docsEditorFormatFromFileName(resolvedDocumentTitle);
  const showMarkdownOutline = resolvedDocumentTitle.toLowerCase().endsWith(".md");
  const { online } = useConnectivity();
  const showPendingSyncIndicator = pendingSync && (!online || failedSync);
  const pendingSyncLabel = failedSync ? labels.pendingSyncFailed : labels.pendingSync;

  const outline = useMemo(
    () => (showMarkdownOutline ? parseMarkdownOutline(markdown) : []),
    [markdown, showMarkdownOutline],
  );

  const handleMarkdownChange = useCallback(
    (getContent: () => string) => {
      onMarkdownChange(getContent);
      setMarkdown(getContent());
    },
    [onMarkdownChange],
  );

  useEffect(() => {
    if (!editor) return;

    const updateFromEditor = () => {
      setMarkdown(getTextEditorContent(editor, editorFormat));
    };

    updateFromEditor();
    editor.on("transaction", updateFromEditor);
    return () => {
      editor.off("transaction", updateFromEditor);
    };
  }, [editor, editorFormat]);

  const handleEditorReady = useCallback(
    (nextEditor: Editor | null) => {
      setEditor(nextEditor);
      if (nextEditor) {
        const getContent = () => getTextEditorContent(nextEditor, editorFormat);
        setMarkdown(getContent());
        registerMarkdownGetter(getContent);
      }
    },
    [editorFormat, registerMarkdownGetter],
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
  const sourceLockedByCollab = Boolean(collabSession) && peers.length > 0;

  useEffect(() => {
    if (!sourceLockedByCollab || !viewSource) return;
    setViewSource(false);
    setSourceClosedDialogOpen(true);
  }, [sourceLockedByCollab, viewSource]);

  return (
    <TooltipProvider delayDuration={200}>
      <>
        <WorkspaceAppLayout
          className={cn("docs-workspace", "min-h-screen")}
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
              {showMarkdownOutline ? (
                <DocsOutlineSidebar
                  labels={labels}
                  items={outline}
                  activeIndex={activeOutlineIndex}
                  onSelect={handleOutlineSelect}
                />
              ) : null}
            </AppSidebar>
          }
          mainHeader={
            <ViewHeader
              title={resolvedDocumentTitle}
              titleSize="sm"
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((open) => !open)}
              actions={
                <div className="docs-workspace__header-actions">
                  {docStatus ? (
                    <span className="docs-workspace__doc-status" role="status" aria-live="polite">
                      {docStatus}
                    </span>
                  ) : null}
                  {showPendingSyncIndicator ? (
                    <span
                      className="docs-workspace__pending-sync"
                      role="status"
                      aria-live="polite"
                      aria-label={pendingSyncLabel}
                    >
                      <LoadingSpinner size="sm" />
                    </span>
                  ) : null}
                  {collabSession ? (
                    <DocsCollabPresence
                      localUser={{
                        displayName: session.user.displayName,
                      }}
                      peers={peers}
                      connectingPeers={connectingPeers}
                      warningPeers={warningPeers}
                      className="mr-1"
                    />
                  ) : null}
                  <IconButton
                    label={
                      sourceLockedByCollab
                        ? "Source view is disabled while collaborating"
                        : viewSource
                          ? labels.hideSource
                          : labels.viewSource
                    }
                    icon={<Code2 />}
                    size="sm"
                    variant="subtle"
                    active={viewSource}
                    aria-pressed={viewSource}
                    disabled={!editor || sourceLockedByCollab}
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
                <DocsCollabEditor
                  ydoc={collabSession.ydoc}
                  awareness={collabSession.awareness}
                  user={collabSession.user}
                  format={editorFormat}
                  sheetFill
                  pagination
                  viewSource={viewSource}
                  formatBar={
                    editorFormat === "text"
                      ? false
                      : { groups: TEXT_EDITOR_FORMAT_BAR_FULL, showPrint: false }
                  }
                  onContentChange={handleMarkdownChange}
                  onEditorReady={handleEditorReady}
                />
              ) : null}
              <footer className="docs-workspace__stats-footer" aria-live="polite">
                <Tag
                  label={labels.statsWords(wordCount)}
                  colors={{
                    backgroundColor: "var(--docs-stat-tag-bg)",
                    color: "var(--docs-stat-tag-color)",
                  }}
                />
                <Tag
                  label={labels.statsCharacters(characterCount)}
                  colors={{
                    backgroundColor: "var(--docs-stat-tag-bg)",
                    color: "var(--docs-stat-tag-color)",
                  }}
                />
              </footer>
            </div>
          }
        />
        <AlertDialog open={sourceClosedDialogOpen} onOpenChange={setSourceClosedDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Source view closed</AlertDialogTitle>
              <AlertDialogDescription>
                Another collaborator connected to this document, so source view was turned off.
                Source view is only available when you are the only editor in the room.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogAction onClick={() => setSourceClosedDialogOpen(false)}>
                Got it
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </>
    </TooltipProvider>
  );
}
