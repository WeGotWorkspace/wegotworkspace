import type { Mail } from "@/types/mail";
import type { MailMailboxLoader } from "@/mail-core/src/mail-types";
import { compareMailDesc } from "@/mail-core/src/mail-date-utils";

export function rowMatchesMailboxLabel(
  message: Mail,
  sidebarLabel: string,
  mailboxLoader?: MailMailboxLoader,
): boolean {
  if (
    message.mailbox === sidebarLabel ||
    message.mailbox.toLowerCase() === sidebarLabel.toLowerCase()
  ) {
    return true;
  }
  const token = mailboxLoader?.folderTokenForLabel?.(sidebarLabel);
  return token != null && message.folder === token;
}

export function filterVisibleMail(args: {
  mail: Mail[];
  view: string;
  searchQuery: string;
  mailboxLoader?: MailMailboxLoader;
}): Mail[] {
  const { mail, view, searchQuery, mailboxLoader } = args;
  const q = searchQuery.trim().toLowerCase();
  const filtered = mail.filter((message) => {
    let inView = true;
    if (view.startsWith("mb:")) {
      const want = view.slice(3);
      inView = rowMatchesMailboxLabel(message, want, mailboxLoader);
    }
    if (!inView) return false;
    if (mailboxLoader) return true;
    if (!q) return true;
    const hay =
      `${message.from} ${message.title} ${message.excerpt} ${message.body.join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
  return filtered.sort(compareMailDesc);
}
