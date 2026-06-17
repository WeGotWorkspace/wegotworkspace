import "fake-indexeddb/auto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import {
  listOutboxMutations,
  readContactsBootstrapFromCache,
  writeContactsBootstrapToCache,
} from "@/lib/offline/contacts-offline-store";
import { offlineAccountKeyFromUsername, offlineDbForAccount } from "@/lib/offline/offline-db";
import { createHybridContactsOperations } from "@/lib/offline/contacts-hybrid-operations";

const username = "alice";

const card = {
  id: "jane-doe",
  "@type": "Card",
  version: "1.0",
  uid: "urn:uuid:jane",
  addressBookIds: { default: true },
  name: { "@type": "Name", isOrdered: false, full: "Jane Doe" },
  state: "state-1",
} as unknown as ContactCard;

const bootstrap = {
  session: { ...mockWorkspaceSession, user: { ...mockWorkspaceSession.user, username } },
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
    cards: [card],
  },
};

vi.mock("@/lib/api/wgw/contacts-mutations", () => ({
  patchCardWithState: vi.fn(),
  createCardWithState: vi.fn(),
  deleteCardWithState: vi.fn(),
}));

vi.mock("@/lib/offline/browser-online", () => ({
  readBrowserOnline: vi.fn(() => true),
  isFetchNetworkError: vi.fn((error: unknown) => {
    if (error instanceof TypeError) {
      return error.message.toLowerCase().includes("network");
    }
    return false;
  }),
  subscribeBrowserOnline: vi.fn(() => () => undefined),
}));

vi.mock("@/lib/api/wgw/contacts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api/wgw/contacts")>();
  return {
    ...actual,
    getCard: vi.fn(),
    listAddressBooks: vi.fn(),
    listCards: vi.fn(),
  };
});

import { patchCardWithState } from "@/lib/api/wgw/contacts-mutations";
import { readBrowserOnline } from "@/lib/offline/browser-online";

describe("createHybridContactsOperations", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(readBrowserOnline).mockReturnValue(true);
    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    await db.outbox.clear();
    await db.contacts_cards.clear();
    await db.contacts_address_books.clear();
    await db.meta.clear();
    await writeContactsBootstrapToCache(username, bootstrap);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("queues patch offline and updates IndexedDB when navigator.onLine is false", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(false);

    const operations = createHybridContactsOperations(username);
    const saved = await operations.patchCard("jane-doe", {
      name: { "@type": "Name", isOrdered: false, full: "Jane Updated" },
    });

    expect(saved.name?.full).toBe("Jane Updated");
    expect(patchCardWithState).not.toHaveBeenCalled();

    const cached = await readContactsBootstrapFromCache(username);
    expect(cached?.data.cards[0]?.name?.full).toBe("Jane Updated");

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("update");
    expect(outbox[0]?.ifInState).toBe("state-1");
  });

  it("queues patch when live API fails with a network error", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(true);
    vi.mocked(patchCardWithState).mockRejectedValue(new TypeError("network request failed"));

    const operations = createHybridContactsOperations(username);
    const saved = await operations.patchCard("jane-doe", {
      name: { "@type": "Name", isOrdered: false, full: "Jane Queued" },
    });

    expect(saved.name?.full).toBe("Jane Queued");
    expect(patchCardWithState).toHaveBeenCalledOnce();

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
    expect(outbox[0]?.op).toBe("update");
  });

  it("sets pendingSync on contacts_cards row after offline patch", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(false);

    const operations = createHybridContactsOperations(username);
    await operations.patchCard("jane-doe", {
      name: { "@type": "Name", isOrdered: false, full: "Jane Pending" },
    });

    const db = offlineDbForAccount(offlineAccountKeyFromUsername(username));
    const row = await db.contacts_cards.get("jane-doe");
    expect(row?.pendingSync).toBe(true);
    expect(JSON.parse(row?.data ?? "{}").name?.full).toBe("Jane Pending");
  });

  it("preserves pendingSync cards when bootstrap cache is rewritten", async () => {
    vi.mocked(readBrowserOnline).mockReturnValue(false);

    const operations = createHybridContactsOperations(username);
    await operations.patchCard("jane-doe", {
      name: { "@type": "Name", isOrdered: false, full: "Jane Local" },
    });

    await writeContactsBootstrapToCache(username, {
      ...bootstrap,
      data: {
        ...bootstrap.data,
        cards: [
          {
            ...card,
            name: { "@type": "Name", isOrdered: false, full: "Jane Server" },
          },
        ],
      },
    });

    const cached = await readContactsBootstrapFromCache(username);
    expect(cached?.data.cards[0]?.name?.full).toBe("Jane Local");

    const outbox = await listOutboxMutations(username);
    expect(outbox).toHaveLength(1);
  });
});
