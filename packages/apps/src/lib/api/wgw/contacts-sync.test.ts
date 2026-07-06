import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AddressBook } from "@/contacts-core/src/contacts-types";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import {
  readAddressBooksSyncToken,
  readCachedAddressBooks,
  readSyncToken,
  upsertAddressBookInCache,
  writeAddressBooksSyncToken,
  writeContactsBootstrapToCache,
  writeSyncToken,
} from "@/lib/offline/contacts-offline-store";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/core/offline-db";
import { contactsBooksTable } from "@/lib/offline/contacts/contacts-schema";

const username = "alice";

const defaultBook: AddressBook = {
  id: "default",
  name: "Default",
  sortOrder: 0,
  isDefault: true,
  isSubscribed: true,
  myRights: { mayRead: true, mayWrite: true, mayShare: false, mayDelete: true },
};

const extraBook: AddressBook = {
  ...defaultBook,
  id: "extra-book",
  name: "Extra",
  isDefault: false,
};

const newBook: AddressBook = {
  ...defaultBook,
  id: "new-book",
  name: "New book",
  isDefault: false,
};

const { wgwFetch, wgwReadJson } = vi.hoisted(() => ({
  wgwFetch: vi.fn(),
  wgwReadJson: vi.fn(),
}));

const { getAddressBook, listAddressBooks } = vi.hoisted(() => ({
  getAddressBook: vi.fn(),
  listAddressBooks: vi.fn(),
}));

vi.mock("@/lib/api/wgw/http", () => ({
  wgwFetch,
  wgwReadJson,
}));

vi.mock("@/lib/api/wgw/contacts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/wgw/contacts")>();
  return {
    ...actual,
    getAddressBook,
    listAddressBooks,
    getCard: vi.fn(),
  };
});

import { pullAddressBookChanges } from "@/lib/api/wgw/contacts-sync";

type JmapChangesResponse = {
  oldState: string;
  newState: string;
  created: string[];
  updated: string[];
  destroyed: string[];
};

function mockOkJson(payload: unknown): void {
  wgwFetch.mockResolvedValueOnce({ ok: true, status: 200 });
  wgwReadJson.mockResolvedValueOnce(payload);
}

function mockEmptyCardChanges(): void {
  mockOkJson({
    oldState: "0",
    newState: "1",
    created: [],
    updated: [],
    destroyed: [],
  });
}

describe("pullAddressBookChanges", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await contactsBooksTable(db).clear();
    await db.meta.clear();
    await writeContactsBootstrapToCache(username, {
      session: { ...mockWorkspaceSession, user: { ...mockWorkspaceSession.user, username } },
      data: { addressBooks: [defaultBook], cards: [] },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("advances the address books sync token after a successful changes response", async () => {
    mockOkJson({
      oldState: "0",
      newState: "1:default:3",
      created: [],
      updated: [],
      destroyed: [],
    } satisfies JmapChangesResponse);

    await pullAddressBookChanges(username);

    expect(await readAddressBooksSyncToken(username)).toBe("1:default:3");
    expect(wgwFetch).toHaveBeenCalledWith(
      "/contacts/addressbooks/changes?since=0",
      expect.objectContaining({ signal: undefined }),
    );
  });

  it("persists the token on empty changes without mutating cached books", async () => {
    await writeAddressBooksSyncToken(username, "1:default:2");
    mockOkJson({
      oldState: "1:default:2",
      newState: "1:default:3",
      created: [],
      updated: [],
      destroyed: [],
    } satisfies JmapChangesResponse);

    await pullAddressBookChanges(username);

    expect(await readAddressBooksSyncToken(username)).toBe("1:default:3");
    const books = await readCachedAddressBooks(username);
    expect(books).toHaveLength(1);
    expect(books[0]?.id).toBe("default");
  });

  it("upserts created books and removes destroyed books from cache", async () => {
    await upsertAddressBookInCache(username, extraBook);
    await writeSyncToken(username, "extra-book", "5");
    await writeAddressBooksSyncToken(username, "2:default:1,extra-book:1");

    mockOkJson({
      oldState: "2:default:1,extra-book:1",
      newState: "3:default:1,new-book:1",
      created: ["new-book"],
      updated: [],
      destroyed: ["extra-book"],
    } satisfies JmapChangesResponse);

    getAddressBook.mockResolvedValueOnce(newBook);
    mockEmptyCardChanges();

    await pullAddressBookChanges(username);

    const books = await readCachedAddressBooks(username);
    expect(books.map((book) => book.id).sort()).toEqual(["default", "new-book"]);
    expect(getAddressBook).toHaveBeenCalledWith("new-book", undefined);
    expect(await readSyncToken(username, "extra-book")).toBeNull();
    expect(await readAddressBooksSyncToken(username)).toBe("3:default:1,new-book:1");
  });
});
