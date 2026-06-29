import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Code2, ListChecks, MessageSquare, Printer } from "lucide-react";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { IconButton } from "@/button/src/button";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { docsEditorFormatFromFileName } from "@/docs-core/src/docs-editor-format";
import { DocsOutlineSidebar } from "@/docs-core/src/docs-outline-sidebar";
import { DocsPageSizeSelect } from "@/docs-core/src/docs-page-size-select";
import {
  DEFAULT_TEXT_EDITOR_PAGE_FORMAT,
  type TextEditorPageFormat,
} from "@/text-editor-core/src/text-editor-pagination";
import { Tag } from "@/tag/src/tag";
import { focusOutlineHeading, parseMarkdownOutline } from "@/docs-core/src/docs-outline";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { cn } from "@/lib/utils";
import { useConnectivity } from "@/hooks/use-connectivity";
import {
  resolveDocsCommentsLayoutMode,
  shouldApplyCommentsSheetCompact,
  shouldAutoOpenCommentsForDraft,
  shouldAutoOpenCommentsForThreads,
  shouldDefaultCommentsOpen,
  useDocsCommentsLayout,
} from "./use-docs-comments-layout";
import { SideDrawer } from "@/ui/side-drawer";
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
import {
  editorHasTrackChanges,
  getAcceptedTextEditorContent,
} from "@/text-editor-core/src/text-editor-track-changes";
import { TEXT_EDITOR_FORMAT_BAR_FULL } from "@/text-editor-core/src/text-editor-format-bar-config";
import { printTextEditorSheet } from "@/text-editor-core/src/text-editor-print";
import { DocsCollabEditor } from "./docs-collab-editor";
import { DocsCollabPresence } from "./docs-collab-presence";
import { DocsCommentsFloatingLayer } from "./docs-comments/docs-comments-floating-layer";
import { DocsCommentsPanel } from "./docs-comments/docs-comments-panel";
import { DocsSuggestionsFloatingLayer } from "./docs-suggestions/docs-suggestions-floating-layer";
import { DocsSuggestionsPanel } from "./docs-suggestions/docs-suggestions-panel";
import type { DocsCollabWireOperations } from "./docs-collab-wire";
import { useDocsComments } from "./use-docs-comments";
import { useDocsSuggestions } from "./use-docs-suggestions";
import { useDocsCollab } from "./use-docs-collab";
import type { DocsCollabUrls } from "./use-docs-collab";
import {
  WorkspaceAppLayout,
  WorkspaceUserFooter,
} from "@/workspace-shell/src/workspace-app-layout";

