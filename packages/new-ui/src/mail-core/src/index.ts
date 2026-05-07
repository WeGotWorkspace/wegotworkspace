export type {
  MailAPIOperations,
  MailUIData,
  MailboxSummary,
  MailMailboxLoader,
} from "./mail-types";
export { NOOP_MAIL_API_OPERATIONS } from "./mail-operations";
export { buildMailActionButtons, type MailActionButtonDescriptor } from "./mail-action-buttons";
export { MailWorkspace } from "./mail-workspace.tsx";
export type { MailWorkspaceProps } from "./mail-workspace-props";
export { useMailController } from "./use-mail-controller.tsx";
export { MailListPanel } from "./mail-list-panel";
export { MailDetailActionBar } from "./mail-detail-action-bar";
export { MailApp } from "./mail-app";
export { useMailAPI } from "./use-mail-api";
export { MailDetailView } from "./mail-detail-view";
export { MailAttachments } from "./mail-attachments";
export { MailMultiSelectionView } from "./mail-multi-selection-view";
export { MultiSelectionView } from "@/multi-selection-view/src/multi-selection-view";
