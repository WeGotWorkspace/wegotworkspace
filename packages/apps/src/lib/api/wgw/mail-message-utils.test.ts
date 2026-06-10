import { describe, expect, it, vi } from "vitest";
import {
  coerceMailListRow,
  mailFromWgwDetail,
  mailFromWgwListItem,
  mailboxNameByFolderToken,
  parseMessagesPayload,
  plainTextFromWgwDetail,
  resolveMailboxLabel,
} from "@/lib/api/wgw/mail-message-utils";
import type { WgwMailFolderNode, WgwMailMessageListItem } from "@/lib/api/wgw/types";

describe("coerceMailListRow", () => {
  it("normalizes uid from wire variants and applies default folder", () => {
    const row = coerceMailListRow({ id: "msg:42", subject: "Hello" }, "folder-inbox");
    expect(row.uid).toBe(42);
    expect(row.folder).toBe("folder-inbox");
    expect(row.messageId).toBe("msg:42");
  });

  it("prefers explicit folder over default", () => {
    const row = coerceMailListRow(
      { id: "1", uid: 1, folder: "folder-sent", subject: "Hi" },
      "folder-inbox",
    );
    expect(row.folder).toBe("folder-sent");
  });
});

describe("parseMessagesPayload", () => {
  it("coerces valid rows and drops invalid ones", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const rows = parseMessagesPayload(
      {
        messages: [
          { id: "msg:1", uid: 1, subject: "Ok" },
          { id: "bad", subject: "Missing uid" },
        ],
      },
      "inbox",
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.uid).toBe(1);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Dropped 1"));
    warn.mockRestore();
  });

  it("throws when messages array is missing", () => {
    expect(() => parseMessagesPayload({}, "inbox")).toThrow("missing required `messages` array");
  });
});

describe("mailboxNameByFolderToken", () => {
  it("flattens folder tree into id → name map", () => {
    const folders: WgwMailFolderNode[] = [
      { id: "a", name: "Inbox", children: [{ id: "b", name: "Work" }] },
    ];
    expect(mailboxNameByFolderToken(folders)).toEqual({ a: "Inbox", b: "Work" });
  });
});

describe("resolveMailboxLabel", () => {
  it("returns display name for known folder tokens", () => {
    expect(resolveMailboxLabel("folder-inbox", { "folder-inbox": "Inbox" })).toBe("Inbox");
    expect(resolveMailboxLabel("unknown", { "folder-inbox": "Inbox" })).toBe("unknown");
  });
});

describe("plainTextFromWgwDetail", () => {
  it("returns body text from detail payload", () => {
    expect(plainTextFromWgwDetail({ body: "Hello world" })).toBe("Hello world");
  });
});

describe("mailFromWgwListItem", () => {
  const folderNames = { "folder-inbox": "Inbox", "folder-sent": "Sent" };

  it("maps inbox rows with sender as list actor", () => {
    const row: WgwMailMessageListItem = {
      id: "msg:1",
      uid: 1,
      folder: "folder-inbox",
      from: { name: "Alice", email: "alice@example.com" },
      subject: "Quarterly update",
      snippet: "Please review the deck.",
      date: "2026-06-10T10:00:00.000Z",
      read: false,
    };
    const mail = mailFromWgwListItem(row, folderNames);
    expect(mail).toMatchObject({
      from: "Alice",
      email: "alice@example.com",
      mailbox: "Inbox",
      unread: true,
      title: "Quarterly update",
      detailLoaded: false,
    });
  });

  it("uses recipient as list actor in sent mailboxes", () => {
    const row: WgwMailMessageListItem = {
      id: "msg:2",
      uid: 2,
      folder: "folder-sent",
      from: { name: "Me", email: "me@example.com" },
      subject: "Fwd",
      snippet: "See below",
      date: "2026-06-10T11:00:00.000Z",
      read: true,
    };
    const mail = mailFromWgwListItem(
      { ...row, to: "Bob <bob@example.com>" } as WgwMailMessageListItem,
      folderNames,
      { mailboxDisplay: "Sent" },
    );
    expect(mail.from).toBe("Bob");
    expect(mail.email).toBe("bob@example.com");
  });
});

describe("mailFromWgwDetail", () => {
  it("replaces list excerpt with detail body paragraphs", () => {
    const listRow: WgwMailMessageListItem = {
      id: "msg:3",
      uid: 3,
      folder: "folder-inbox",
      from: "alice@example.com",
      subject: "Notes",
      snippet: "Short preview",
      date: "2026-06-10T12:00:00.000Z",
    };
    const mail = mailFromWgwDetail(
      { body: "First paragraph.\n\nSecond paragraph with more detail." },
      { "folder-inbox": "Inbox" },
      listRow,
    );
    expect(mail.detailLoaded).toBe(true);
    expect(mail.body).toEqual(["First paragraph.", "Second paragraph with more detail."]);
    expect(mail.wordCount).toBeGreaterThan(0);
  });
});
