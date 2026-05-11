import { resolveMailboxLabel } from "@/lib/api/wgw/mail-message-utils";
import type { WgwMailFolderNode } from "@/lib/api/wgw/types";

/** Map sidebar labels / tokens → folder id for `?folder=`. */
export function buildMailboxToFolderId(roots: WgwMailFolderNode[]): Record<string, string> {
  const m: Record<string, string> = {};
  const walk = (nodes: WgwMailFolderNode[]) => {
    for (const n of nodes) {
      m[n.name.toLowerCase()] = n.id;
      m[n.id.toLowerCase()] = n.id;
      if (n.children?.length) walk(n.children);
    }
  };
  walk(roots);
  return m;
}

export function folderIdForMailboxLabel(
  label: string,
  mailboxToId: Record<string, string>,
  folderNames: Record<string, string>,
): string | undefined {
  const resolved = resolveMailboxLabel(label, folderNames);
  return (
    mailboxToId[label.toLowerCase()] ??
    mailboxToId[resolved.toLowerCase()] ??
    mailboxToId[label.toLowerCase().replace(/\s+/g, " ")]
  );
}

export function folderLabelForMailbox(
  mailboxLabel: string,
  mailboxToId: Record<string, string>,
  folderNames: Record<string, string>,
): string {
  const folderId = folderIdForMailboxLabel(mailboxLabel, mailboxToId, folderNames);
  if (!folderId) return mailboxLabel;
  return folderNames[folderId] ?? mailboxLabel;
}

export function canonicalImapMailboxLabel(label: string): string {
  return /^inbox$/i.test(label) ? "INBOX" : label;
}

export function folderTokenCandidatesForMailbox(
  mailboxLabel: string,
  mailboxToId: Record<string, string>,
  folderNames: Record<string, string>,
  encodeMailboxLabel: (label: string) => string,
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (token: string | undefined) => {
    if (!token) return;
    if (seen.has(token)) return;
    seen.add(token);
    out.push(token);
  };

  const folderId = folderIdForMailboxLabel(mailboxLabel, mailboxToId, folderNames);
  push(folderId);

  const folderLabel = folderLabelForMailbox(mailboxLabel, mailboxToId, folderNames);
  push(encodeMailboxLabel(canonicalImapMailboxLabel(folderLabel)));
  push(encodeMailboxLabel(canonicalImapMailboxLabel(mailboxLabel)));

  return out;
}
