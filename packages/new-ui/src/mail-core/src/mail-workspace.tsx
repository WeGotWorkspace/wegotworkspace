import { Pencil } from "lucide-react";
import "react-swipeable-list/dist/styles.css";
import "@/mail-core/src/mail-ui.css";
import { MoveToDialog } from "@/dialogs/src/dialogs";
import { AppButton } from "@/app-button/src/app-button";
import { WorkspaceAppSwitcher } from "@/workspace-app-switcher/src/workspace-app-switcher";
import { AppSidebar } from "@/app-sidebar/src/app-sidebar";
import { SidebarSection } from "@/sidebar-section/src/sidebar-section";
import { WorkspaceApp } from "@/workspace-app/src/workspace-app";
import { WorkspaceUserFooter } from "@/workspace-shell/src/workspace-app-layout";
import { workspaceUserInitials } from "@/lib/workspace/workspace-session";
import { MailDetailView } from "@/mail-core/src/mail-detail-view";
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
  logoutTo = "/",
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
    toggleStar,
    moveOne,
    toggleArchiveForMessage,
    toggleTrashForMessage,
    moveToMailbox,
    markRead,
    markUnread,
    sidebarUnreadBadge,
    show,
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

  return (
    <>
      <WorkspaceApp
        ref={workspaceLayoutRef}
        workspaceRoot={{
          className: "mail-ui-theme",
        }}
        sidebar={(c) => (
          <AppSidebar
            open={c.sidebarOpen}
            onCloseMobile={c.closeSidebar}
            appSwitcher={<WorkspaceAppSwitcher />}
          >
            <div className="px-4 mb-4">
              <AppButton
                label="Compose"
                icon={<Pencil className="size-4" />}
                onClick={() => {
                  compose();
                  closeSidebarOnMobile(c.closeSidebar);
                }}
                size="pill"
                variant="primary"
              />
            </div>

            <nav className="flex-1 px-4 space-y-7 overflow-y-auto">
              <SidebarSection items={primarySidebarItems} />
              <SidebarSection title={L.sectionMailboxes} items={systemSidebarItems} />
              {moreMailboxes.length > 0 ? (
                <SidebarSection title={L.sectionMore} items={moreSidebarItems} />
              ) : null}
            </nav>

            <WorkspaceUserFooter
              name={session.user.displayName}
              initials={workspaceUserInitials(session.user)}
              detailLine={session.user.username}
              onLogoutClick={() => {
                if (logoutTo) window.location.assign(logoutTo);
              }}
              linkHoverClassName="hover:bg-[color-mix(in_oklab,var(--color-ink)_18%,transparent)] hover:text-[var(--color-ink)]"
            />
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
              show={show}
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
