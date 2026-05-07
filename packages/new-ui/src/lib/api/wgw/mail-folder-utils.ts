import type { WgwMailFolderNode, WgwMailFoldersResponse } from "@/lib/api/wgw/types";

type WgwFolderWire = WgwMailFolderNode & { unread?: number };

export function coerceFolderNode(row: WgwFolderWire): WgwMailFolderNode {
  const children = row.children?.map((child) => coerceFolderNode(child as WgwFolderWire));
  return {
    ...row,
    unreadCount: row.unreadCount ?? row.unread,
    children: children?.length ? children : undefined,
  };
}

export function parseMailFoldersPayload(json: unknown): WgwMailFolderNode[] {
  const payload = json as WgwMailFoldersResponse;
  if (!Array.isArray(payload.folders)) {
    throw new Error("Mail folders payload is missing required `folders` array");
  }
  return payload.folders.map((folder) => coerceFolderNode(folder as WgwFolderWire));
}

export function splitFoldersForUi(roots: WgwMailFolderNode[]): {
  mailboxes: string[];
  moreMailboxes: string[];
} {
  const mailboxes = roots.map((r) => r.name);
  const moreMailboxes: string[] = [];
  const addDeep = (nodes: WgwMailFolderNode[], depth: number) => {
    for (const n of nodes) {
      if (depth > 0) moreMailboxes.push(n.name);
      if (n.children?.length) addDeep(n.children, depth + 1);
    }
  };
  addDeep(roots, 0);
  return {
    mailboxes: mailboxes.length > 0 ? mailboxes : ["Inbox"],
    moreMailboxes,
  };
}

/** Fixed sidebar row labels under “Mailboxes”; API folders are matched onto these after GET /mail/folders. */
export const WGW_UI_SYSTEM_MAILBOXES = ["Sent", "Drafts", "Spam", "Archive", "Trash"] as const;

export type WgwSystemSlot = "Inbox" | "Starred" | (typeof WGW_UI_SYSTEM_MAILBOXES)[number];

function flattenFolderNodes(roots: WgwMailFolderNode[]): {
  id: string;
  name: string;
  system?: string | null;
  unreadCount?: number;
}[] {
  const out: { id: string; name: string; system?: string | null; unreadCount?: number }[] = [];
  const walk = (nodes: WgwMailFolderNode[]) => {
    for (const n of nodes) {
      out.push({ id: n.id, name: n.name, system: n.system, unreadCount: n.unreadCount });
      if (n.children?.length) walk(n.children);
    }
  };
  walk(roots);
  return out;
}

function normFolderLabel(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function systemSlotForFolderName(name: string, system?: string | null): WgwSystemSlot | null {
  const systemNorm = system?.trim().toLowerCase();
  if (systemNorm) {
    if (systemNorm === "inbox") return "Inbox";
    if (systemNorm === "starred" || systemNorm === "flagged") return "Starred";
    if (systemNorm === "sent") return "Sent";
    if (systemNorm === "drafts" || systemNorm === "draft") return "Drafts";
    if (systemNorm === "spam" || systemNorm === "junk") return "Spam";
    if (systemNorm === "archive" || systemNorm === "all") return "Archive";
    if (systemNorm === "trash" || systemNorm === "bin") return "Trash";
  }

  const n = normFolderLabel(name);
  const tail = (n.split("/").pop() ?? n).trim();

  const is = (candidates: string[]) => candidates.some((c) => tail === c || n === c);

  if (is(["inbox", "in"])) return "Inbox";
  if (is(["starred", "starred mail", "flagged", "star"])) return "Starred";
  if (is(["sent", "sent mail", "sent items"])) return "Sent";
  if (is(["draft", "drafts", "draft items"])) return "Drafts";
  if (is(["spam", "junk", "junk mail", "junk e-mail", "bulk mail"])) return "Spam";
  if (is(["archive", "all mail", "allmail"])) return "Archive";
  if (is(["trash", "bin", "deleted", "deleted items", "deleted messages"])) return "Trash";

  return null;
}

export function classifyFolderTree(roots: WgwMailFolderNode[]): {
  slotToId: Partial<Record<WgwSystemSlot, string>>;
  slotToUnreadCount: Partial<Record<WgwSystemSlot, number>>;
  moreMailboxes: string[];
} {
  const flat = flattenFolderNodes(roots);
  const slotToId: Partial<Record<WgwSystemSlot, string>> = {};
  const slotToUnreadCount: Partial<Record<WgwSystemSlot, number>> = {};
  const claimedIds = new Set<string>();

  for (const { id, name, system, unreadCount } of flat) {
    const slot = systemSlotForFolderName(name, system);
    if (slot) {
      if (!slotToId[slot]) slotToId[slot] = id;
      const resolvedUnread = unreadCount ?? 0;
      const existing = slotToUnreadCount[slot];
      slotToUnreadCount[slot] =
        existing === undefined ? resolvedUnread : Math.max(existing, resolvedUnread);
      claimedIds.add(id);
    }
  }

  const moreMailboxes = flat.filter(({ id }) => !claimedIds.has(id)).map(({ name }) => name);

  const seen = new Set<string>();
  const uniqueMore: string[] = [];
  for (const mb of moreMailboxes) {
    if (seen.has(mb)) continue;
    seen.add(mb);
    uniqueMore.push(mb);
  }

  return { slotToId, slotToUnreadCount, moreMailboxes: uniqueMore };
}

export function unreadCountByMailboxLabel(roots: WgwMailFolderNode[]): Record<string, number> {
  const flat = flattenFolderNodes(roots);
  const out: Record<string, number> = {};
  for (const { name, unreadCount } of flat) {
    if (unreadCount === undefined) continue;
    const prev = out[name];
    out[name] = prev === undefined ? unreadCount : Math.max(prev, unreadCount);
  }
  return out;
}

export function augmentMailboxToId(
  base: Record<string, string>,
  slotToId: Partial<Record<WgwSystemSlot, string>>,
): Record<string, string> {
  const m = { ...base };
  const slots: WgwSystemSlot[] = ["Inbox", "Starred", "Sent", "Drafts", "Spam", "Archive", "Trash"];
  for (const slot of slots) {
    const id = slotToId[slot];
    if (!id) continue;
    m[slot.toLowerCase()] = id;
  }
  return m;
}
