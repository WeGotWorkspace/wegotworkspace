/**
 * Class name fragments for views rendered under `.mail-workspace`.
 * Paired with `mail-workspace.css` (descendant selectors on that root).
 */
export const mailWorkspacePaneClasses = {
  detailView: "mail-detail-view",
  detailTitle: "mail-detail-view__title",
  composeView: "mail-compose-view",
  composeHeader: "mail-compose-view__header",
  composeBody: "mail-compose-view__body",
  composeField: "mail-compose-view__field",
  composeToRow: "mail-compose-view__to-row",
  composeToInput: "mail-compose-view__to-input",
  composeMessageField: "mail-compose-view__message-field",
  composeMessageInput: "mail-compose-view__message-input",
  composeFooter: "mail-compose-dialog__footer",
  composeDialog: "mail-compose-dialog",
  composeDialogSurface: "mail-compose-dialog-surface",
  attachments: "mail-attachments",
  attachmentsLabel: "mail-attachments__label",
  attachmentsGrid: "mail-attachments__grid",
  attachmentItem: "mail-attachments__item",
  attachmentIcon: "mail-attachments__icon",
  attachmentName: "mail-attachments__name",
  attachmentMeta: "mail-attachments__meta",
  attachmentDownload: "mail-attachments__download",
  listLoader: "mail-list-panel__loader",
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
