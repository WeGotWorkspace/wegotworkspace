/**
 * Class name fragments for views rendered under `.mail-workspace`.
 * Paired with `mail-workspace.css` (descendant selectors on that root).
 */
export const mailWorkspacePaneClasses = {
  detailView: "mail-detail-view",
  detailTitle: "mail-detail-view__title",
  detailSenderRow: "mail-detail-view__sender-row",
  detailPlainBody: "mail-detail-view__body",
  detailBodyFrame: "mail-detail-view__body-frame",
  composeView: "mail-compose-view",
  composeHeader: "mail-compose-view__header",
  composeBody: "mail-compose-view__body",
  composeFields: "mail-compose-view__fields",
  composeField: "mail-compose-view__field",
  composeToRow: "mail-compose-view__to-row",
  composeToInput: "mail-compose-view__to-input",
  composeMessageShell: "mail-compose-view__message-shell",
  composeMessageField: "mail-compose-view__message-field",
  composeMessageInput: "mail-compose-view__message-input",
  composeMessageEditor: "mail-compose-view__message-editor",
  composeAttachmentsSection: "mail-compose-view__attachments",
  composeAttachmentsInput: "mail-compose-view__attachments-input",
  composeAttachmentsList: "mail-compose-view__attachments-list",
  composeFooter: "mail-compose-dialog__footer",
  composeFooterStart: "mail-compose-dialog__footer-start",
  composeFooterEnd: "mail-compose-dialog__footer-end",
  composeDialog: "mail-compose-dialog",
  composeDialogSurface: "mail-compose-dialog-surface",
  attachments: "mail-attachments",
  attachmentsLabel: "mail-attachments__label",
  attachmentsGrid: "mail-attachments__grid",
} as const;

export const mailDetailTagColors = {
  primary: {
    color: "var(--mail-detail-tag-primary-fg)",
    backgroundColor: "var(--mail-detail-tag-primary-bg)",
  },
  muted: {
    backgroundColor: "var(--mail-detail-tag-muted-bg)",
    color: "var(--mail-detail-tag-muted-fg)",
  },
} as const;
