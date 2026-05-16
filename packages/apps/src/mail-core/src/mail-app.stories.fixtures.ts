import { workspaceDestructiveDialogLabels } from "@/lib/workspace/destructive-dialog";

/**
 * Mock copy + label bundle for Mail stories and dev route wiring.
 * Treat as the stand-in for strings you'd later load from an API or i18n.
 */

export type MailUILabels = {
  compose: string;
  searchPlaceholder: string;
  sidebarInbox: string;
  sidebarStarred: string;
  sectionMailboxes: string;
  sectionMore: string;
  listLoading: string;
  listSelected: (count: number) => string;
  listMessages: (count: number) => string;
  emptyList: string;
  emptyTrash: string;
  fallbackViewTitle: string;
  noSubject: string;
  detailToViewer: (viewerLabel: string) => string;
  draftFromLabel: string;
  toastNewMessage: string;
  selectionStar: string;
  selectionMarkUnread: string;
  selectionArchive: string;
  selectionMoveToMailbox: string;
  selectionDeletePermanently: string;
  selectionDone: string;
  swipeStar: string;
  swipeUnstar: string;
  swipeArchive: string;
  swipeUnarchive: string;
  toolbarReply: string;
  toolbarReplyAll: string;
  toolbarForward: string;
  toolbarMoveToMailbox: string;
  toolbarMarkUnread: string;
  toolbarStar: string;
  toolbarArchive: string;
  toolbarRestore: string;
  dialogCancel: string;
  dialogDelete: string;
  dialogEmptyTrashTitle: string;
  dialogDeleteMessagesTitle: (count: number) => string;
  dialogEmptyTrashDescription: (count: number) => string;
  dialogDeleteSelectedDescription: string;
  dialogDeleteConfirmSuffix: string;
  dialogPermanentDeleteLeadIn: string;
  composeCloseTitle: string;
  composeCloseDescription: string;
  composeKeepEditing: string;
  composeCloseConfirm: string;
  composeDiscardTitle: string;
  composeDiscardDescription: string;
  composeDeleteDraft: string;
  composeAttachFiles: string;
  composeAttachmentsLabel: string;
  composeRemoveAttachment: string;
};

export const mailStoryLabels: MailUILabels = {
  compose: "Compose",
  searchPlaceholder: "Search mail...",
  sidebarInbox: "Inbox",
  sidebarStarred: "Starred",
  sectionMailboxes: "Mailboxes",
  sectionMore: "More",
  listLoading: "Loading messages…",
  listSelected: (count) => `${count} Selected`,
  listMessages: (count) => `${count} Messages`,
  emptyList: "No messages",
  emptyTrash: "Empty trash",
  fallbackViewTitle: "Mail",
  noSubject: "(no subject)",
  detailToViewer: (viewerLabel) => ` → ${viewerLabel}`,
  draftFromLabel: "You",
  toastNewMessage: "New message",
  selectionStar: "Star",
  selectionMarkUnread: "Mark as unread",
  selectionArchive: "Archive",
  selectionMoveToMailbox: "Move to mailbox",
  selectionDeletePermanently: "Delete permanently",
  selectionDone: "Done",
  swipeStar: "Star",
  swipeUnstar: "Unstar",
  swipeArchive: "Archive",
  swipeUnarchive: "Unarchive",
  toolbarReply: "Reply",
  toolbarReplyAll: "Reply all",
  toolbarForward: "Forward",
  toolbarMoveToMailbox: "Move to mailbox",
  toolbarMarkUnread: "Mark as unread",
  toolbarStar: "Star",
  toolbarArchive: "Archive",
  toolbarRestore: "Restore",
  dialogCancel: workspaceDestructiveDialogLabels.dialogCancel,
  dialogDelete: workspaceDestructiveDialogLabels.dialogDelete,
  dialogEmptyTrashTitle: "Empty trash?",
  dialogDeleteMessagesTitle: (count) => `Delete ${count} message${count === 1 ? "" : "s"}?`,
  dialogEmptyTrashDescription: (count) => `all ${count} message${count === 1 ? "" : "s"} in trash`,
  dialogDeleteSelectedDescription: "the selected messages",
  dialogDeleteConfirmSuffix: workspaceDestructiveDialogLabels.dialogDeleteConfirmSuffix,
  dialogPermanentDeleteLeadIn: workspaceDestructiveDialogLabels.dialogPermanentDeleteLeadIn,
  composeCloseTitle: "Close composer?",
  composeCloseDescription:
    "Your draft stays in the list. You can reopen it from Drafts and keep editing.",
  composeKeepEditing: "Keep editing",
  composeCloseConfirm: "Close",
  composeDiscardTitle: "Delete draft?",
  composeDiscardDescription:
    "This removes the draft from your list permanently. This cannot be undone.",
  composeDeleteDraft: "Delete draft",
  composeAttachFiles: "Attach files",
  composeAttachmentsLabel: "Attachments",
  composeRemoveAttachment: "Remove attachment",
};

export function mergeMailLabels(overrides?: Partial<MailUILabels>): MailUILabels {
  if (!overrides) return mailStoryLabels;
  return { ...mailStoryLabels, ...overrides };
}
