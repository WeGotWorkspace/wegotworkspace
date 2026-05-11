import { createMailAppBootstrap, type MailAppBootstrap } from "@/lib/api/mock/mail-bootstrap";
import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import {
  deleteMailMessage,
  downloadMailAttachment,
  fetchMailMessageDetail,
  fetchMailLiveBootstrap,
  folderTokenFromMailboxLabel,
  moveMailMessageByTokens,
  patchMailMessage,
  saveMailDraft,
  sendMailMessage,
  WGW_UI_SYSTEM_MAILBOXES,
} from "@/lib/api/wgw/mail";
import type { MailMailboxLoader, MailAPIOperations } from "@/mail-core/src/mail-types";
import type { Mail } from "@/types/mail";

export type MailApiSource = {
  loadBootstrap: () => Promise<MailAppBootstrap>;
  systemMailboxes: readonly string[];
  createOperations: (mailboxLoader?: MailMailboxLoader) => MailAPIOperations | undefined;
};

function createWgwOperations(mailboxLoader?: MailMailboxLoader): MailAPIOperations {
  const resolveFolderToken = (label: string) =>
    mailboxLoader?.folderTokenForLabel?.(label) ?? folderTokenFromMailboxLabel(label);
  const resolveSourceFolderToken = (message: Mail) =>
    mailboxLoader?.folderTokenForLabel?.(message.folder) ??
    mailboxLoader?.folderTokenForLabel?.(message.mailbox) ??
    message.folder;
  const resolveMutationFolderToken = (message: Mail) => {
    if (!message.folder.startsWith("__")) return message.folder;
    const idPrefix = message.id.split(":")[0];
    if (idPrefix && idPrefix !== message.id) return idPrefix;
    return (
      mailboxLoader?.folderTokenForLabel?.(message.mailbox) ??
      mailboxLoader?.folderTokenForLabel?.(message.folder) ??
      message.folder
    );
  };
  const moveMessages = async (
    messages: Mail[],
    mailboxLabel: string,
    opts?: { signal?: AbortSignal },
  ) => {
    const toFolder = resolveFolderToken(mailboxLabel);
    await Promise.all(
      messages.map((message) =>
        moveMailMessageByTokens(
          {
            fromFolder: resolveSourceFolderToken(message),
            toFolder,
            uid: message.uid,
          },
          opts,
        ),
      ),
    );
  };

  return {
    patchMessage: (message, patch, opts) =>
      patchMailMessage({ ...message, folder: resolveMutationFolderToken(message) }, patch, opts),
    moveMessages,
    deleteMessages: (messages, opts) =>
      Promise.all(messages.map((message) => deleteMailMessage(message, opts))).then(() => {}),
    createDraft: (input, opts) => saveMailDraft(input, opts),
    saveDraft: (input, opts) => saveMailDraft(input, opts),
    sendMessage: (input, opts) => sendMailMessage(input, opts),
    fetchMessageDetail: (message) => fetchMailMessageDetail(message),
    downloadAttachment: (message, attachment, opts) =>
      downloadMailAttachment(message, attachment, opts),
  };
}

export function createDefaultMailApiSource(): MailApiSource {
  return createWorkspaceSource<MailApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () => Promise.resolve(createMailAppBootstrap()),
      systemMailboxes: [...WGW_UI_SYSTEM_MAILBOXES] as const,
      createOperations: () => undefined,
    }),
    createLiveSource: () => ({
      loadBootstrap: fetchMailLiveBootstrap,
      systemMailboxes: [...WGW_UI_SYSTEM_MAILBOXES] as const,
      createOperations: (mailboxLoader) => createWgwOperations(mailboxLoader),
    }),
  });
}
