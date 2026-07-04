import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import {
  enqueueCoalescedContactUpdate,
  writeContactsBootstrapToCache,
} from "@/lib/offline/contacts-offline-store";
import { flushContactsOutbox } from "@/lib/offline/contacts-outbox-flush";

const username = "bob";

const bootstrap = {
  session: mockWorkspaceSession,
  data: {
    addressBooks: [
      {
        id: "default",
        name: "Default",
        sortOrder: 0,
        isDefault: true,
        isSubscribed: true,
        myRights: { mayRead: true, mayWrite: true, mayShare: false, mayDelete: true },
      },
    ],
    cards: [
      {
        id: "jane-doe",
        "@type": "Card",
        version: "1.0",
        uid: "urn:uuid:jane",
        addressBookIds: { default: true },
        name: { "@type": "Name", isOrdered: false, full: "Jane Doe" },
        state: "state-1",
      } as unknown as ContactCard,
    ],
  },
} satisfies ContactsAppBootstrap;

const { contactCardSet, getCard, pullAddressBookChanges, syncAllContactBooks } = vi.hoisted(() => ({
  contactCardSet: vi.fn(),
  getCard: vi.fn(),
  pullAddressBookChanges: vi.fn(),
  syncAllContactBooks: vi.fn(),
}));

vi.mock("@/lib/api/wgw/contacts-set", () => ({
  contactCardSet,
  ContactStateMismatchError: class ContactStateMismatchError extends Error {
    cardId: string;
    constructor(cardId: string) {
      super("state mismatch");
      this.cardId = cardId;
    }
  },
}));

vi.mock("@/lib/api/wgw/contacts", () => ({
  getCard,
  listAddressBooks: vi.fn().mockResolvedValue([
    {
      id: "default",
      name: "Default",
      sortOrder: 0,
      isDefault: true,
      isSubscribed: true,
      myRights: { mayRead: true, mayWrite: true, mayShare: false, mayDelete: true },
    },
  ]),
}));

vi.mock("@/lib/api/wgw/contacts-sync", () => ({
  pullAddressBookChanges,
  syncAllContactBooks,
}));

describe("flushContactsOutbox", () => {
  beforeEach(async () => {
    contactCardSet.mockReset();
    getCard.mockReset();
    pullAddressBookChanges.mockReset();
    pullAddressBookChanges.mockResolvedValue(undefined);
    syncAllContactBooks.mockReset();
    syncAllContactBooks.mockResolvedValue(undefined);
    await writeContactsBootstrapToCache(username, bootstrap);
  });

  it("flushes a coalesced offline update once with the original ifInState", async () => {
    await enqueueCoalescedContactUpdate(
      username,
      "jane-doe",
      { name: { "@type": "Name", isOrdered: false, full: "Jane A" } },
      "state-1",
    );
    await enqueueCoalescedContactUpdate(
      username,
      "jane-doe",
      { name: { "@type": "Name", isOrdered: false, full: "Jane B" } },
      "state-1",
    );

    contactCardSet.mockResolvedValue({
      created: {},
      updated: { "jane-doe": null },
      destroyed: {},
      notCreated: {},
      notUpdated: {},
      notDestroyed: {},
    });
    getCard.mockResolvedValue({
      ...bootstrap.data.cards[0],
      name: { "@type": "Name", isOrdered: false, full: "Jane B" },
      state: "state-2",
    });

    const result = await flushContactsOutbox(username);

    expect(result.stateMismatches).toEqual([]);
    expect(contactCardSet).toHaveBeenCalledTimes(1);
    expect(contactCardSet.mock.calls[0]?.[0]).toEqual({
      update: {
        "jane-doe": {
          name: { "@type": "Name", isOrdered: false, full: "Jane B" },
          ifInState: "state-1",
        },
      },
    });
  });

  it("returns stateMismatches when the server rejects stale ifInState", async () => {
    await enqueueCoalescedContactUpdate(
      username,
      "jane-doe",
      { name: { "@type": "Name", isOrdered: false, full: "Jane B" } },
      "state-1",
    );

    contactCardSet.mockResolvedValue({
      created: {},
      updated: {},
      destroyed: {},
      notCreated: {},
      notUpdated: {
        "jane-doe": { type: "stateMismatch", description: "stale" },
      },
      notDestroyed: {},
    });

    const result = await flushContactsOutbox(username);

    expect(result.stateMismatches).toEqual(["jane-doe"]);
    expect(getCard).not.toHaveBeenCalled();
  });
});
