import type { MailAPIOperations } from "./mail-types";

/**
 * Safe no-op operations for stories/dev shells without a backend.
 */
export const NOOP_MAIL_API_OPERATIONS: MailAPIOperations = {
  patchMessage: async () => {},
  moveMessages: async () => {},
  deleteMessages: async () => {},
  createDraft: async () => {},
  saveDraft: async () => {},
  sendMessage: async () => {},
  fetchMessageDetail: async () => null,
  downloadAttachment: async () => new Blob(),
};
