import { describe, expect, it } from "vitest";
import {
  buildMailboxToFolderId,
  canonicalImapMailboxLabel,
  folderIdForMailboxLabel,
  folderLabelForMailbox,
  folderTokenCandidatesForMailbox,
} from "@/lib/api/wgw/mail-token-utils";
import type { WgwMailFolderNode } from "@/lib/api/wgw/types";

const roots: WgwMailFolderNode[] = [
  {
    id: "folder-inbox",
    name: "Inbox",
    children: [{ id: "folder-work", name: "Work" }],
  },
  { id: "folder-sent", name: "Sent" },
];

const mailboxToId = buildMailboxToFolderId(roots);
const folderNames = { "folder-inbox": "Inbox", "folder-work": "Work", "folder-sent": "Sent" };

describe("buildMailboxToFolderId", () => {
  it("indexes folder names and ids case-insensitively", () => {
    expect(mailboxToId.inbox).toBe("folder-inbox");
    expect(mailboxToId["folder-work"]).toBe("folder-work");
    expect(mailboxToId.work).toBe("folder-work");
  });
});

describe("folderIdForMailboxLabel", () => {
  it("resolves display labels via folderNames map", () => {
    expect(folderIdForMailboxLabel("folder-inbox", mailboxToId, folderNames)).toBe("folder-inbox");
    expect(folderIdForMailboxLabel("Inbox", mailboxToId, folderNames)).toBe("folder-inbox");
  });

  it("returns undefined for unknown labels", () => {
    expect(folderIdForMailboxLabel("Missing", mailboxToId, folderNames)).toBeUndefined();
  });
});

describe("folderLabelForMailbox", () => {
  it("returns canonical folder display name when id resolves", () => {
    expect(folderLabelForMailbox("Inbox", mailboxToId, folderNames)).toBe("Inbox");
  });

  it("falls back to the input label when unmapped", () => {
    expect(folderLabelForMailbox("Unknown", mailboxToId, folderNames)).toBe("Unknown");
  });
});

describe("canonicalImapMailboxLabel", () => {
  it("uppercases inbox token for IMAP", () => {
    expect(canonicalImapMailboxLabel("inbox")).toBe("INBOX");
    expect(canonicalImapMailboxLabel("Inbox")).toBe("INBOX");
    expect(canonicalImapMailboxLabel("Sent")).toBe("Sent");
  });
});

describe("folderTokenCandidatesForMailbox", () => {
  it("returns folder id and encoded IMAP labels without duplicates", () => {
    const encode = (label: string) => `enc:${label}`;
    const tokens = folderTokenCandidatesForMailbox("Inbox", mailboxToId, folderNames, encode);
    expect(tokens).toEqual(["folder-inbox", "enc:INBOX"]);
  });
});
