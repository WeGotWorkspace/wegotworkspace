import { describe, expect, it } from "vitest";
import {
  augmentMailboxToId,
  classifyFolderTree,
  coerceFolderNode,
  parseMailFoldersPayload,
  splitFoldersForUi,
  unreadCountByMailboxLabel,
} from "@/lib/api/wgw/mail-folder-utils";
import type { WgwMailFolderNode } from "@/lib/api/wgw/types";

function folder(
  id: string,
  name: string,
  opts?: { system?: string; unreadCount?: number; children?: WgwMailFolderNode[] },
): WgwMailFolderNode {
  return {
    id,
    name,
    system: opts?.system,
    unreadCount: opts?.unreadCount,
    children: opts?.children,
  };
}

describe("coerceFolderNode", () => {
  it("maps legacy unread field to unreadCount", () => {
    const node = coerceFolderNode({ id: "1", name: "Inbox", unread: 3 });
    expect(node.unreadCount).toBe(3);
  });

  it("recursively coerces nested children", () => {
    const node = coerceFolderNode({
      id: "root",
      name: "Root",
      children: [{ id: "child", name: "Work", unread: 1 }],
    });
    expect(node.children?.[0]?.unreadCount).toBe(1);
  });

  it("drops empty children arrays", () => {
    const node = coerceFolderNode({ id: "1", name: "Inbox", children: [] });
    expect(node.children).toBeUndefined();
  });
});

describe("parseMailFoldersPayload", () => {
  it("parses folders array from API payload", () => {
    const roots = parseMailFoldersPayload({
      folders: [{ id: "inbox", name: "Inbox", unreadCount: 2 }],
    });
    expect(roots).toHaveLength(1);
    expect(roots[0]?.unreadCount).toBe(2);
  });

  it("throws when folders array is missing", () => {
    expect(() => parseMailFoldersPayload({})).toThrow("missing required `folders` array");
  });
});

describe("splitFoldersForUi", () => {
  it("returns root names as mailboxes and nested names in moreMailboxes", () => {
    const roots = [
      folder("1", "Inbox", { children: [folder("2", "Work")] }),
      folder("3", "Archive"),
    ];
    expect(splitFoldersForUi(roots)).toEqual({
      mailboxes: ["Inbox", "Archive"],
      moreMailboxes: ["Work"],
    });
  });

  it("defaults to Inbox when folder tree is empty", () => {
    expect(splitFoldersForUi([])).toEqual({ mailboxes: ["Inbox"], moreMailboxes: [] });
  });
});

describe("classifyFolderTree", () => {
  it("maps system folders to slots and collects custom mailboxes", () => {
    const roots = [
      folder("inbox-id", "Inbox", { system: "inbox", unreadCount: 5 }),
      folder("sent-id", "Sent Mail", { system: "sent" }),
      folder("custom-id", "Projects"),
    ];
    const { slotToId, slotToUnreadCount, moreMailboxes } = classifyFolderTree(roots);
    expect(slotToId.Inbox).toBe("inbox-id");
    expect(slotToId.Sent).toBe("sent-id");
    expect(slotToUnreadCount.Inbox).toBe(5);
    expect(moreMailboxes).toEqual(["Projects"]);
  });

  it("recognizes folder names without system hints", () => {
    const roots = [folder("spam-id", "Junk E-mail")];
    expect(classifyFolderTree(roots).slotToId.Spam).toBe("spam-id");
  });
});

describe("unreadCountByMailboxLabel", () => {
  it("aggregates unread counts by display name", () => {
    const roots = [
      folder("1", "Inbox", { unreadCount: 2 }),
      folder("2", "Work", { unreadCount: 1, children: [folder("3", "Work", { unreadCount: 4 })] }),
    ];
    expect(unreadCountByMailboxLabel(roots)).toEqual({ Inbox: 2, Work: 4 });
  });
});

describe("augmentMailboxToId", () => {
  it("adds lowercase slot keys from classified tree", () => {
    const base = { projects: "custom-id" };
    const slotToId = { Inbox: "inbox-id", Sent: "sent-id" };
    expect(augmentMailboxToId(base, slotToId)).toEqual({
      projects: "custom-id",
      inbox: "inbox-id",
      sent: "sent-id",
    });
  });
});
