import type { Mail } from "@/types/mail";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type {
  MailboxSummary,
  MailMailboxLoader,
  MailAPIOperations,
} from "@/mail-core/src/mail-types";
import type { MailUILabels } from "@/mail-core/src/mail-app.stories.fixtures";
import { useMailList } from "@/mail-core/src/use-mail-list";
import { useMailMutations } from "@/mail-core/src/use-mail-mutations";
import { useMailShell } from "@/mail-core/src/use-mail-shell";

type UseMailUIControllerArgs = {
  messages: Mail[];
  mailboxes: MailboxSummary[];
  session: WorkspaceSession;
  labels?: Partial<MailUILabels>;
  listLoading: boolean;
  systemMailboxes: readonly string[];
  encodeFolderToken: (label: string) => string;
  mailboxLoader?: MailMailboxLoader;
  operations?: MailAPIOperations;
  initialActiveId?: string;
};

/**
 * Mail workspace controller: composes shell navigation, list/selection, and mutation slices.
 * See useMailShell, useMailList, and useMailMutations for domain-specific state.
 */
export function useMailController({
  messages,
  mailboxes,
  session,
  labels,
  listLoading,
  systemMailboxes,
  encodeFolderToken,
  mailboxLoader,
  operations,
  initialActiveId = "",
}: UseMailUIControllerArgs) {
  const shell = useMailShell({
    messages,
    mailboxes,
    session,
    labels,
    listLoading,
    systemMailboxes,
    encodeFolderToken,
    mailboxLoader,
    operations,
    initialActiveId,
  });
  const list = useMailList({ shell, initialActiveId });
  const mutations = useMailMutations({ shell, list });

  return {
    L: shell.L,
    allSystemMailboxes: shell.allSystemMailboxes,
    secondarySystemMailboxes: shell.secondarySystemMailboxes,
    moreMailboxes: shell.moreMailboxes,
    mail: shell.mail,
    active: list.active,
    activeId: list.activeId,
    starred: list.starred,
    view: shell.view,
    viewLabel: shell.viewLabel,
    moveDialog: mutations.moveDialog,
    moveMailboxOptions: mutations.moveMailboxOptions,
    moveDialogCurrentMailbox: mutations.moveDialogCurrentMailbox,
    searchQuery: shell.searchQuery,
    searchInputRef: shell.searchInputRef,
    listEndRef: shell.listEndRef,
    workspaceLayoutRef: shell.workspaceLayoutRef,
    confirmDialog: mutations.confirmDialog,
    consumeParentDismissSuppression: mutations.consumeParentDismissSuppression,
    isTouch: list.isTouch,
    inTrash: shell.inTrash,
    isItemDragging: list.isItemDragging,
    itemDragHandlers: list.itemDragHandlers,
    sidebarDropZoneProps: list.sidebarDropZoneProps,
    selectedIds: list.selectedIds,
    selectionMode: list.selectionMode,
    handleSelect: list.handleSelect,
    handleMailItemDoubleClick: mutations.handleMailItemDoubleClick,
    enterSelectionFor: list.enterSelectionFor,
    setMoveDialog: mutations.setMoveDialog,
    setSearchQuery: shell.setSearchQuery,
    effectiveListLoading: shell.effectiveListLoading,
    visibleMail: list.visibleMail,
    isLoadingMore: shell.isLoadingMore,
    selectionBar: mutations.selectionBar,
    selectionBarButtons: mutations.selectionBarButtons,
    mailboxView: shell.mailboxView,
    selectView: shell.selectView,
    compose: mutations.compose,
    reply: mutations.reply,
    replyAll: mutations.replyAll,
    forward: mutations.forward,
    openDraftInComposer: mutations.openDraftInComposer,
    composeDialogId: mutations.composeDialogId,
    closeComposeDialog: mutations.closeComposeDialog,
    requestCloseComposeDialog: mutations.requestCloseComposeDialog,
    composeDrafts: mutations.composeDrafts,
    updateComposeDraft: mutations.updateComposeDraft,
    saveComposeDraft: mutations.saveComposeDraft,
    sendComposeDraft: mutations.sendComposeDraft,
    discardComposeDraft: mutations.discardComposeDraft,
    requestDiscardComposeDraft: mutations.requestDiscardComposeDraft,
    toggleStar: mutations.toggleStar,
    moveOne: mutations.moveOne,
    toggleArchiveForMessage: mutations.toggleArchiveForMessage,
    toggleTrashForMessage: mutations.toggleTrashForMessage,
    moveToMailbox: mutations.moveToMailbox,
    markRead: mutations.markRead,
    markUnread: mutations.markUnread,
    sidebarUnreadBadge: shell.sidebarUnreadBadge,
    show: mutations.show,
    downloadAttachment: mutations.downloadAttachment,
  };
}

export type MailControllerState = ReturnType<typeof useMailController>;
