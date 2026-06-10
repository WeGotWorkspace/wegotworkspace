import { describe, expect, it } from "vitest";
import type { Mail } from "@/types/mail";
import { filterVisibleMail, rowMatchesMailboxLabel } from "@/mail-core/src/mail-visible-items";

function mail(overrides: Partial<Mail> & Pick<Mail, "id">): Mail {
  return {
    folder: "INBOX",
    uid: 1,
    from: "Sender",
    email: "sender@example.com",
    notebook: "Inbox",
    category: "Inbox",
    date: "Today",
    title: "Subject",
    excerpt: "Excerpt",
    body: ["Body"],
    tags: [],
    wordCount: 1,
    mailbox: "Inbox",
    unread: false,
    ...overrides,
  };
}

describe("rowMatchesMailboxLabel", () => {
  it("matches by mailbox label case-insensitively", () => {
    const row = mail({ id: "1", mailbox: "inbox" });
    expect(rowMatchesMailboxLabel(row, "Inbox")).toBe(true);
  });

  it("matches by folder token from loader", () => {
    const row = mail({ id: "1", mailbox: "Custom", folder: "custom-token" });
    const loader = {
      folderTokenForLabel: (label: string) => (label === "Custom" ? "custom-token" : undefined),
    };
    expect(rowMatchesMailboxLabel(row, "Custom", loader as never)).toBe(true);
  });
});

describe("filterVisibleMail", () => {
  it("filters by mailbox view and search query in mock mode", () => {
    const rows = [
      mail({ id: "1", mailbox: "Inbox", title: "Alpha", excerpt: "one" }),
      mail({ id: "2", mailbox: "Sent", title: "Beta", excerpt: "two" }),
    ];
    const inbox = filterVisibleMail({ mail: rows, view: "mb:Inbox", searchQuery: "" });
    expect(inbox.map((row) => row.id)).toEqual(["1"]);

    const searched = filterVisibleMail({ mail: rows, view: "mb:Inbox", searchQuery: "alpha" });
    expect(searched.map((row) => row.id)).toEqual(["1"]);
  });

  it("skips client search when mailbox loader handles filtering", () => {
    const rows = [mail({ id: "1", mailbox: "Inbox", title: "Hidden", excerpt: "secret" })];
    const loader = { loadMailbox: async () => ({ rows: [], hasMore: false, nextOffset: 0 }) };
    const visible = filterVisibleMail({
      mail: rows,
      view: "mb:Inbox",
      searchQuery: "missing",
      mailboxLoader: loader as never,
    });
    expect(visible.map((row) => row.id)).toEqual(["1"]);
  });
});
