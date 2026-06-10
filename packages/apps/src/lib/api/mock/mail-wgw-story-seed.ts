import type { MailUIData } from "@/mail-core/src/mail-types";
import { folderTokenFromMailboxLabel } from "@/lib/mail/folder-token";
import { mailFromWgwListItem, mailboxNameByFolderToken } from "@/lib/api/wgw/mail";
import type { WgwMailFolderNode, WgwMailMessageListItem } from "@/lib/api/wgw/types";

/**
 * Minimal folder tree + message rows in the shape the WeGotWorkspace API returns,
 * for Storybook and regression checks against `packages/api/openapi/openapi.json`.
 */
const SAMPLE_FOLDERS: WgwMailFolderNode[] = [
  { id: folderTokenFromMailboxLabel("Inbox"), name: "Inbox" },
  { id: folderTokenFromMailboxLabel("Sent"), name: "Sent" },
  { id: folderTokenFromMailboxLabel("Spam"), name: "Spam" },
  { id: folderTokenFromMailboxLabel("Archive"), name: "Archive" },
  { id: folderTokenFromMailboxLabel("Trash"), name: "Trash" },
  { id: folderTokenFromMailboxLabel("Drafts"), name: "Drafts" },
];

const SAMPLE_MESSAGES: WgwMailMessageListItem[] = [
  {
    folder: folderTokenFromMailboxLabel("Inbox"),
    uid: 9001,
    messageId: "wgw-mail-1",
    from: { name: "WeGotWorkspace", address: "noreply@example.test" },
    subject: "Mail row shaped like GET /mail/messages",
    snippet:
      "This message was built from WgwMailMessageListItem so folder + uid line up with PATCH /mail/message.",
    date: "09:30",
    read: false,
    flagged: true,
  },
  {
    folder: folderTokenFromMailboxLabel("Inbox"),
    uid: 9002,
    messageId: "wgw-mail-2",
    from: "case@example.test",
    subject: "Plain-string From header",
    snippet: "Covers the alternate `from: string` form the backend may emit.",
    date: "Yesterday",
    read: true,
    flagged: false,
  },
];

export function mailSeedDataFromWgwSamples(): MailUIData {
  const folderNames = mailboxNameByFolderToken(SAMPLE_FOLDERS);
  const mail = SAMPLE_MESSAGES.map((row) => mailFromWgwListItem(row, folderNames));
  const unreadByMailbox: Record<string, number> = {};
  for (const row of mail) {
    if (!row.unread) continue;
    unreadByMailbox[row.mailbox] = (unreadByMailbox[row.mailbox] ?? 0) + 1;
  }
  const mailboxLabels = [
    "Inbox",
    "Starred",
    "Sent",
    "Drafts",
    "Spam",
    "Archive",
    "Trash",
    "Notes",
    "Newsletters",
  ];
  return {
    mail,
    mailboxes: mailboxLabels.map((label) => {
      const unreadCount = unreadByMailbox[label];
      return unreadCount === undefined ? { label } : { label, unreadCount };
    }),
  };
}
