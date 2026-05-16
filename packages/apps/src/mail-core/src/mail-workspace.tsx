import { Pencil } from "lucide-react";
import "react-swipeable-list/dist/styles.css";
import { cn } from "@/lib/utils";
import "@/mail-core/src/mail-workspace.css";
import { mailWorkspacePaneClasses } from "@/mail-core/src/mail-workspace.styles";
import { MoveToDialog } from "@/dialogs/src/dialogs";
import { Button } from "@/button/src/button";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { WorkspaceApp } from "@/workspace-app/src/workspace-app";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { MailDetailView } from "@/mail-core/src/mail-detail-view";
import { MailComposeView } from "@/mail-core/src/mail-compose-view";
import { Dialog, DialogContent } from "@/ui/dialog";
import { MultiSelectionView } from "@/multi-selection-view/src/multi-selection-view";
import { formatMailDateForDetail } from "@/mail-core/src/mail-date-utils";
import { MailDetailActionBar } from "@/mail-core/src/mail-detail-action-bar";
import { MailListPanel } from "@/mail-core/src/mail-list-panel";
import { useMailSidebarModel } from "@/mail-core/src/use-mail-sidebar-model";
import { useMailController } from "@/mail-core/src/use-mail-controller";
import type { MailWorkspaceProps } from "@/mail-core/src/mail-workspace-props";
import type { Mail } from "@/types/mail";

const DEFAULT_SYSTEM_MAILBOXES = [
  "Inbox",
  "Starred",
  "Sent",
  "Drafts",
  "Spam",
  "Archive",
  "Trash",
] as const;

function defaultEncodeFolderToken(label: string): string {
  const bytes = new TextEncoder().encode(label);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]!);
  return btoa(binary);
}