import "@/docs-core/src/docs-workspace.css";
import "@/text-editor-core/docs-collab/docs-comments-sidebar.css";
import "@/text-editor-core/docs-collab/docs-suggestions-sidebar.css";

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
  const [commentsOpen, setCommentsOpen] = useState(() =>
    typeof window === "undefined"
      ? false
      : shouldDefaultCommentsOpen(resolveDocsCommentsLayoutMode(window.innerWidth)),
  );
  const [suggestionsOpen, setSuggestionsOpen] = useState(() =>
    typeof window === "undefined"
      ? false
      : shouldDefaultCommentsOpen(resolveDocsCommentsLayoutMode(window.innerWidth)),
  );
  const [pageFormat, setPageFormat] = useState<TextEditorPageFormat>(
    DEFAULT_TEXT_EDITOR_PAGE_FORMAT,
  );
  const [viewSource, setViewSource] = useState(false);
  const [sourceClosedDialogOpen, setSourceClosedDialogOpen] = useState(false);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [markdown, setMarkdown] = useState("");
  const [activeOutlineIndex, setActiveOutlineIndex] = useState<number | null>(null);
  const resolvedDocumentTitle = documentTitle?.trim() || defaultTitleFromRoom(urls?.room);
  const editorFormat = docsEditorFormatFromFileName(resolvedDocumentTitle);
  const showMarkdownOutline = resolvedDocumentTitle.toLowerCase().endsWith(".md");
  const { online } = useConnectivity();
  const commentsLayout = useDocsCommentsLayout();
  const useCommentsDrawer = commentsLayout === "drawer";
  const composeSuppressedRef = useRef(false);
  const [draftComposeVisible, setDraftComposeVisible] = useState(false);
  const showPendingSyncIndicator = pendingSync && (!online || failedSync);
  const pendingSyncLabel = failedSync ? labels.pendingSyncFailed : labels.pendingSync;

  const comments = useDocsComments({
    ydoc: collabSession?.ydoc ?? null,
    editor,
    currentUser: {
      id: session.user.username,
      name: session.user.displayName,
    },
    commentsVisible: commentsOpen || draftComposeVisible,
  });

  const {
    draftThread,
    canAddComment,
    selectionQualifiesForComment,
    openThreads,
    activeThreadId,
    createThreadFromSelection,
    cancelDraft,
    clearActiveThread,
    activateThreadFromMark,
    selectThread,
    addReply,
    toggleReaction,
    resolveThread,
    deleteThread,
  } = comments;

  const {
    suggestions,
    activeChangeId,
    selectSuggestion,
    clearActiveSuggestion,
    activateSuggestionFromMark,
    acceptSuggestion,
    rejectSuggestion,
    acceptAll,
    rejectAll,
  } = useDocsSuggestions(editor);

  useEffect(() => {
    if (draftThread) {
      setDraftComposeVisible(true);
      return;
    }
    if (!commentsOpen) {
      setDraftComposeVisible(false);
    }
  }, [commentsOpen, draftThread]);

  useEffect(() => {
    if (viewSource || !collabSession || draftThread || commentsOpen) return;
    if (!selectionQualifiesForComment || composeSuppressedRef.current) return;
    setDraftComposeVisible(true);
  }, [collabSession, commentsOpen, draftThread, selectionQualifiesForComment, viewSource]);

  useEffect(() => {
    if (viewSource || !collabSession || draftThread) return;

    if (commentsOpen) {
      if (!canAddComment) return;
      createThreadFromSelection();
      return;
    }

    if (!draftComposeVisible || !selectionQualifiesForComment || composeSuppressedRef.current) {
      return;
    }
    createThreadFromSelection();
  }, [
    canAddComment,
    collabSession,
    commentsOpen,
    createThreadFromSelection,
    draftComposeVisible,
    draftThread,
    selectionQualifiesForComment,
    viewSource,
  ]);

  useEffect(() => {
    if (viewSource) return;
    if (shouldAutoOpenCommentsForDraft(draftThread)) {
      setCommentsOpen(true);
      return;
    }
    if (!shouldAutoOpenCommentsForThreads(commentsLayout)) return;
    if (openThreads.length > 0) {
      setCommentsOpen(true);
    }
  }, [commentsLayout, draftThread, openThreads.length, viewSource]);

  useEffect(() => {
    if (viewSource) return;
    if (!shouldAutoOpenCommentsForThreads(commentsLayout)) return;
    if (suggestions.length > 0) {
      setSuggestionsOpen(true);
    }
  }, [commentsLayout, suggestions.length, viewSource]);

  const handleCommentsClose = useCallback(() => {
    composeSuppressedRef.current = true;
    setDraftComposeVisible(false);
    cancelDraft();
    clearActiveThread();
    setCommentsOpen(false);
  }, [cancelDraft, clearActiveThread]);

  useEffect(() => {
    if (!viewSource) return;
    if (commentsOpen || draftThread) {
      handleCommentsClose();
    }
  }, [commentsOpen, draftThread, handleCommentsClose, viewSource]);

  const handleCommentActivated = useCallback(
    (commentId: string, clickPos: number) => {
      if (viewSource) return;
      composeSuppressedRef.current = false;
      setCommentsOpen(true);
      activateThreadFromMark(commentId, clickPos);
    },
    [activateThreadFromMark, viewSource],
  );

  const handleToggleComments = useCallback(() => {
    if (viewSource) return;
    if (commentsOpen) {
      handleCommentsClose();
      return;
    }
    composeSuppressedRef.current = false;
    setCommentsOpen(true);
  }, [commentsOpen, handleCommentsClose, viewSource]);

  const handleSuggestionsClose = useCallback(() => {
    clearActiveSuggestion();
    setSuggestionsOpen(false);
  }, [clearActiveSuggestion]);

  const handleToggleSuggestions = useCallback(() => {
    if (viewSource) return;
    if (suggestionsOpen) {
      handleSuggestionsClose();
      return;
    }
    setSuggestionsOpen(true);
  }, [handleSuggestionsClose, suggestionsOpen, viewSource]);

  const handleSuggestionActivated = useCallback(
    (changeId: string) => {
      if (viewSource) return;
      setSuggestionsOpen(true);
      activateSuggestionFromMark(changeId);
    },
    [activateSuggestionFromMark, viewSource],
  );

  const trackChangesReady = Boolean(editor && editorHasTrackChanges(editor));

  const commentsOverlay = useMemo(
    () =>
      collabSession && !useCommentsDrawer ? (
        <DocsCommentsFloatingLayer
          editor={editor}
          visible={commentsOpen || draftThread != null}
          labels={labels}
          threads={openThreads}
          draftThread={draftThread}
          currentUserId={session.user.username}
          activeThreadId={activeThreadId}
          onSelectThread={selectThread}
          onAddReply={addReply}
          onToggleReaction={toggleReaction}
          onResolveThread={resolveThread}
          onDeleteThread={deleteThread}
          onCancelDraft={cancelDraft}
        />
      ) : null,
    [
      activeThreadId,
      addReply,
      cancelDraft,
      collabSession,
      deleteThread,
      draftThread,
      editor,
      useCommentsDrawer,
      labels,
      openThreads,
      resolveThread,
      selectThread,
      session.user.username,
      toggleReaction,
      commentsOpen,
    ],
  );

  const commentsMobileDrawer = useMemo(
    () =>
      collabSession && useCommentsDrawer ? (
        <SideDrawer
          open={commentsOpen}
          onClose={handleCommentsClose}
          title={labels.commentsSidebarTitle}
          className="docs-comments-panel-drawer"
          contentClassName="docs-comments-panel-drawer__body"
        >
          <DocsCommentsPanel
            onCloseMobile={handleCommentsClose}
            labels={labels}
            threads={openThreads}
            draftThread={draftThread}
            currentUserId={session.user.username}
            activeThreadId={activeThreadId}
            onSelectThread={selectThread}
            onAddReply={addReply}
            onToggleReaction={toggleReaction}
            onResolveThread={resolveThread}
            onDeleteThread={deleteThread}
            onCancelDraft={cancelDraft}
          />
        </SideDrawer>
      ) : null,
    [
      activeThreadId,
      addReply,
      cancelDraft,
      collabSession,
      commentsOpen,
      deleteThread,
      draftThread,
      useCommentsDrawer,
      labels,
      openThreads,
      resolveThread,
      selectThread,
      session.user.username,
      toggleReaction,
    ],
  );

  const suggestionsOverlay = useMemo(
    () =>
      collabSession && !useCommentsDrawer ? (
        <DocsSuggestionsFloatingLayer
          editor={editor}
          visible={suggestionsOpen}
          labels={labels}
          suggestions={suggestions}
          activeChangeId={activeChangeId}
          onSelectSuggestion={selectSuggestion}
          onAcceptSuggestion={acceptSuggestion}
          onRejectSuggestion={rejectSuggestion}
        />
      ) : null,
    [
      acceptSuggestion,
      activeChangeId,
      collabSession,
      editor,
      labels,
      rejectSuggestion,
      selectSuggestion,
      suggestions,
      suggestionsOpen,
      useCommentsDrawer,
    ],
  );

  const suggestionsMobileDrawer = useMemo(
    () =>
      collabSession && useCommentsDrawer ? (
        <SideDrawer
          open={suggestionsOpen}
          onClose={handleSuggestionsClose}
          title={labels.suggestionsSidebarTitle}
          className="docs-suggestions-panel-drawer"
          contentClassName="docs-suggestions-panel-drawer__body"
        >
          <DocsSuggestionsPanel
            onCloseMobile={handleSuggestionsClose}
            labels={labels}
            suggestions={suggestions}
            activeChangeId={activeChangeId}
            onSelectSuggestion={selectSuggestion}
            onAcceptSuggestion={acceptSuggestion}
            onRejectSuggestion={rejectSuggestion}
            onAcceptAll={acceptAll}
            onRejectAll={rejectAll}
          />
        </SideDrawer>
      ) : null,
    [
      acceptAll,
      acceptSuggestion,
      activeChangeId,
      collabSession,
      handleSuggestionsClose,
      labels,
      rejectAll,
      rejectSuggestion,
      selectSuggestion,
      suggestions,
      suggestionsOpen,
      useCommentsDrawer,
    ],
  );

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
      setMarkdown(getAcceptedTextEditorContent(editor, editorFormat));
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
        const getContent = () => getAcceptedTextEditorContent(nextEditor, editorFormat);
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
          className={cn(
            "docs-workspace",
            "min-h-screen",
            (shouldApplyCommentsSheetCompact(commentsLayout, commentsOpen) ||
              shouldApplyCommentsSheetCompact(commentsLayout, suggestionsOpen)) &&
              "docs-workspace--comments-sheet-compact",
          )}
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
                        : commentsOpen
                          ? "Source view is disabled while comments are open"
                          : viewSource
                            ? labels.hideSource
                            : labels.viewSource
                    }
                    icon={<Code2 />}
                    size="sm"
                    variant="subtle"
                    active={viewSource}
                    aria-pressed={viewSource}
                    disabled={!editor || sourceLockedByCollab || commentsOpen}
                    className={cn(viewSource && "docs-workspace__source-toggle--active")}
                    onClick={() => setViewSource((on) => !on)}
                  />
                  <IconButton
                    label={labels.print}
                    icon={<Printer />}
                    size="sm"
                    variant="subtle"
                    disabled={!editor}
                    onClick={() => printTextEditorSheet(editor, pageFormat)}
                  />
                  {trackChangesReady && !viewSource ? (
                    <IconButton
                      label={
                        suggestionsOpen
                          ? labels.suggestionsToggleHide
                          : suggestions.length > 0
                            ? `${labels.suggestionsToggleShow} (${suggestions.length} pending)`
                            : labels.suggestionsToggleShow
                      }
                      icon={<ListChecks />}
                      size="sm"
                      variant="subtle"
                      active={suggestionsOpen}
                      aria-pressed={suggestionsOpen}
                      className="docs-workspace__suggestions-toggle"
                      data-count={suggestions.length > 0 ? suggestions.length : undefined}
                      onClick={handleToggleSuggestions}
                    />
                  ) : null}
                  <IconButton
                    label={
                      viewSource
                        ? "Comments are disabled in source view"
                        : commentsOpen
                          ? labels.commentsToggleHide
                          : openThreads.length > 0
                            ? `${labels.commentsToggleShow} (${openThreads.length} open)`
                            : labels.commentsToggleShow
                    }
                    icon={<MessageSquare />}
                    size="sm"
                    variant="subtle"
                    active={commentsOpen}
                    aria-pressed={commentsOpen}
                    disabled={viewSource}
                    className="docs-workspace__comments-toggle"
                    data-count={openThreads.length > 0 ? openThreads.length : undefined}
                    onClick={handleToggleComments}
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
                  pageFormat={pageFormat}
                  viewSource={viewSource}
                  formatBar={
                    editorFormat === "text"
                      ? false
                      : { groups: TEXT_EDITOR_FORMAT_BAR_FULL, showPrint: false }
                  }
                  onContentChange={handleMarkdownChange}
                  onEditorReady={handleEditorReady}
                  onCommentActivated={handleCommentActivated}
                  onSuggestionActivated={handleSuggestionActivated}
                  commentsOverlay={commentsOverlay}
                  suggestionsOverlay={suggestionsOverlay}
                />
              ) : null}
              <footer className="docs-workspace__stats-footer" aria-live="polite">
                <div className="docs-workspace__stats-footer-group">
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
                </div>
                {collabSession ? (
                  <div className="docs-workspace__stats-footer-group docs-workspace__stats-footer-group--end">
                    <DocsPageSizeSelect
                      value={pageFormat}
                      onValueChange={setPageFormat}
                      label={labels.pageSizeLabel}
                    />
                  </div>
                ) : null}
              </footer>
            </div>
          }
        />
        {commentsMobileDrawer}
        {suggestionsMobileDrawer}
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
