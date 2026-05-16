/**
 * Class name fragments for views rendered under `.mail-workspace`.
 * Paired with `mail-workspace.css` (descendant selectors on that root).
 */
export const mailWorkspacePaneClasses = {
  detailView: "mail-detail-view",
  detailTitle: "mail-detail-view__title",
  composeView: "mail-compose-view",
  composeTitle: "mail-compose-view__title",
  composeFields: "mail-compose-view__fields",
  composeField: "mail-compose-field",
  composeFieldLabel: "mail-compose-field__label",
  composeBody: "mail-compose-view__body",
  composeActions: "mail-compose-view__actions",
  composeDialog: "mail-compose-dialog",
  composeDialogScroll: "mail-compose-dialog__scroll",
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