export function MailWorkspace({
  messages,
  mailboxes,
  session,
  labels,
  listLoading = false,
  systemMailboxes = DEFAULT_SYSTEM_MAILBOXES,
  encodeFolderToken = defaultEncodeFolderToken,
  mailboxLoader,
  operations,
  onLogout,
  className,
}: MailWorkspaceProps) {
  const closeSidebarOnMobile = (closeSidebar: () => void) => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    closeSidebar();
  };

  const {
    L,
    allSystemMailboxes,
    secondarySystemMailboxes,
    moreMailboxes,
    mail,
    active,
    activeId,
    starred,
    view,
    viewLabel,
    moveDialog,
    searchQuery,
    searchInputRef,
    listEndRef,
    workspaceLayoutRef,
    confirmDialog,
    isTouch,
    inTrash,
    isItemDragging,
    itemDragHandlers,
    sidebarDropZoneProps,
    selectedIds,
    selectionMode,
    handleSelect,
    handleMailItemDoubleClick,
    enterSelectionFor,
    setMoveDialog,
    setSearchQuery,
    effectiveListLoading,
    visibleMail,
    isLoadingMore,
    selectionBar,
    selectionBarButtons,
    mailboxView,
    selectView,
    compose,
    reply,
    replyAll,
    forward,
    openDraftInComposer,
    composeDialogId,
    closeComposeDialog,
    composeDrafts,
    updateComposeDraft,
    saveComposeDraft,
    sendComposeDraft,
    discardComposeDraft,
    toggleStar,
    moveOne,
    toggleArchiveForMessage,
    toggleTrashForMessage,
    moveToMailbox,
    markRead,
    markUnread,
    sidebarUnreadBadge,
    downloadAttachment,
  } = useMailController({
    messages,
    mailboxes,
    session,
    labels,
    listLoading,
    systemMailboxes,
    encodeFolderToken,
    mailboxLoader,
    operations,
  });

  const { primarySidebarItems, systemSidebarItems, moreSidebarItems } = useMailSidebarModel({
    labels: L,
    view,
    secondarySystemMailboxes,
    moreMailboxes,
    mailboxView,
    selectView,
    sidebarUnreadBadge,
    sidebarDropZoneProps,
    moveToMailbox,
  });
  const moveNotebookOptions = Array.from(
    new Set(["Inbox", ...allSystemMailboxes, ...moreMailboxes]),
  );
  const resolveNotebookOption = (row: Mail | undefined): string | undefined => {
    if (!row) return undefined;
    const byLabel = moveNotebookOptions.find(
      (option) => option.toLowerCase() === row.mailbox.toLowerCase(),
    );
    if (byLabel) return byLabel;
    const byFolderToken = moveNotebookOptions.find(
      (option) => encodeFolderToken(option) === row.folder,
    );
    return byFolderToken;
  };
  const moveDialogCurrentMailbox = (() => {
    if (!moveDialog || moveDialog.ids.length === 0) return undefined;
    if (view.startsWith("mb:")) {
      const currentViewMailbox = view.slice(3).trim();
      const byView = moveNotebookOptions.find(
        (option) => option.trim().toLowerCase() === currentViewMailbox.toLowerCase(),
      );
      if (byView) return byView;
    }
    if (moveDialog.currentMailbox) {
      const byDialogMailbox = moveNotebookOptions.find(
        (option) => option.trim().toLowerCase() === moveDialog.currentMailbox?.trim().toLowerCase(),
      );
      if (byDialogMailbox) return byDialogMailbox;
    }
    const selectedMailboxes = new Set(
      moveDialog.ids.map((id) => resolveNotebookOption(mail.find((m) => m.id === id))),
    );
    selectedMailboxes.delete(undefined);
    if (selectedMailboxes.size === 1) return Array.from(selectedMailboxes)[0];
    return undefined;
  })();
  const composeTarget = composeDialogId
    ? mail.find((row) => row.id === composeDialogId)
    : undefined;
  const composeTargetDraft =
    composeDialogId && composeTarget ? composeDrafts[composeDialogId] : undefined;

  return (
    <>
      <WorkspaceApp
        ref={workspaceLayoutRef}
        workspaceRoot={{
          className: cn("mail-workspace", className),
        }}
        sidebar={(c) => (
          <AppSidebar
            open={c.sidebarOpen}
            onCloseMobile={c.closeSidebar}
            footer={
              <WorkspaceUserFooter
                name={session.user.displayName}
                initials={workspaceUserInitials(session.user)}
                detailLine={session.user.username}
                onLogoutClick={onLogout}
              />
            }
            primaryButton={
              <Button
                label="Compose"
                icon={<Pencil />}
                onClick={() => {
                  compose();
                  closeSidebarOnMobile(c.closeSidebar);
                }}
                size="lg"
                pill
                variant="primary"
              />
            }
          >
            <SidebarSection items={primarySidebarItems} />
            <SidebarSection title={L.sectionMailboxes} items={systemSidebarItems} />
            {moreMailboxes.length > 0 ? (
              <SidebarSection title={L.sectionMore} items={moreSidebarItems} />
            ) : null}
          </AppSidebar>
        )}
        list={(c) =>
          MailListPanel({
            L,
            sidebarOpen: c.sidebarOpen,
            onToggleSidebar: c.toggleSidebar,
            viewLabel,
            selectedIds,
            selectionMode: selectionMode || selectedIds.length > 1,
            effectiveListLoading,
            visibleMail,
            searchQuery,
            setSearchQuery,
            searchInputRef,
            inTrash,
            isTouch,
            starred,
            activeId,
            isItemDragging,
            handleSelect,
            handleDoubleClick: handleMailItemDoubleClick,
            enterSelectionFor,
            itemDragHandlers,
            toggleStar,
            moveOne,
            listEndRef,
            isLoadingMore,
            selectionBar,
          })
        }
        actionBar={(c) =>
          selectedIds.length > 1 ? null : (
            <MailDetailActionBar
              active={active}
              closeMobileDetail={c.closeMobileDetail}
              onReply={reply}
              onReplyAll={replyAll}
              onForward={forward}
              onEditDraft={() => {
                if (active) openDraftInComposer(active.id);
              }}
              setMoveDialog={setMoveDialog}
              markRead={markRead}
              markUnread={markUnread}
              toggleStar={toggleStar}
              starred={starred}
              toggleArchiveForMessage={toggleArchiveForMessage}
              toggleTrashForMessage={toggleTrashForMessage}
            />
          )
        }
        detail={() => {
          if (selectedIds.length > 1) {
            return (
              <MultiSelectionView
                count={selectedIds.length}
                label="Multiple selection"
                title={(count) => `${count} ${count === 1 ? "message" : "messages"} selected`}
                actions={selectionBarButtons}
              />
            );
          }
          return active ? (
            <MailDetailView
              mailId={active.id}
              mailbox={active.mailbox}
              date={formatMailDateForDetail(active.date)}
              title={active.title}
              emptySubjectLabel={L.noSubject}
              from={active.from}
              senderMetaLine={`${active.email}${L.detailToViewer("me")}`}
              body={active.body}
              excerpt={active.excerpt}
              bodyHtml={active.bodyHtml}
              detailLoaded={active.detailLoaded ?? false}
              attachments={active.attachments}
              onDownloadAttachment={downloadAttachment}
            />
          ) : null;
        }}
      />

      {composeTarget && composeTargetDraft ? (
        <Dialog
          open={!!composeDialogId}
          onOpenChange={(open) => (!open ? closeComposeDialog() : null)}
        >
          <DialogContent className={mailWorkspacePaneClasses.composeDialog}>
            <div className={mailWorkspacePaneClasses.composeDialogScroll}>
              <MailComposeView
                mailId={composeTarget.id}
                mailbox={composeTarget.mailbox}
                date={formatMailDateForDetail(composeTarget.date)}
                to={composeTargetDraft.to}
                cc={composeTargetDraft.cc}
                bcc={composeTargetDraft.bcc}
                subject={composeTargetDraft.subject}
                body={composeTargetDraft.body}
                onToChange={(value) => updateComposeDraft(composeTarget.id, { to: value })}
                onCcChange={(value) => updateComposeDraft(composeTarget.id, { cc: value })}
                onBccChange={(value) => updateComposeDraft(composeTarget.id, { bcc: value })}
                onSubjectChange={(value) =>
                  updateComposeDraft(composeTarget.id, { subject: value })
                }
                onBodyChange={(value) => updateComposeDraft(composeTarget.id, { body: value })}
                onSaveDraft={() => void saveComposeDraft(composeTarget.id)}
                onSend={() => void sendComposeDraft(composeTarget.id)}
                onDiscard={() => void discardComposeDraft(composeTarget.id)}
                saving={composeTargetDraft.saving}
                sending={composeTargetDraft.sending}
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <MoveToDialog
        open={!!moveDialog}
        notebooks={moveNotebookOptions}
        currentNotebook={moveDialogCurrentMailbox}
        onClose={() => setMoveDialog(null)}
        onConfirm={(mailbox) => {
          if (moveDialog) moveToMailbox(moveDialog.ids, mailbox);
          setMoveDialog(null);
        }}
      />

      {confirmDialog}
    </>
  );
}
